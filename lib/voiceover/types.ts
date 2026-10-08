export type VoiceCategory = 'nigerian-female' | 'nigerian-male' | 'foreign-male' | 'foreign-female';

export interface VoiceProfile {
  id: string;
  name: string;
  category: VoiceCategory;
  categoryLabel: string;
  tone: string;
  ageColor: 'Young' | 'Mature' | 'Deep';
  accent: string;
  sampleAudioText: string;
  nigerianSampleText?: string;
  recommendedNiches: string[];
  pitch: number;
  rate: number;
  voiceGender: 'male' | 'female';
  lang: string;
  neuralVoiceId?: string;
  neuralPitch?: string;
  neuralRate?: string;
}

export interface PronunciationRule {
  id: string;
  word: string;
  replacement: string;
  phoneticDescription: string;
  category: 'name' | 'place' | 'slang' | 'custom';
}

export interface AudioChunk {
  chunkIndex: number;
  text: string;
  wordCount: number;
  estimatedSeconds: number;
  status: 'pending' | 'synthesizing' | 'completed' | 'failed';
  audioBlob?: Blob;
  audioUrl?: string;
}

export interface RenderJob {
  id: string;
  projectName: string;
  voiceId: string;
  voiceName: string;
  totalWords: number;
  estimatedDurationSeconds: number;
  chunks: AudioChunk[];
  progressPercent: number;
  etaSeconds: number;
  status: 'idle' | 'rendering' | 'completed' | 'paused' | 'failed';
  masterWavUrl?: string;
  masterMp3Url?: string;
}
