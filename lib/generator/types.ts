export interface GenerationRequest {
  topic: string;
  target_duration_seconds: number;
  niche: string;
  tone: string;
  image_model: 'flux' | 'midjourney' | 'runway';
  custom_pacing?: number;
  script?: string;
  is_script_input?: boolean;
}

export interface Scene {
  scene_number: number;
  act_number?: number;
  chapter_title?: string;
  timestamp_start: string;
  timestamp_end: string;
  duration_seconds: number;
  narration_script: string;
  visual_prompt: string;
  camera_direction: string;
}

export interface ChapterPlan {
  chapter_number: number;
  chapter_title: string;
  target_duration_seconds: number;
  narrative_goal: string;
  key_visual_anchor: string;
}

export interface ActPlan {
  act_number: number;
  act_title: string;
  target_duration_seconds: number;
  chapters: ChapterPlan[];
}

export interface MasterOutline {
  title: string;
  premise: string;
  total_target_seconds: number;
  character_model?: CharacterModel;
  acts: ActPlan[];
}

export interface CharacterModel {
  character_name: string;
  role_in_story: string;
  appearance_summary: string;
  face_and_hair: string;
  attire_and_gear: string;
  color_palette: string;
  consistency_prompt_tag: string;
}

export interface StoryboardResponse {
  title: string;
  total_duration: string;
  total_scenes: number;
  pacing_wpm: number;
  niche: string;
  tone: string;
  image_model: string;
  full_script: string;
  character_model?: CharacterModel;
  scenes: Scene[];
  outline?: MasterOutline;
  fallback_used?: boolean;
  fallback_reason?: string;
  engine_used?: 'cloud' | 'offline';
}

export interface ProgressUpdate {
  stage: 'outline' | 'chapters' | 'refining' | 'complete' | 'error';
  percent: number;
  message: string;
  current_act?: number;
  total_acts?: number;
  current_chapter?: number;
  total_chapters?: number;
}
