import { useEffect, useRef, useState } from "react";

export default function PlayerBar({ url, label, onClose }: {
  url: string | null;
  label: string;
  onClose: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setTime(0);
    if (url && audioRef.current) audioRef.current.load();
  }, [url]);

  if (!url) return null;

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="fixed bottom-0 inset-x-0 bg-surface border-t border-line">
      <div className="max-w-canvas mx-auto px-6 py-3 flex items-center gap-4">
        <button
          className="btn-outline"
          onClick={() => {
            const a = audioRef.current!;
            if (playing) a.pause(); else a.play();
            setPlaying(!playing);
          }}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <input
          type="range" className="scrubber flex-1"
          min={0} max={duration || 0} step={0.1} value={time}
          onChange={(e) => {
            const t = Number(e.target.value);
            if (audioRef.current) audioRef.current.currentTime = t;
            setTime(t);
          }}
        />
        <span className="font-mono text-xs text-muted whitespace-nowrap">
          {fmt(time)} / {fmt(duration)}
        </span>
        <span className="text-sm text-muted truncate max-w-[240px]">{label}</span>
        <button className="btn-quiet" onClick={onClose}>Close</button>
      </div>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}
