import { useEffect, useState } from "react";
import { api } from "../api";
import type { Voice } from "../types";
import VoiceCard from "./VoiceCard";
import { OutlineButton } from "./Buttons";

const CATEGORIES = ["All", "Nigerian Female", "Nigerian Male",
                    "Foreign Male", "Foreign Female"] as const;

export default function CastingRoom({ selectedId, onSelect, onPlay }: {
  selectedId: string | null;
  onSelect: (v: Voice) => void;
  onPlay: (url: string, label: string) => void;
}) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [category, setCategory] = useState<string>("All");
  const [testText, setTestText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.voices(category === "All" ? undefined : category).then(setVoices);
  }, [category]);

  const listen = async (v: Voice) => {
    onPlay(`/api/voices/${v.id}/sample`, `${v.name} — audition sample`);
  };

  const testWords = async () => {
    if (!selectedId || !testText.trim()) return;
    setBusy(true);
    try {
      const url = await api.preview(selectedId, testText);
      const name = voices.find((v) => v.id === selectedId)?.name ?? selectedId;
      onPlay(url, `${name} — your words`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2 className="font-display text-3xl mb-1">Choose your narrator</h2>
      <p className="text-muted mb-6">Listen before you decide. Every voice plays a
        real sample, including Nigerian names and places.</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`btn-outline ${category === c ? "!border-accent !text-accent" : ""}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {voices.map((v) => (
          <VoiceCard
            key={v.id} voice={v} selected={v.id === selectedId}
            onListen={() => listen(v)} onSelect={() => onSelect(v)}
          />
        ))}
      </div>

      <div className="bg-surface border border-line rounded-lg p-5">
        <h3 className="font-display text-xl mb-1">Test my own words</h3>
        <p className="text-sm text-muted mb-3">
          Type any sentence and hear it instantly in the selected voice.
        </p>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-paper border border-line rounded-btn px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-accent/60"
            placeholder="e.g. Chidinma arrived in Ibadan with two thousand naira."
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
          />
          <OutlineButton onClick={testWords} disabled={busy || !selectedId || !testText.trim()}>
            {busy ? "Rendering…" : "Hear it"}
          </OutlineButton>
        </div>
      </div>
    </section>
  );
}
