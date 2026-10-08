import type { Job, JobProgress, Voice } from "./types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, init);
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(detail.detail || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  voices: (category?: string) =>
    request<Voice[]>(`/voices${category ? `?category=${encodeURIComponent(category)}` : ""}`),

  preview: (voiceId: string, text: string) => {
    const body = new FormData();
    body.append("voice_id", voiceId);
    body.append("text", text);
    return fetch(`${BASE}/preview`, { method: "POST", body })
      .then((r) => r.blob())
      .then((b) => URL.createObjectURL(b));
  },

  createJob: (projectName: string, voiceId: string, script: string) => {
    const body = new FormData();
    body.append("project_name", projectName);
    body.append("voice_id", voiceId);
    body.append("script", script);
    return request<{ job_id: string }>(`/jobs`, { method: "POST", body });
  },

  job: (id: string) => request<Job>(`/jobs/${id}`),
  jobAudioUrl: (id: string) => `${BASE}/jobs/${id}/audio`,
  downloadUrl: (id: string, fmt: "mp3" | "wav" | "zip") =>
    `${BASE}/jobs/${id}/download?fmt=${fmt}`,

  pronunciations: () => request<Record<string, string>>(`/pronunciations`),
  savePronunciations: (dict: Record<string, string>) =>
    request(`/pronunciations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dict),
    }),
};

export function connectJobSocket(
  jobId: string,
  onMessage: (msg: JobProgress) => void
): WebSocket {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}/ws/jobs/${jobId}`);
  ws.onmessage = (e) => onMessage(JSON.parse(e.data));
  return ws;
}
