export type Page = 'Projects' | 'Voices' | 'Exports' | 'Settings';
export interface Settings { speed: number; paragraph_pause_ms: number; section_pause_ms: number; sentence_pause_ms: number; loudness_lufs: number; engine: 'auto' | 'kokoro' | 'piper' | 'xtts' }
export interface Voice { id: string; name: string; gender: string; accent: string; tone: string; engine: string; model_voice: string; custom: boolean; available: boolean; description: string }
export interface Project { id: string; name: string; script: string; voice_id: string; settings: Settings; created_at: string; updated_at: string }
export type Draft = Pick<Project, 'name' | 'script' | 'voice_id' | 'settings'> & { id?: string };
export interface Job { id: string; project_id: string | null; project_name: string; voice_id: string; voice_name: string; kind: 'render' | 'preview'; status: 'queued' | 'running' | 'assembling' | 'completed' | 'failed' | 'cancelled'; progress: number; completed_chunks: number; total_chunks: number; eta_seconds: number | null; duration_seconds: number | null; error: string | null; created_at: string; updated_at: string; available_formats: string[]; chunks: { index: number; url: string; duration_seconds: number }[]; audio_url: string | null }
export interface Health { status: string; queue_mode: string; ffmpeg: boolean; engines: { id: string; available: boolean; detail: string }[]; device: string }
export interface Track { url: string; title: string; subtitle: string }
export const defaultSettings: Settings = { speed: 1, paragraph_pause_ms: 600, section_pause_ms: 1200, sentence_pause_ms: 300, loudness_lufs: -16, engine: 'auto' };
export const terminal = (job: Job) => ['completed', 'failed', 'cancelled'].includes(job.status);
export const timeLabel = (seconds: number) => { const whole = Math.max(0, Math.floor(seconds)); return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`; };
