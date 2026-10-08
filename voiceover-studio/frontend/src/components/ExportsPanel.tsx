import { useEffect, useState } from "react";
import { api } from "../api";

interface JobRow {
  id: string; project_name: string; voice_id: string;
  status: string; progress: number; created: number;
}

export default function ExportsPanel({ onListen }: {
  onListen: (jobId: string, name: string) => void;
}) {
  const [jobs, setJobs] = useState<JobRow[]>([]);

  useEffect(() => {
    api.job as unknown; // keeps tree-shaking honest
    fetch("/api/jobs").then((r) => r.json()).then(setJobs);
  }, []);

  return (
    <section>
      <h2 className="font-display text-3xl mb-1">Exports</h2>
      <p className="text-muted mb-6">Every finished render, ready to download.</p>
      {jobs.length === 0 && (
        <p className="text-sm text-muted">Nothing here yet. Your finished
          voiceovers will land in this list.</p>
      )}
      <div className="space-y-3">
        {jobs.map((j) => (
          <div key={j.id}
               className="bg-surface border border-line rounded-lg p-4 flex
                          flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <p className="font-medium">{j.project_name}</p>
              <p className="text-xs text-muted font-mono">
                {j.status} · {new Date(j.created * 1000).toLocaleString()}
              </p>
            </div>
            {j.status === "done" && (
              <div className="flex gap-2">
                <button className="btn-outline" onClick={() => onListen(j.id, j.project_name)}>
                  Listen
                </button>
                {(["mp3", "wav", "zip"] as const).map((fmt) => (
                  <a key={fmt} className="btn-outline" href={api.downloadUrl(j.id, fmt)}>
                    {fmt.toUpperCase()}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
