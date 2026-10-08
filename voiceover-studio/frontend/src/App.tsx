import { useEffect, useRef, useState } from "react";
import NavRail from "./components/NavRail";
import CastingRoom from "./components/CastingRoom";
import ScriptEditor from "./components/ScriptEditor";
import RenderConsole from "./components/RenderConsole";
import ExportsPanel from "./components/ExportsPanel";
import PlayerBar from "./components/PlayerBar";
import { api, connectJobSocket } from "./api";
import type { Job, JobProgress, Voice } from "./types";

type View = "project" | "casting" | "exports";

export default function App() {
  const [view, setView] = useState<View>("project");
  const [projectName, setProjectName] = useState("");
  const [script, setScript] = useState("");
  const [voice, setVoice] = useState<Voice | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [rendering, setRendering] = useState(false);
  const [player, setPlayer] = useState<{ url: string; label: string } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const onSocketMessage = (msg: JobProgress) => {
    setJob((j) => {
      if (!j) return j;
      const next = { ...j };
      if (msg.type === "progress" || msg.type === "snapshot") {
        next.status = (msg.status as Job["status"]) ?? "rendering";
        next.progress = msg.progress ?? next.progress;
        next.done_chunks = msg.done ?? next.done_chunks;
        next.total_chunks = msg.total ?? next.total_chunks;
        next.eta_sec = msg.eta_sec ?? next.eta_sec;
      }
      if (msg.type === "done") next.status = "done";
      return next;
    });
    if (msg.type === "done") setRendering(false);
  };

  const startRender = async () => {
    if (!voice) return;
    setRendering(true);
    const { job_id } = await api.createJob(projectName.trim(), voice.id, script);
    const created = await api.job(job_id);
    setJob(created);
    wsRef.current?.close();
    wsRef.current = connectJobSocket(job_id, onSocketMessage);
  };

  useEffect(() => () => wsRef.current?.close(), []);

  return (
    <div className="flex min-h-screen">
      <NavRail view={view} onChange={setView} />
      <main className="flex-1 px-10 py-10 pb-28">
        <div className="max-w-canvas mx-auto">
          {view === "project" && (
            <>
              <ScriptEditor
                projectName={projectName} setProjectName={setProjectName}
                script={script} setScript={setScript}
                selectedVoice={voice} onRender={startRender} rendering={rendering}
              />
              <RenderConsole
                job={job}
                onListen={() => job && setPlayer({
                  url: api.jobAudioUrl(job.id),
                  label: `${projectName} — full mix`,
                })}
              />
            </>
          )}
          {view === "casting" && (
            <CastingRoom
              selectedId={voice?.id ?? null}
              onSelect={setVoice}
              onPlay={(url, label) => setPlayer({ url, label })}
            />
          )}
          {view === "exports" && (
            <ExportsPanel onListen={(id, name) =>
              setPlayer({ url: api.jobAudioUrl(id), label: name })} />
          )}
        </div>
      </main>
      <PlayerBar
        url={player?.url ?? null}
        label={player?.label ?? ""}
        onClose={() => setPlayer(null)}
      />
    </div>
  );
}
