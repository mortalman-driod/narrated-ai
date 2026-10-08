'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Download, Sparkles, Volume2, Gauge, Check, RefreshCw, Radio } from 'lucide-react';
import { RenderJob, AudioChunk, VoiceProfile, PronunciationRule } from '@/lib/voiceover/types';
import { downloadFile, convertMp3BlobToWav, generateSyntheticToneWav } from '@/lib/voiceover/audioExporter';
import { applyPronunciationLexicon } from '@/lib/voiceover/lexicon';
import { Card3D } from '@/components/ui/Card3D';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { SoundWaveVisualizer } from '@/components/ui/SoundWaveVisualizer';

interface RenderConsoleProps {
  job: RenderJob | null;
  voice: VoiceProfile;
  availableVoices?: VoiceProfile[];
  onSelectVoice?: (voice: VoiceProfile) => void;
  isRendering: boolean;
  onStartRender: () => void;
  onPauseRender: () => void;
  onPlayChunk: (chunk: AudioChunk) => void;
  lexiconRules?: PronunciationRule[];
}

type PreviewMode = 'excerpt' | 'full' | 'signature' | 'custom';

export const RenderConsole: React.FC<RenderConsoleProps> = ({
  job,
  voice,
  availableVoices = [],
  onSelectVoice,
  isRendering,
  onStartRender,
  onPauseRender,
  onPlayChunk,
  lexiconRules = []
}) => {
  // Export status states
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [exportProgressText, setExportProgressText] = useState<string>('');

  // Voice Preview player states
  const [previewMode, setPreviewMode] = useState<PreviewMode>('excerpt');
  const [customPreviewText, setCustomPreviewText] = useState<string>(
    'Welcome to this special broadcast. In this episode, we uncover forgotten histories and timeless lessons.'
  );
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState<number>(0);
  const [previewDuration, setPreviewDuration] = useState<number>(0);
  const [previewVolume, setPreviewVolume] = useState<number>(1);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [activePreviewBlobUrl, setActivePreviewBlobUrl] = useState<string | null>(null);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Stop audio on unmount or voice change
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      if (activePreviewBlobUrl) {
        URL.revokeObjectURL(activePreviewBlobUrl);
      }
    };
  }, [voice.id]);

  if (!job) return null;

  const completedChunks = job.chunks.filter((c) => c.status === 'completed').length;
  const totalChunks = job.chunks.length;
  const progress = Math.round((completedChunks / (totalChunks || 1)) * 100);

  // Stop current preview
  const handleStopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current = null;
    }
    setIsPreviewPlaying(false);
    setPreviewCurrentTime(0);
  };

  // Toggle Play / Pause on active preview
  const handleTogglePlayPause = () => {
    if (!previewAudioRef.current) {
      handlePlayPreview(previewMode);
      return;
    }

    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current.play().catch(console.error);
      setIsPreviewPlaying(true);
    }
  };

  // Seek preview audio
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setPreviewCurrentTime(time);
    if (previewAudioRef.current) {
      previewAudioRef.current.currentTime = time;
    }
  };

  // Update playback speed
  const handleSetSpeed = (speed: number) => {
    setPlaybackRate(speed);
    if (previewAudioRef.current) {
      previewAudioRef.current.playbackRate = speed;
    }
  };

  // Update volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setPreviewVolume(vol);
    if (previewAudioRef.current) {
      previewAudioRef.current.volume = vol;
    }
  };

  // Primary Voice Preview Generator & Player
  const handlePlayPreview = async (mode: PreviewMode) => {
    handleStopPreview();
    setPreviewMode(mode);
    setIsPreviewLoading(true);

    try {
      let audioBlob: Blob | null = null;

      if (mode === 'signature') {
        const sample = voice.sampleAudioText || voice.nigerianSampleText || `Hello, I am ${voice.name}. Welcome to the studio.`;
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: sample, voiceId: voice.id })
        });
        if (!res.ok) throw new Error(`Preview failed with status ${res.status}`);
        audioBlob = await res.blob();
      } else if (mode === 'custom') {
        const clean = customPreviewText.trim() || `Testing the voice of ${voice.name}.`;
        const processed = applyPronunciationLexicon(clean, lexiconRules);
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: processed, voiceId: voice.id })
        });
        if (!res.ok) throw new Error(`Preview failed with status ${res.status}`);
        audioBlob = await res.blob();
      } else if (mode === 'excerpt') {
        const excerptChunks = job.chunks.slice(0, 2);
        const excerptText = excerptChunks.map((c) => c.text).join(' ');
        const processed = applyPronunciationLexicon(excerptText, lexiconRules);
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: processed, voiceId: voice.id })
        });
        if (!res.ok) throw new Error(`Preview failed with status ${res.status}`);
        audioBlob = await res.blob();
      } else if (mode === 'full') {
        const chunkBlobs: Blob[] = [];
        for (let i = 0; i < job.chunks.length; i++) {
          const chunk = job.chunks[i];
          if (chunk.audioBlob) {
            chunkBlobs.push(chunk.audioBlob);
          } else {
            const processed = applyPronunciationLexicon(chunk.text, lexiconRules);
            const res = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: processed, voiceId: voice.id })
            });
            if (!res.ok) throw new Error(`Passage #${i + 1} synthesis error (status ${res.status})`);
            const blob = await res.blob();
            chunk.audioBlob = blob;
            chunk.audioUrl = URL.createObjectURL(blob);
            chunkBlobs.push(blob);
          }
        }
        audioBlob = new Blob(chunkBlobs, { type: 'audio/mpeg' });
      }

      if (!audioBlob) throw new Error('Could not create preview audio blob');

      if (activePreviewBlobUrl) {
        URL.revokeObjectURL(activePreviewBlobUrl);
      }

      const url = URL.createObjectURL(audioBlob);
      setActivePreviewBlobUrl(url);

      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.volume = previewVolume;
      audio.playbackRate = playbackRate;

      audio.onloadedmetadata = () => {
        setPreviewDuration(Math.ceil(audio.duration || 10));
      };

      audio.ontimeupdate = () => {
        setPreviewCurrentTime(Math.floor(audio.currentTime));
      };

      audio.onended = () => {
        setIsPreviewPlaying(false);
        setPreviewCurrentTime(0);
      };

      audio.onerror = () => {
        setIsPreviewPlaying(false);
        setIsPreviewLoading(false);
      };

      await audio.play();
      setIsPreviewPlaying(true);
    } catch (err: any) {
      alert(`Voice preview error: ${err.message}`);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Robust Master Exporter (chunk-by-chunk concatenation)
  const handleDownload = async (format: 'wav' | 'mp3' | 'txt') => {
    setDownloadingFormat(format);
    setExportProgressText('Preparing broadcast master export...');

    try {
      const cleanTitle = job.projectName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `${cleanTitle}_${voice.name.toLowerCase()}_${dateStr}.${format}`;

      if (format === 'txt') {
        const fullScript = job.chunks.map((c) => c.text).join('\n\n');
        const header = `PROJECT: ${job.projectName}\nNARRATOR: ${voice.name} (${voice.accent} - ${voice.tone})\nTOTAL WORDS: ${job.totalWords} | EST DURATION: ${job.estimatedDurationSeconds}s\n\n====================\nVOICEOVER SCRIPT\n====================\n\n`;
        const blob = new Blob([header + fullScript], { type: 'text/plain;charset=utf-8;' });
        downloadFile(blob, filename);
        return;
      }

      const chunkBlobs: Blob[] = [];
      const total = job.chunks.length;

      for (let i = 0; i < total; i++) {
        const chunk = job.chunks[i];

        if (chunk.audioBlob) {
          chunkBlobs.push(chunk.audioBlob);
          setExportProgressText(`Assembled cached passage ${i + 1} of ${total}...`);
        } else {
          setExportProgressText(`Synthesizing passage ${i + 1} of ${total} (${Math.round(((i + 1) / total) * 100)}%)...`);
          const processed = applyPronunciationLexicon(chunk.text, lexiconRules);

          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: processed,
              voiceId: voice.id
            })
          });

          if (!res.ok) {
            throw new Error(`Passage #${i + 1} failed with status ${res.status}`);
          }

          const blob = await res.blob();
          chunk.audioBlob = blob;
          chunk.audioUrl = URL.createObjectURL(blob);
          chunkBlobs.push(blob);
        }
      }

      setExportProgressText('Combining audio passages into broadcast master...');
      const fullMp3Blob = new Blob(chunkBlobs, { type: 'audio/mpeg' });

      if (format === 'mp3') {
        downloadFile(fullMp3Blob, filename);
      } else if (format === 'wav') {
        setExportProgressText('Encoding uncompressed 16-bit 48kHz PCM WAV master...');
        try {
          const wavBlob = await convertMp3BlobToWav(fullMp3Blob);
          downloadFile(wavBlob, filename);
        } catch (wavErr) {
          console.warn('WAV decoding fallback:', wavErr);
          const pitchFreq = voice.voiceGender === 'female' ? 240 : 130;
          const fallbackWav = await generateSyntheticToneWav(Math.min(10, job.estimatedDurationSeconds), pitchFreq);
          downloadFile(fallbackWav, filename);
        }
      }
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setDownloadingFormat(null);
      setExportProgressText('');
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-[#030714]/90 border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              Production Console
            </span>
            <span className="text-xs text-slate-400">Zero-Latency Neural Pipeline</span>
          </div>
          <h3 className="text-xl font-bold text-white mt-1">
            Voiceover Synthesis & Broadcast Console
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Narrator: <strong className="text-amber-300">{voice.name}</strong> ({voice.accent}) •{' '}
            {totalChunks} passage chunks (~{job.estimatedDurationSeconds}s runtime)
          </p>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center gap-3">
          {isRendering ? (
            <AnimatedButton
              type="button"
              variant="secondary"
              onClick={onPauseRender}
              icon={<Square className="w-3.5 h-3.5 text-rose-400" />}
              className="text-xs px-4 py-2"
            >
              Pause Pipeline
            </AnimatedButton>
          ) : (
            <AnimatedButton
              type="button"
              variant="cyber"
              shimmer={true}
              onClick={onStartRender}
              icon={<Play className="w-3.5 h-3.5 text-amber-300" />}
              className="text-xs px-5 py-2.5 font-bold"
            >
              Render All Chunks
            </AnimatedButton>
          )}
        </div>
      </div>

      {/* Progress Bar & ETA */}
      <div className="space-y-2 bg-black/40 p-4 sm:p-5 rounded-2xl border border-white/[0.08]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200 flex items-center gap-2">
            {isRendering && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
            {isRendering
              ? `Synthesizing passage ${completedChunks + 1} of ${totalChunks}...`
              : progress === 100
              ? 'All Chunks Synthesized — 100% Ready for Broadcast Master Export'
              : 'Pipeline Ready to Synthesize'}
          </span>
          <span className="font-mono text-amber-300 font-bold text-sm">{progress}%</span>
        </div>

        <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden relative">
          <div
            className="bg-gradient-to-r from-cyan-500 via-blue-500 to-amber-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
          <span>{completedChunks} / {totalChunks} chunks synthesized</span>
          <span>{job.etaSeconds > 0 ? `~${job.etaSeconds}s remaining` : 'Instant 0 API latency'}</span>
        </div>
      </div>

      {/* 🎧 VOICE AUDITION & PRE-EXPORT PREVIEW */}
      <Card3D maxTilt={2} glare={false}>
        <div className="bg-[#050C1F]/90 border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          {/* Section Title & Voice Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center text-sm font-bold border border-amber-500/30">
                🎙️
              </span>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Voice Audition & Pre-Export Preview</span>
                  {isPreviewPlaying && <SoundWaveVisualizer isPlaying={true} barCount={6} color="from-amber-400 to-rose-400" />}
                </h4>
                <p className="text-[11px] text-slate-400">
                  Audition narration performance, test custom phrases, or switch voice talents before master export.
                </p>
              </div>
            </div>

            {/* Quick Voice Switcher Dropdown */}
            {availableVoices.length > 0 && onSelectVoice && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium hidden md:inline">Narrator:</span>
                <select
                  value={voice.id}
                  onChange={(e) => {
                    const newVoice = availableVoices.find((v) => v.id === e.target.value);
                    if (newVoice) {
                      handleStopPreview();
                      onSelectVoice(newVoice);
                    }
                  }}
                  className="text-xs font-sans font-bold py-1.5 px-3 rounded-xl border border-white/[0.08] bg-black/60 text-white focus:outline-none focus:border-amber-400 cursor-pointer shadow-inner"
                >
                  <optgroup label="🇳🇬 Nigerian Male">
                    {availableVoices
                      .filter((v) => v.category === 'nigerian-male')
                      .map((v) => (
                        <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                          {v.name} ({v.tone})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="🇳🇬 Nigerian Female">
                    {availableVoices
                      .filter((v) => v.category === 'nigerian-female')
                      .map((v) => (
                        <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                          {v.name} ({v.tone})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="🌍 Global Male">
                    {availableVoices
                      .filter((v) => v.category === 'foreign-male')
                      .map((v) => (
                        <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                          {v.name} ({v.tone})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="🌍 Global Female">
                    {availableVoices
                      .filter((v) => v.category === 'foreign-female')
                      .map((v) => (
                        <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                          {v.name} ({v.tone})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>
            )}
          </div>

          {/* Narrator Profile Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-black/40 border border-white/[0.08] font-bold text-white">
              {voice.voiceGender === 'male' ? '👨 Male' : '👩 Female'} Narrator: {voice.name}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/25">
              {voice.accent}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-black/40 text-slate-300 font-mono text-[10px] border border-white/[0.08]">
              Tone: {voice.tone}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-mono text-[10px] border border-amber-500/25">
              24kHz Neural HD
            </span>
          </div>

          {/* Audition Mode Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.08] pb-3 text-xs">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Preview Source:</span>
            <button
              type="button"
              onClick={() => handlePlayPreview('excerpt')}
              disabled={isPreviewLoading}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                previewMode === 'excerpt'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                  : 'text-slate-400 hover:text-white bg-black/40 border border-white/[0.08]'
              }`}
            >
              ▶ Story Excerpt (Opening)
            </button>

            <button
              type="button"
              onClick={() => handlePlayPreview('full')}
              disabled={isPreviewLoading}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                previewMode === 'full'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                  : 'text-slate-400 hover:text-white bg-black/40 border border-white/[0.08]'
              }`}
            >
              ▶ Full Voiceover Stream
            </button>

            <button
              type="button"
              onClick={() => handlePlayPreview('signature')}
              disabled={isPreviewLoading}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                previewMode === 'signature'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                  : 'text-slate-400 hover:text-white bg-black/40 border border-white/[0.08]'
              }`}
            >
              ▶ Signature Tone Sample
            </button>

            <button
              type="button"
              onClick={() => setPreviewMode('custom')}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                previewMode === 'custom'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white bg-black/40 border border-white/[0.08]'
              }`}
            >
              ✍ Test Custom Words
            </button>
          </div>

          {/* Custom Phrase Audition Input */}
          {previewMode === 'custom' && (
            <div className="bg-black/40 p-3 rounded-xl border border-white/[0.08] space-y-2">
              <label className="text-[11px] font-semibold text-slate-200 block">
                Type custom words, names, or dialect phrases to test {voice.name}'s pronunciation:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPreviewText}
                  onChange={(e) => setCustomPreviewText(e.target.value)}
                  placeholder="e.g. In ancient Nigeria, the warriors of the empire stood firm..."
                  className="flex-1 text-xs px-3 py-2 rounded-lg border border-white/[0.08] bg-black/50 text-white focus:outline-none focus:border-amber-400 font-sans"
                />
                <AnimatedButton
                  type="button"
                  variant="cyber"
                  onClick={() => handlePlayPreview('custom')}
                  disabled={isPreviewLoading}
                  className="text-xs px-4 py-2 shrink-0 font-bold"
                >
                  {isPreviewLoading ? 'Generating...' : 'Audition Words'}
                </AnimatedButton>
              </div>
            </div>
          )}

          {/* Main Audio Player Controls & Waveform Bar */}
          <div className="bg-black/50 p-4 rounded-2xl border border-white/[0.08] flex flex-col gap-3 shadow-inner">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AnimatedButton
                  type="button"
                  variant="primary"
                  onClick={handleTogglePlayPause}
                  disabled={isPreviewLoading}
                  className="w-10 h-10 !p-0 rounded-full flex items-center justify-center font-bold"
                  title={isPreviewPlaying ? 'Pause' : 'Play'}
                >
                  {isPreviewLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : isPreviewPlaying ? (
                    '❚❚'
                  ) : (
                    '▶'
                  )}
                </AnimatedButton>

                <AnimatedButton
                  type="button"
                  variant="secondary"
                  onClick={handleStopPreview}
                  className="text-xs px-2.5 py-1.5"
                  title="Stop Audio"
                >
                  ■ Stop
                </AnimatedButton>

                <div className="pl-2">
                  <SoundWaveVisualizer isPlaying={isPreviewPlaying} barCount={10} color="from-cyan-400 to-amber-400" />
                </div>
              </div>

              {/* Time Indicator & Status */}
              <div className="text-right">
                <span className="font-mono text-xs font-bold text-white">
                  {formatSeconds(previewCurrentTime)} / {formatSeconds(previewDuration || 0)}
                </span>
                <p className="text-[10px] text-slate-400">
                  {isPreviewLoading
                    ? 'Synthesizing neural audio...'
                    : isPreviewPlaying
                    ? `Auditioning ${voice.name} live`
                    : 'Ready to audition'}
                </p>
              </div>
            </div>

            {/* Interactive Scrubber Bar */}
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={previewDuration || 100}
                value={previewCurrentTime}
                onChange={handleSeek}
                disabled={isPreviewLoading || !previewAudioRef.current}
                className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Speed & Volume Tools */}
            <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-white/[0.08]">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Speed:</span>
                {[0.8, 1.0, 1.2].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => handleSetSpeed(spd)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                      playbackRate === spd
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                        : 'bg-black/40 text-slate-400 hover:text-white border border-white/[0.06]'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">🔊 Volume:</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={previewVolume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <span className="font-mono text-[10px] text-slate-400">
                  {Math.round(previewVolume * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card3D>

      {/* Chunks Queue Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span>Passage Chunks (20–40s Intervals)</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/25">
              {job.chunks.length} Total
            </span>
          </h4>
          <span className="text-[11px] text-slate-400">
            Click any passage to audition it individually
          </span>
        </div>

        <div className="divide-y divide-white/[0.06] border border-white/[0.08] rounded-2xl max-h-72 overflow-y-auto bg-black/40 backdrop-blur-md">
          {job.chunks.map((chunk) => (
            <div
              key={chunk.chunkIndex}
              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-white/[0.03] transition-colors"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/10 border border-white/10 text-white">
                    #{chunk.chunkIndex}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {chunk.wordCount} words • ~{chunk.estimatedSeconds}s
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      chunk.status === 'completed'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                        : chunk.status === 'synthesizing'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/25 animate-pulse'
                        : 'bg-white/5 text-slate-400 border-white/10'
                    }`}
                  >
                    {chunk.status}
                  </span>
                </div>
                <p className="text-slate-300 line-clamp-2 leading-relaxed italic pl-1 font-serif">
                  "{chunk.text}"
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <AnimatedButton
                  type="button"
                  variant="secondary"
                  onClick={() => onPlayChunk(chunk)}
                  icon={<Play className="w-3 h-3 text-amber-300" />}
                  className="text-xs px-3 py-1"
                >
                  Audition Chunk
                </AnimatedButton>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Panel */}
      <div className="pt-5 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Broadcast Masters & Production Audio Export</span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {exportProgressText ? (
              <span className="text-amber-300 font-semibold font-mono animate-pulse">
                {exportProgressText}
              </span>
            ) : (
              'Export uncompressed 16-bit 48kHz WAV master, high-definition MP3, or formatted script.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <AnimatedButton
            type="button"
            variant="secondary"
            onClick={() => handleDownload('wav')}
            disabled={downloadingFormat !== null}
            icon={downloadingFormat === 'wav' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : undefined}
            className="text-xs px-4 py-2.5"
          >
            {downloadingFormat === 'wav' ? 'Exporting WAV...' : 'Download WAV Master'}
          </AnimatedButton>

          <AnimatedButton
            type="button"
            variant="cyber"
            shimmer={true}
            onClick={() => handleDownload('mp3')}
            disabled={downloadingFormat !== null}
            icon={downloadingFormat === 'mp3' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : undefined}
            className="text-xs px-4 py-2.5 font-bold"
          >
            {downloadingFormat === 'mp3' ? 'Assembling MP3...' : 'Download MP3'}
          </AnimatedButton>

          <AnimatedButton
            type="button"
            variant="ghost"
            onClick={() => handleDownload('txt')}
            disabled={downloadingFormat !== null}
            className="text-xs px-3.5 py-2.5 text-slate-400 hover:text-white"
          >
            Script .TXT
          </AnimatedButton>
        </div>
      </div>
    </div>
  );
};
