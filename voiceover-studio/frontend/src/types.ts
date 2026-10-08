export type VoiceCategory =
  | "Nigerian Female" | "Nigerian Male"
  | "Foreign Male" | "Foreign Female";

export interface Voice {
  id: string;
  name: string;
  category: VoiceCategory | string;
  descriptors: string[];
  is_custom: number;
}

export interface Job {
  id: string;
  project_name: string;
  voice_id: string;
  status: "queued" | "rendering" | "done" | "failed";
  progress: number;
  total_chunks: number;
  done_chunks: number;
  eta_sec: number | null;
  error: string | null;
}

export interface JobProgress {
  type: "snapshot" | "started" | "progress" | "done";
  status?: string;
  progress?: number;
  done?: number;
  total?: number;
  eta_sec?: number | null;
  mp3?: string;
  wav?: string;
}
