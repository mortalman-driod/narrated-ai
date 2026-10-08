import { useRef } from "react";
import { PrimaryButton, Spinner } from "./Buttons";

export default function ScriptEditor({ projectName, setProjectName, script, setScript,
                                       selectedVoice, onRender, rendering }: {
  projectName: string;
  setProjectName: (s: string) => void;
  script: string;
  setScript: (s: string) => void;
  selectedVoice: { name: string } | null;
  onRender: () => void;
  rendering: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const words = script.trim() ? script.trim().split(/\s+/).length : 0;
  const minutes = Math.round(words / 150);

  const importFile = async (file: File) => {
    setScript(await file.text());
    if (!projectName) setProjectName(file.name.replace(/\.[^.]+$/, ""));
  };

  return (
    <section>
      <h2 className="font-display text-3xl mb-1">Your project</h2>
      <p className="text-muted mb-6">
        Paste a script or import a text file. About {minutes} minute{minutes === 1 ? "" : "s"}
        {" "}of finished audio at reading pace.
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          className="bg-surface border border-line rounded-btn px-3 py-2 text-sm w-64
                     focus:outline-none focus:ring-2 focus:ring-accent/60"
          placeholder="Project name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
        <button className="btn-outline" onClick={() => fileRef.current?.click()}>
          Import Script
        </button>
        <input
          ref={fileRef} type="file" accept=".txt,.md,.docx" className="hidden"
          onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
        />
      </div>

      <textarea
        className="script-area"
        placeholder="Paste your script here. Paragraph breaks become natural pauses;
headings in caps become section breaks."
        value={script}
        onChange={(e) => setScript(e.target.value)}
      />

      <div className="flex items-center gap-4 mt-4">
        <PrimaryButton onClick={onRender}
                       disabled={rendering || !script.trim() || !selectedVoice || !projectName.trim()}>
          {rendering
            ? <span className="inline-flex items-center gap-2"><Spinner />Rendering…</span>
            : "Start Render"}
        </PrimaryButton>
        <p className="text-sm text-muted">
          {selectedVoice
            ? <>Narrator: <span className="text-ink font-medium">{selectedVoice.name}</span></>
            : "Pick a narrator in the Casting Room first."}
        </p>
      </div>
    </section>
  );
}
