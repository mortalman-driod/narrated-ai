import { NextRequest, NextResponse } from 'next/server';
import { LAUNCH_VOICES } from '@/lib/voiceover/voices';
import { VoiceProfile } from '@/lib/voiceover/types';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import * as googleTTS from 'google-tts-api';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

function splitTextIntoSegments(text: string, maxChars: number = 450): string[] {
  const clean = text.trim();
  if (clean.length <= maxChars) return [clean];

  // Match sentences ending in punctuation or trailing text
  const sentences = clean.match(/[^.!?\n]+[.!?\n]+|\s*[^.!?\n]+$/g) || [clean];
  const segments: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > maxChars && current.length > 0) {
      segments.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }

  if (current.trim().length > 0) {
    segments.push(current.trim());
  }

  return segments.length > 0 ? segments : [clean];
}

async function synthesizeSingleSegment(segmentText: string, voice: VoiceProfile): Promise<Buffer> {
  const neuralVoiceId = voice.neuralVoiceId || (voice.voiceGender === 'male' ? 'en-NG-AbeoNeural' : 'en-NG-EzinneNeural');

  // 1. Primary Engine: Edge Neural Voice
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(
      neuralVoiceId,
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
    );

    const streamPromise = new Promise<Buffer>((resolve, reject) => {
      try {
        const { audioStream } = tts.toStream(segmentText, {
          pitch: voice.neuralPitch || '+0Hz',
          rate: voice.neuralRate || '+0%'
        });

        const chunks: Buffer[] = [];
        audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
        audioStream.on('end', () => resolve(Buffer.concat(chunks)));
        audioStream.on('error', (err: any) => {
          // If audio chunks were already received before stream closed, treat as success!
          if (chunks.length > 0) {
            resolve(Buffer.concat(chunks));
          } else {
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });

    // 20-second safety timeout per chunk
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Edge TTS timed out after 20s')), 20000)
    );

    const audioBuffer = await Promise.race([streamPromise, timeoutPromise]);
    if (audioBuffer && audioBuffer.length > 0) {
      return audioBuffer;
    }
  } catch (edgeErr: any) {
    console.warn(`[API /api/tts] Edge Neural TTS failed (${edgeErr.message}). Switching to Google TTS fallback...`);
  }

  // 2. Secondary Engine: Google TTS fallback (using getAllAudioBase64 for full safety across any length)
  try {
    const langCode = (voice.lang && voice.lang.startsWith('en')) ? 'en' : (voice.lang?.split('-')[0] || 'en');
    const audioParts = await googleTTS.getAllAudioBase64(segmentText, {
      lang: langCode,
      slow: false,
      timeout: 15000
    });

    const buffers = audioParts.map((part) => Buffer.from(part.base64, 'base64'));
    const combinedBuffer = Buffer.concat(buffers);
    console.log(`[API /api/tts] Google TTS fallback success: ${combinedBuffer.length} bytes generated across ${audioParts.length} sub-parts.`);
    return combinedBuffer;
  } catch (googleErr: any) {
    console.error(`[API /api/tts] Google TTS fallback also failed: ${googleErr.message}`);
    throw new Error(`TTS synthesis failed on both Edge and Google engines: ${googleErr.message}`);
  }
}

async function synthesizeAudio(text: string, voiceId: string): Promise<Buffer> {
  const voice = LAUNCH_VOICES.find((v) => v.id === voiceId) || LAUNCH_VOICES[0];
  const segments = splitTextIntoSegments(text, 450);

  console.log(`[API /api/tts] Synthesizing speech with voice "${voice.name}" (${voice.voiceGender}) for ${text.length} chars in ${segments.length} segment(s)...`);

  const segmentBuffers: Buffer[] = [];
  for (let i = 0; i < segments.length; i++) {
    const buf = await synthesizeSingleSegment(segments[i], voice);
    segmentBuffers.push(buf);
  }

  const finalBuffer = Buffer.concat(segmentBuffers);
  console.log(`[API /api/tts] Complete audio assembled: ${finalBuffer.length} bytes.`);
  return finalBuffer;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const text = (body.text || '').trim();
    const voiceId = body.voiceId || 'adaeze';

    if (!text) {
      return NextResponse.json({ error: 'Text is required for TTS synthesis' }, { status: 400 });
    }

    const audioBuffer = await synthesizeAudio(text, voiceId);

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (err: any) {
    console.error('[API /api/tts POST Error]:', err);
    return NextResponse.json({ error: err.message || 'TTS synthesis failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = (searchParams.get('text') || '').trim();
    const voiceId = searchParams.get('voiceId') || 'adaeze';

    if (!text) {
      return NextResponse.json({ error: 'Query parameter "text" is required' }, { status: 400 });
    }

    const audioBuffer = await synthesizeAudio(text, voiceId);

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (err: any) {
    console.error('[API /api/tts GET Error]:', err);
    return NextResponse.json({ error: err.message || 'TTS synthesis failed' }, { status: 500 });
  }
}
