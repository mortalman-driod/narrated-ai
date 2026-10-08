import type { Voice } from "../types";

export default function VoiceCard({ voice, selected, onListen, onSelect }: {
  voice: Voice;
  selected: boolean;
  onListen: () => void;
  onSelect: () => void;
}) {
  return (
    <div className={`voice-card ${selected ? "card-selected" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-xl">{voice.name}</h3>
        <span className="tag">{voice.category}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3 mb-5">
        {voice.descriptors.map((d) => <span key={d} className="tag">{d}</span>)}
        {!!voice.is_custom && <span className="tag">Cloned</span>}
      </div>
      <div className="flex gap-2">
        <button className="btn-outline flex-1" onClick={onListen}>Listen</button>
        <button className="btn-primary flex-1" onClick={onSelect} disabled={selected}>
          {selected ? "Selected" : "Select Voice"}
        </button>
      </div>
    </div>
  );
}
