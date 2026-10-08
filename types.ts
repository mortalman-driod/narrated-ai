export interface SubtitleWord {
  text: string;
  start_frame: number;
  end_frame: number;
}

export interface Scene {
  scene_id: number;
  voiceover_text: string;
  visual_prompt: string;
  camera_motion: 'slow pan right' | 'slow pan left' | 'zoom in' | 'zoom out' | 'tilt up' | 'tilt down' | string;
  audio_file?: string;
  image_file?: string;
  duration_in_seconds?: number;
  duration_in_frames?: number;
  subtitles?: SubtitleWord[];
}

export interface Storyboard {
  title: string;
  topic: string;
  scenes: Scene[];
  fps: number;
  width: number;
  height: number;
  total_duration_in_frames?: number;
}

export interface PipelineInput {
  topic: string;
  audience?: string;
  duration?: string;
  tone?: string;
  mock?: boolean;
  generateImages?: boolean;
}
