import { useEffect, useRef, useState } from 'react';
import { AudioLines, Check, Headphones, Pause, Play, X } from 'lucide-react';
import { Track, Voice, timeLabel } from './types';

export function Mark({ small = false }: { small?: boolean }) { return <span className={`brand-mark ${small ? 'small' : ''}`} aria-hidden="true"><AudioLines size={small ? 19 : 27} strokeWidth={1.5} /></span>; }

export function VoiceCard({ voice, selected, previewing, onSelect, onListen }: { voice: Voice; selected: boolean; previewing: boolean; onSelect: () => void; onListen: () => void }) {
  return <article className={`voice-card ${selected ? 'selected' : ''}`}>
    <div className="voice-card-top"><span className={`voice-monogram ${voice.gender === 'male' ? 'sage' : ''}`}>{voice.name.slice(0, 1)}</span><span className="eyebrow">{voice.custom ? 'YOUR VOICE' : voice.engine.toUpperCase()}</span>{selected && <Check size={16} className="accent" />}</div>
    <h3>{voice.name}</h3><p>{voice.accent} · {voice.gender}</p><div className="voice-tags"><span>{voice.tone}</span>{!voice.available && <span>Setup needed</span>}</div>
    <p className="voice-description">{voice.description}</p>
    <div className="voice-actions"><button className="button secondary" onClick={onListen} disabled={!voice.available || previewing}><Headphones size={14} />{previewing ? 'Preparing…' : 'Listen'}</button><button className={`button ${selected ? 'selected-button' : 'primary'}`} onClick={onSelect}>{selected ? <><Check size={14} />Selected</> : 'Select voice'}</button></div>
  </article>;
}

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="modal" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal-inner"><div className="section-heading"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>{children}</div></dialog>;
}

export function Player({ track, onClose }: { track: Track; onClose: () => void }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setPosition(0); setDuration(0); setPeaks([]); setError('');
    audio.current?.load();
    audio.current?.play().catch(() => { if (alive) setPlaying(false); });
    // Decode a bounded-size sample for an actual waveform. Long masters retain a seek bar.
    fetch(track.url, { signal: controller.signal }).then(async r => {
      if (!r.ok || Number(r.headers.get('content-length')) > 20_000_000) return;
      const data = await r.arrayBuffer();
      if (!alive || data.byteLength > 20_000_000) return;
      const context = new AudioContext();
      try {
        const buffer = await context.decodeAudioData(data);
        const samples = buffer.getChannelData(0); const step = Math.max(1, Math.floor(samples.length / 120));
        const values = Array.from({ length: 120 }, (_, i) => { let max = 0; for (let j = i * step; j < Math.min(samples.length, (i + 1) * step); j += 32) max = Math.max(max, Math.abs(samples[j])); return max; });
        if (alive) setPeaks(values);
      } finally { await context.close(); }
    }).catch(() => {});
    return () => { alive = false; controller.abort(); };
  }, [track.url]);
  const progress = duration ? position / duration : 0;
  return <section className="player" aria-label="Audio player"><audio ref={audio} src={track.url} onTimeUpdate={() => setPosition(audio.current?.currentTime || 0)} onLoadedMetadata={() => setDuration(audio.current?.duration || 0)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setError('This audio could not be loaded. Try it again.')} />
    <button className="player-play" onClick={() => playing ? audio.current?.pause() : audio.current?.play().catch(() => setError('Press play again to enable audio.'))} aria-label={playing ? 'Pause audio' : 'Play audio'}>{playing ? <Pause size={19} /> : <Play size={19} />}</button>
    <div className="player-label"><strong>{track.title}</strong><span>{error || track.subtitle}</span></div>
    <div className="waveform"><div className="waveform-bars" aria-hidden="true">{peaks.map((p, i) => <i key={i} style={{ height: `${Math.max(5, p * 100)}%`, background: i / peaks.length < progress ? 'var(--accent)' : 'var(--border)' }} />)}</div><input type="range" aria-label="Seek audio" min={0} max={duration || 1} step={0.1} value={position} onChange={e => { if (audio.current) audio.current.currentTime = Number(e.target.value); setPosition(Number(e.target.value)); }} /></div>
    <span className="player-time">{timeLabel(position)} / {timeLabel(duration)}</span><button className="icon-button" onClick={onClose} aria-label="Close player"><X size={18} /></button>
  </section>;
}
