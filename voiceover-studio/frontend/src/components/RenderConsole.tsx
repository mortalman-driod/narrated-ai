import { PrimaryButton, OutlineButton, Spinner } from "./Buttons";
import { api } from "../api";
import type { Job } from "../types";

export default function RenderConsole({ job, onListen }: {
  job: Job | null;
  onListen: () => void;
}) {
  if (!job) {
    return (
      <div className="mt-6 bg-surface border border-line rounded-lg p-5">
        <p className="text-muted text-sm">No render yet. When you start one, live
          progress and your finished audio will appear here.</p>
      </div>
    );
  }

  const pct = Math.round(job.progress * 100);

  return (
    <div className="mt-6 bg-surface border border-line rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-xl">Render console</h3>
        <span className="tag">
          {job.status === "done" ? "Complete"
            : job.status === "failed" ? "Failed"
            : job.status === "rendering" ? `${pct}%` : "Queued"}
        </span>
      </div>

      {job.status === "failed" && (
        <p className="text-sm text-accent mb-3">{job.error}</p>
      )}

      {job.status !== "failed" && (
        <>
          <div className="progress-track mb-2">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-sm text-muted mb-4">
            {job.status === "done"
              ? `Finished. ${job.total_chunks} sections assembled and normalized.`
              : job.status === "rendering"
                ? `Rendering — ${pct}%, about ${job.eta_sec ?? "…"} min left`
                : "Waiting for a free renderer…"}
          </p>
        </>
      )}

      {job.status === "done" && (
        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={onListen}>Listen Full</PrimaryButton>
          <OutlineButton onClick={() => window.open(api.downloadUrl(job.id, "mp3"), "_blank")}>
            Download MP3
          </OutlineButton>
          <OutlineButton onClick={() => window.open(api.downloadUrl(job.id, "wav"), "_blank")}>
            Download WAV
          </OutlineButton>
          <OutlineButton onClick={() => window.open(api.downloadUrl(job.id, "zip"), "_blank")}>
            Download ZIP
          </OutlineButton>
        </div>
      )}
      {job.status === "rendering" && (
        <p className="text-sm text-muted inline-flex items-center gap-2">
          <Spinner /> You can keep working — the player will offer your audio
          the moment the last section lands.
        </p>
      )}
    </div>
  );
}
