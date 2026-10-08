/**
 * Broadcast-grade PCM WAV Encoder and Audio Exporter running 100% locally in browser.
 */

export function createWavBlobFromAudioBuffer(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let interleaved: Float32Array;
  if (numChannels === 2) {
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);
    interleaved = new Float32Array(left.length + right.length);
    let index = 0;
    for (let i = 0; i < left.length; i++) {
      interleaved[index++] = left[i];
      interleaved[index++] = right[i];
    }
  } else {
    interleaved = audioBuffer.getChannelData(0);
  }

  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = interleaved.length * (bitDepth / 8);
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Write WAV Header
  // "RIFF" chunk
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < interleaved.length; i++) {
    // Clamp to [-1, 1]
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    // Convert to 16-bit signed integer
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Creates a synthetic speech demonstration WAV audio blob locally with tone and pitch modulations
 */
export async function generateSyntheticToneWav(
  durationSeconds: number = 3,
  pitchFreq: number = 220
): Promise<Blob> {
  const sampleRate = 44100;
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate
  });
  const audioBuffer = audioContext.createBuffer(1, totalSamples, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  // Synthesize smooth broadcast voice tone with harmonics
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Envelope attack and decay
    const envelope = Math.sin((t / durationSeconds) * Math.PI);
    // Fundamental + 2nd & 3rd harmonic
    const sample =
      Math.sin(2 * Math.PI * pitchFreq * t) * 0.6 +
      Math.sin(2 * Math.PI * (pitchFreq * 2) * t) * 0.25 +
      Math.sin(2 * Math.PI * (pitchFreq * 3) * t) * 0.15;
    channelData[i] = sample * envelope * 0.4;
  }

  return createWavBlobFromAudioBuffer(audioBuffer);
}

/**
 * Converts an MP3 Blob to a broadcast 16-bit PCM WAV blob locally using Web Audio API
 */
export async function convertMp3BlobToWav(mp3Blob: Blob): Promise<Blob> {
  const arrayBuffer = await mp3Blob.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  return createWavBlobFromAudioBuffer(audioBuffer);
}

/**
 * Download file helper with custom name
 */
export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

