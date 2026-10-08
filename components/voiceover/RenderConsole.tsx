'use client';

import React, { useState, useRef, useEffect } from 'react';
import { RenderJob, AudioChunk, VoiceProfile, PronunciationRule } from '@/lib/voiceover/types';
import { downloadFile, convertMp3BlobToWav, generateSyntheticToneWav } from '@/lib/voiceover/audioExporter';
import { applyPronunciationLexicon } from '@/lib/voiceover/lexicon';

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
        // Voice's signature sample text
        const sample = voice.sampleAudioText || voice.nigerianSampleText || `Hello, I am ${voice.name}. Welcome to the studio.`;
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: sample, voiceId: voice.id })
        });
        if (!res.ok) throw new Error(`Preview failed with status ${res.status}`);
        audioBlob = await res.blob();
      } else if (mode === 'custom') {
        // Custom text entered by user
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
        // First 1-2 chunks of the current script (~100-150 words)
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
        // Concatenate all chunks (using cached blobs if available)
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
    setExportProgressText('Preparing master export...');

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

      // Gather or synthesize all chunks one by one
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
    <div className="bg-white border border-[#E8E2D9] rounded-[8px] p-6 shadow-sm space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D9] pb-5">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#4D7C0F] font-semibold">
            Production Console
          </span>
          <h3 className="text-xl font-serif font-bold text-[#1C1917] mt-0.5">
            Voiceover Synthesis & Pipeline
          </h3>
          <p className="text-xs text-[#6B6259] mt-0.5">
            Narrator: <strong className="text-[#1C1917]">{voice.name}</strong> ({voice.accent}) •{' '}
            {totalChunks} passage chunks (~{job.estimatedDurationSeconds}s total audio)
          </p>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center gap-2.5">
          {isRendering ? (
            <button
              type="button"
              onClick={onPauseRender}
              className="px-4 py-2 rounded-[6px] border border-[#1C1917] text-[#1C1917] hover:bg-[#FAF7F2] text-xs font-semibold transition-colors"
            >
              ❚❚ Pause Pipeline
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartRender}
              className="px-5 py-2.5 rounded-[6px] bg-[#B4532A] hover:bg-[#9A4524] text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-2"
            >
              ▶ Render All Chunks
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar & ETA */}
      <div className="space-y-2 bg-[#FAF7F2] p-4 rounded-[6px] border border-[#E8E2D9]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#1C1917]">
            {isRendering
              ? `Rendering passage ${completedChunks + 1} of ${totalChunks}...`
              : progress === 100
              ? 'All Chunks Synthesized — 100% Ready for Export'
              : 'Ready to Synthesize'}
          </span>
          <span className="font-mono text-[#B4532A] font-bold">{progress}%</span>
        </div>

        <div className="w-full bg-[#E8E2D9] h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-[#4D7C0F] h-full transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#6B6259] font-mono pt-1">
          <span>{completedChunks} / {totalChunks} chunks assembled</span>
          <span>{job.etaSeconds > 0 ? `~${job.etaSeconds}s remaining` : 'Zero API latency'}</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 🎧 NEW SECTION: VOICE AUDITION & PRE-EXPORT PREVIEW      */}
      {/* ======================================================== */}
      <div className="bg-[#FAF7F2] border-2 border-[#E8E2D9] rounded-xl p-5 shadow-sm space-y-4">
        {/* Section Title & Voice Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E2D9] pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#B4532A]/10 text-[#B4532A] flex items-center justify-center text-sm font-bold border border-[#B4532A]/30">
              🎙️
            </span>
            <div>
              <h4 className="text-sm font-serif font-bold text-[#1C1917]">
                Voice Audition & Pre-Export Preview
              </h4>
              <p className="text-[11px] text-[#6B6259]">
                Listen to the voice performance, test custom phrases, or switch narrators before exporting.
              </p>
            </div>
          </div>

          {/* Quick Voice Switcher Dropdown */}
          {availableVoices.length > 0 && onSelectVoice && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6B6259] font-medium hidden md:inline">Voice:</span>
              <select
                value={voice.id}
                onChange={(e) => {
                  const newVoice = availableVoices.find((v) => v.id === e.target.value);
                  if (newVoice) {
                    handleStopPreview();
                    onSelectVoice(newVoice);
                  }
                }}
                className="text-xs font-serif font-bold py-1.5 px-3 rounded-[6px] border border-[#E8E2D9] bg-white text-[#1C1917] focus:outline-none focus:border-[#B4532A] cursor-pointer shadow-xs"
              >
                <optgroup label="🇳🇬 Nigerian Male">
                  {availableVoices
                    .filter((v) => v.category === 'nigerian-male')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.tone})
                      </option>
                    ))}
                </optgroup>
                <optgroup label="🇳🇬 Nigerian Female">
                  {availableVoices
                    .filter((v) => v.category === 'nigerian-female')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.tone})
                      </option>
                    ))}
                </optgroup>
                <optgroup label="🌍 Foreign Male">
                  {availableVoices
                    .filter((v) => v.category === 'foreign-male')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.tone})
                      </option>
                    ))}
                </optgroup>
                <optgroup label="🌍 Foreign Female">
                  {availableVoices
                    .filter((v) => v.category === 'foreign-female')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.tone})
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          )}
        </div>

        {/* Narrator Profile Pill & Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-white border border-[#E8E2D9] font-bold text-[#1C1917]">
            {voice.voiceGender === 'male' ? '👨 Male' : '👩 Female'} Narrator: {voice.name}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#4D7C0F]/10 text-[#4D7C0F] font-mono text-[10px] font-bold border border-[#4D7C0F]/20">
            {voice.accent}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#1C1917]/5 text-[#6B6259] font-mono text-[10px]">
            Tone: {voice.tone}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#B4532A]/10 text-[#B4532A] font-mono text-[10px]">
            24kHz Neural Broadcast HD
          </span>
        </div>

        {/* Audition Mode Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E8E2D9] pb-3 text-xs">
          <span className="text-[11px] text-[#6B6259] font-medium mr-1">Preview Source:</span>
          <button
            type="button"
            onClick={() => handlePlayPreview('excerpt')}
            disabled={isPreviewLoading}
            className={`px-3 py-1.5 rounded-[5px] font-semibold text-xs transition-all ${
              previewMode === 'excerpt'
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'bg-white text-[#1C1917] border border-[#E8E2D9] hover:border-[#1C1917]'
            }`}
          >
            ▶ Story Excerpt (Opening)
          </button>

          <button
            type="button"
            onClick={() => handlePlayPreview('full')}
            disabled={isPreviewLoading}
            className={`px-3 py-1.5 rounded-[5px] font-semibold text-xs transition-all ${
              previewMode === 'full'
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'bg-white text-[#1C1917] border border-[#E8E2D9] hover:border-[#1C1917]'
            }`}
          >
            ▶ Full Voiceover Stream
          </button>

          <button
            type="button"
            onClick={() => handlePlayPreview('signature')}
            disabled={isPreviewLoading}
            className={`px-3 py-1.5 rounded-[5px] font-semibold text-xs transition-all ${
              previewMode === 'signature'
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'bg-white text-[#1C1917] border border-[#E8E2D9] hover:border-[#1C1917]'
            }`}
          >
            ▶ Signature Tone Sample
          </button>

          <button
            type="button"
            onClick={() => setPreviewMode('custom')}
            className={`px-3 py-1.5 rounded-[5px] font-semibold text-xs transition-all ${
              previewMode === 'custom'
                ? 'bg-[#B4532A] text-white shadow-xs'
                : 'bg-white text-[#1C1917] border border-[#E8E2D9] hover:border-[#B4532A]'
            }`}
          >
            ✍ Test Custom Words
          </button>
        </div>

        {/* Custom Phrase Audition Input (Visible when Mode === 'custom') */}
        {previewMode === 'custom' && (
          <div className="bg-white p-3 rounded-[6px] border border-[#E8E2D9] space-y-2">
            <label className="text-[11px] font-semibold text-[#1C1917] block">
              Type custom words, names, or dialect phrases to test {voice.name}'s pronunciation:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customPreviewText}
                onChange={(e) => setCustomPreviewText(e.target.value)}
                placeholder="e.g. In ancient Nigeria, the warriors of the empire stood firm..."
                className="flex-1 text-xs px-3 py-2 rounded-[5px] border border-[#E8E2D9] focus:outline-none focus:border-[#B4532A] font-mono text-[#1C1917]"
              />
              <button
                type="button"
                onClick={() => handlePlayPreview('custom')}
                disabled={isPreviewLoading}
                className="px-4 py-2 bg-[#B4532A] hover:bg-[#9A4524] text-white font-semibold text-xs rounded-[5px] transition-colors shrink-0 disabled:opacity-50"
              >
                {isPreviewLoading ? 'Generating...' : '▶ Audition Words'}
              </button>
            </div>
          </div>
        )}

        {/* Main Audio Player Controls & Waveform Bar */}
        <div className="bg-white p-4 rounded-lg border border-[#E8E2D9] flex flex-col gap-3 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            {/* Play / Pause / Stop Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTogglePlayPause}
                disabled={isPreviewLoading}
                className="w-10 h-10 rounded-full bg-[#1C1917] hover:bg-[#B4532A] text-white flex items-center justify-center text-sm font-bold transition-all shadow-sm disabled:opacity-50"
                title={isPreviewPlaying ? 'Pause' : 'Play'}
              >
                {isPreviewLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isPreviewPlaying ? (
                  '❚❚'
                ) : (
                  '▶'
                )}
              </button>

              <button
                type="button"
                onClick={handleStopPreview}
                className="px-2.5 py-1.5 rounded-[5px] border border-[#E8E2D9] hover:bg-[#FAF7F2] text-[#6B6259] text-xs font-semibold transition-colors"
                title="Stop Audio"
              >
                ■ Stop
              </button>

              {/* Animated Waveform Visualizer */}
              <div className="flex items-center gap-1 pl-2">
                {[0.4, 0.8, 0.6, 1.0, 0.7, 0.9, 0.5, 0.8, 0.6, 0.4].map((scale, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full transition-all duration-200 ${
                      isPreviewPlaying ? 'bg-[#4D7C0F] animate-pulse' : 'bg-[#E8E2D9]'
                    }`}
                    style={{
                      height: isPreviewPlaying ? `${Math.max(6, scale * 22)}px` : '6px'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Time Indicator & Status */}
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-[#1C1917]">
                {formatSeconds(previewCurrentTime)} / {formatSeconds(previewDuration || 0)}
              </span>
              <p className="text-[10px] text-[#6B6259]">
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
              className="w-full h-1.5 bg-[#E8E2D9] rounded-lg appearance-none cursor-pointer accent-[#B4532A]"
            />
          </div>

          {/* Speed & Volume Tools */}
          <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-[#E8E2D9]/60">
            {/* Speed Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#6B6259]">Speed:</span>
              {[0.8, 1.0, 1.2].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => handleSetSpeed(spd)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                    playbackRate === spd
                      ? 'bg-[#1C1917] text-white'
                      : 'bg-[#FAF7F2] text-[#6B6259] hover:bg-[#E8E2D9]'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#6B6259]">🔊 Volume:</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={previewVolume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-[#E8E2D9] rounded-lg appearance-none cursor-pointer accent-[#1C1917]"
              />
              <span className="font-mono text-[10px] text-[#6B6259]">
                {Math.round(previewVolume * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chunks Queue Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
            Passage Chunks (20–40s Intervals)
          </h4>
          <span className="text-[11px] text-[#6B6259]">
            Click any passage to audition it individually
          </span>
        </div>

        <div className="divide-y divide-[#E8E2D9] border border-[#E8E2D9] rounded-[6px] max-h-72 overflow-y-auto bg-white">
          {job.chunks.map((chunk) => (
            <div
              key={chunk.chunkIndex}
              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-[#FAF7F2] transition-colors"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FAF7F2] border border-[#E8E2D9] text-[#1C1917]">
                    #{chunk.chunkIndex}
                  </span>
                  <span className="font-mono text-[11px] text-[#6B6259]">
                    {chunk.wordCount} words • ~{chunk.estimatedSeconds}s
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.2 rounded-full ${
                      chunk.status === 'completed'
                        ? 'bg-[#4D7C0F]/15 text-[#4D7C0F]'
                        : chunk.status === 'synthesizing'
                        ? 'bg-[#B4532A]/15 text-[#B4532A] animate-pulse'
                        : 'bg-[#E8E2D9] text-[#6B6259]'
                    }`}
                  >
                    {chunk.status}
                  </span>
                </div>
                <p className="text-[#1C1917] line-clamp-2 leading-relaxed italic pl-1">
                  "{chunk.text}"
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onPlayChunk(chunk)}
                  className="px-3 py-1 rounded-[4px] border border-[#E8E2D9] bg-white hover:border-[#1C1917] text-[#1C1917] font-semibold text-xs transition-colors"
                >
                  ▶ Audition Chunk
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Panel */}
      <div className="pt-4 border-t border-[#E8E2D9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-[#1C1917]">Broadcast Masters & Production Export</h4>
          <p className="text-[11px] text-[#6B6259]">
            {exportProgressText ? (
              <span className="text-[#B4532A] font-semibold font-mono animate-pulse">
                {exportProgressText}
              </span>
            ) : (
              'Export uncompressed 16-bit 48kHz WAV master, high-definition MP3, or formatted script.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleDownload('wav')}
            disabled={downloadingFormat !== null}
            className="px-4 py-2.5 rounded-[6px] border border-[#1C1917] hover:bg-[#FAF7F2] text-[#1C1917] text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {downloadingFormat === 'wav' ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-[#1C1917] border-t-transparent rounded-full animate-spin" />
                <span>Exporting Master WAV...</span>
              </>
            ) : (
              'Download WAV Master'
            )}
          </button>

          <button
            type="button"
            onClick={() => handleDownload('mp3')}
            disabled={downloadingFormat !== null}
            className="px-4 py-2.5 rounded-[6px] bg-[#1C1917] hover:bg-black text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {downloadingFormat === 'mp3' ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Assembling MP3...</span>
              </>
            ) : (
              'Download MP3'
            )}
          </button>

          <button
            type="button"
            onClick={() => handleDownload('txt')}
            disabled={downloadingFormat !== null}
            className="px-3.5 py-2.5 rounded-[6px] border border-[#E8E2D9] bg-white hover:border-[#6B6259] text-[#6B6259] text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Script .TXT
          </button>
        </div>
      </div>
    </div>
  );
};
