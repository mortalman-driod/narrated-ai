import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import OpenAI from 'openai';
import axios from 'axios';
import dotenv from 'dotenv';
import { Scene, SubtitleWord } from '../types';

dotenv.config();

/**
 * Gets exact duration in seconds of an audio file using ffprobe
 */
export function getAudioDurationWithFFprobe(audioFilePath: string): number {
  try {
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFilePath}"`;
    const output = execSync(cmd, { encoding: 'utf8' }).trim();
    const duration = parseFloat(output);
    if (!isNaN(duration) && duration > 0) {
      return duration;
    }
  } catch (err: any) {
    console.warn(`[TTS] ffprobe warning for ${audioFilePath}: ${err.message}`);
  }
  // Fallback: estimate from file size (assuming ~128kbps mp3: ~16000 bytes/sec)
  const stats = fs.statSync(audioFilePath);
  return Math.max(2.0, stats.size / 16000);
}

/**
 * Generates subtitle word timings synchronized across the scene's duration
 */
export function generateSynchronizedSubtitles(
  text: string,
  durationInFrames: number
): SubtitleWord[] {
  const words = text.split(/\s+/).filter(w => w.trim().length > 0);
  if (words.length === 0) return [];

  // Weighted by character count (longer words get more time)
  const weights = words.map(w => Math.max(2, w.length));
  const totalWeight = weights.reduce((acc, cur) => acc + cur, 0);

  let currentFrame = 0;
  const subtitles: SubtitleWord[] = [];

  for (let i = 0; i < words.length; i++) {
    const wordDuration = Math.round((weights[i] / totalWeight) * durationInFrames);
    const endFrame = i === words.length - 1 ? durationInFrames : Math.min(durationInFrames, currentFrame + wordDuration);
    subtitles.push({
      text: words[i],
      start_frame: currentFrame,
      end_frame: endFrame
    });
    currentFrame = endFrame;
  }

  return subtitles;
}

/**
 * Synthesizes mock audio using ffmpeg or silent mp3 buffer
 */
export function synthesizeMockAudio(text: string, outputPath: string, fps: number = 30): { durationSeconds: number; durationFrames: number } {
  // Approximate reading speed: ~2.5 words per second
  const wordCount = text.split(/\s+/).length;
  const estimatedSeconds = Math.max(3.0, parseFloat((wordCount / 2.4).toFixed(2)));

  try {
    const cmd = `ffmpeg -y -f lavfi -i "sine=frequency=340:duration=${estimatedSeconds}" -af "volume=0.25,afade=t=out:st=${estimatedSeconds - 0.5}:d=0.5" -q:a 9 -acodec libmp3lame "${outputPath}"`;
    execSync(cmd, { stdio: 'ignore' });
  } catch {
    fs.writeFileSync(outputPath, Buffer.alloc(1024));
  }

  const durationSeconds = getAudioDurationWithFFprobe(outputPath) || estimatedSeconds;
  const durationFrames = Math.round(durationSeconds * fps);

  return { durationSeconds, durationFrames };
}

/**
 * Synthesizes speech using ElevenLabs API if key is available
 */
async function synthesizeElevenLabs(
  text: string,
  outputPath: string,
  apiKey: string,
  voiceId?: string
): Promise<boolean> {
  const selectedVoice = voiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
  console.log(`[TTS] Synthesizing via ElevenLabs (Voice: ${selectedVoice})...`);

  const response = await axios({
    method: 'POST',
    url: `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`,
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg'
    },
    data: {
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    },
    responseType: 'arraybuffer'
  });

  fs.writeFileSync(outputPath, Buffer.from(response.data));
  return true;
}

/**
 * Synthesizes speech using OpenAI TTS API (tts-1)
 */
async function synthesizeOpenAI(
  text: string,
  outputPath: string,
  apiKey: string,
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
): Promise<boolean> {
  const selectedVoice = (voice || process.env.OPENAI_TTS_VOICE || 'onyx') as any;
  console.log(`[TTS] Synthesizing via OpenAI TTS (Voice: ${selectedVoice})...`);

  const openai = new OpenAI({ apiKey });
  const mp3 = await openai.audio.speech.create({
    model: 'tts-1',
    voice: selectedVoice,
    input: text
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
  return true;
}

/**
 * Audio Synthesis Worker: processes all scenes, saves /temp/audio/scene_{id}.mp3,
 * and measures exact duration in seconds and frames.
 */
export async function synthesizeAudioForScenes(
  scenes: Scene[],
  outputDir: string,
  fps: number = 30,
  mock: boolean = false
): Promise<Scene[]> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

  const enrichedScenes: Scene[] = [];

  for (const scene of scenes) {
    const audioFileName = `scene_${scene.scene_id}.mp3`;
    const audioFilePath = path.join(outputDir, audioFileName);

    console.log(`[TTS] Processing Scene ${scene.scene_id}: "${scene.voiceover_text.slice(0, 45)}..."`);

    let synthesized = false;

    if (!mock) {
      if (elevenLabsKey && !elevenLabsKey.includes('your_elevenlabs_api_key')) {
        try {
          synthesized = await synthesizeElevenLabs(scene.voiceover_text, audioFilePath, elevenLabsKey);
        } catch (err: any) {
          console.warn(`[TTS] ElevenLabs synthesis failed: ${err.message}. Trying OpenAI TTS fallback.`);
        }
      }

      if (!synthesized && openAiKey && !openAiKey.includes('your_openai_api_key')) {
        try {
          synthesized = await synthesizeOpenAI(scene.voiceover_text, audioFilePath, openAiKey);
        } catch (err: any) {
          console.warn(`[TTS] OpenAI TTS failed: ${err.message}. Falling back to mock audio.`);
        }
      }
    }

    if (!synthesized) {
      console.log(`[TTS] Using mock audio generator for Scene ${scene.scene_id}`);
      synthesizeMockAudio(scene.voiceover_text, audioFilePath, fps);
    }

    const durationSeconds = getAudioDurationWithFFprobe(audioFilePath);
    const durationFrames = Math.max(30, Math.round(durationSeconds * fps));
    const subtitles = generateSynchronizedSubtitles(scene.voiceover_text, durationFrames);

    enrichedScenes.push({
      ...scene,
      audio_file: audioFilePath,
      duration_in_seconds: durationSeconds,
      duration_in_frames: durationFrames,
      subtitles
    });

    console.log(`[TTS] Scene ${scene.scene_id} synthesized -> ${durationSeconds.toFixed(2)}s (${durationFrames} frames)`);
  }

  return enrichedScenes;
}
