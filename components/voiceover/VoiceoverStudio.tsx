'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sliders, X, Volume2, Gauge } from 'lucide-react';
import { VoiceProfile, PronunciationRule, RenderJob, AudioChunk } from '@/lib/voiceover/types';
import { LAUNCH_VOICES } from '@/lib/voiceover/voices';
import { DEFAULT_PRONUNCIATION_LEXICON, applyPronunciationLexicon } from '@/lib/voiceover/lexicon';
import { chunkLongScript } from '@/lib/voiceover/chunker';
import { CastingRoom } from './CastingRoom';
import { PersistentPlayer } from './PersistentPlayer';
import { PronunciationModal } from './PronunciationModal';
import { RenderConsole } from './RenderConsole';

interface VoiceoverStudioProps {
  initialScript?: string;
  initialTopic?: string;
  onSendToArchitect?: (script: string) => void;
}

export const VoiceoverStudio: React.FC<VoiceoverStudioProps> = ({
  initialScript = '',
  initialTopic = 'Untitled Voiceover Project',
  onSendToArchitect
}) => {
  // Navigation & Sub-views
  const [activeView, setActiveView] = useState<'casting' | 'editor' | 'render'>('casting');
  const [projectName, setProjectName] = useState<string>(initialTopic);
  const [scriptText, setScriptText] = useState<string>(
    initialScript ||
      `In the Valley of Elah, Israel and the Philistines stood arrayed for war. Goliath, their colossal champion, emerged daily to taunt the trembling ranks.

A young shepherd named David, sent with provisions for his brothers, heard the giant’s defiance and refused to accept fear as the decree of destiny.

Stepping into the dry brook, David selected five smooth stones. With only his sling and unwavering faith, he advanced into history.`
  );

  // Voice Selection & Audio State
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile>(LAUNCH_VOICES[0]); // Adaeze
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activePlayingVoiceId, setActivePlayingVoiceId] = useState<string | null>(null);
  const [currentSpokenSnippet, setCurrentSpokenSnippet] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playerDuration, setPlayerDuration] = useState<number>(10);
  const [isPlayerOpen, setIsPlayerOpen] = useState<boolean>(false);

  // Pronunciation Lexicon & Delivery Settings (Synchronized from voiceover-studio CONTRACT.md)
  const [isLexiconOpen, setIsLexiconOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [lexiconRules, setLexiconRules] = useState<PronunciationRule[]>(DEFAULT_PRONUNCIATION_LEXICON);
  const [speed, setSpeed] = useState<number>(1.0);
  const [sentencePauseMs, setSentencePauseMs] = useState<number>(300);
  const [paragraphPauseMs, setParagraphPauseMs] = useState<number>(600);
  const [sectionPauseMs, setSectionPauseMs] = useState<number>(1200);
  const [loudnessLufs, setLoudnessLufs] = useState<-16 | -14>(-16);

  // Render Pipeline & Chunks
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderJob, setRenderJob] = useState<RenderJob | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setScriptText(text);
        if (!projectName || projectName === 'Untitled Voiceover Project' || projectName.includes('David vs Goliath')) {
          const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
          setProjectName(cleanName);
        }
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Update chunks when script or settings change
  useEffect(() => {
    const effectiveWpm = Math.round(140 * speed);
    const rawChunks = chunkLongScript(scriptText, {
      targetChunkSeconds: 25,
      wpm: effectiveWpm,
      paragraphPauseMs
    });

    const totalWords = scriptText.split(/\s+/).filter(Boolean).length;
    const estSeconds = Math.round((totalWords / effectiveWpm) * 60);

    setRenderJob({
      id: Date.now().toString(),
      projectName,
      voiceId: selectedVoice.id,
      voiceName: selectedVoice.name,
      totalWords,
      estimatedDurationSeconds: estSeconds,
      chunks: rawChunks,
      progressPercent: 0,
      etaSeconds: estSeconds,
      status: 'idle'
    });
  }, [scriptText, projectName, selectedVoice, paragraphPauseMs, speed, sentencePauseMs, sectionPauseMs]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fallback to browser SpeechSynthesis if offline/network fails
  const fallbackBrowserSpeech = (processedText: string, voice: VoiceProfile) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const utterance = new SpeechSynthesisUtterance(processedText);
    utterance.pitch = voice.pitch;
    utterance.rate = Math.max(0.5, Math.min(2.0, voice.rate * speed));

    const voices = window.speechSynthesis.getVoices();
    // Prioritize correct gender in fallback
    const genderMatch = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (voice.voiceGender === 'male'
          ? v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('guy') || v.name.toLowerCase().includes('george')
          : v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('susan') || v.name.toLowerCase().includes('jenny'))
    );

    if (genderMatch) {
      utterance.voice = genderMatch;
    }

    utterance.onend = () => {
      setIsPlaying(false);
      setActivePlayingVoiceId(null);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setActivePlayingVoiceId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Primary Speech Handler: Plays authentic broadcast Neural MP3 via /api/tts
  const playSpeech = async (text: string, voice: VoiceProfile) => {
    handleStopAudio();

    const processedText = applyPronunciationLexicon(text, lexiconRules);

    setIsPlaying(true);
    setActivePlayingVoiceId(voice.id);
    setCurrentSpokenSnippet(processedText);
    setIsPlayerOpen(true);
    setCurrentTime(0);

    try {
      console.log(`[VoiceoverStudio] Requesting neural audio for ${voice.name} (${voice.categoryLabel})...`);
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: processedText,
          voiceId: voice.id
        })
      });

      if (!response.ok) {
        throw new Error(`TTS server responded with status ${response.status}`);
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        setPlayerDuration(Math.ceil(audio.duration || 6));
      };

      audio.ontimeupdate = () => {
        setCurrentTime(Math.floor(audio.currentTime));
      };

      audio.onended = () => {
        setIsPlaying(false);
        setActivePlayingVoiceId(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (e) => {
        console.warn('Audio element error, falling back to browser speech:', e);
        fallbackBrowserSpeech(processedText, voice);
      };

      await audio.play();
    } catch (err: any) {
      console.warn('Neural TTS fetch failed, switching to local speech fallback:', err.message);
      fallbackBrowserSpeech(processedText, voice);
    }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setActivePlayingVoiceId(null);
  };

  // Start batch synthesis pipeline across chunks
  const handleStartRender = async () => {
    if (!renderJob) return;
    setIsRendering(true);

    const updatedChunks = [...renderJob.chunks];
    const total = updatedChunks.length;

    for (let i = 0; i < total; i++) {
      updatedChunks[i].status = 'synthesizing';
      setRenderJob((prev) => prev ? {
        ...prev,
        chunks: [...updatedChunks],
        progressPercent: Math.round(((i + 0.3) / total) * 100),
        status: 'rendering'
      } : null);

      try {
        const processedChunkText = applyPronunciationLexicon(updatedChunks[i].text, lexiconRules);
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: processedChunkText,
            voiceId: selectedVoice.id
          })
        });

        if (res.ok) {
          const blob = await res.blob();
          updatedChunks[i].audioBlob = blob;
          updatedChunks[i].audioUrl = URL.createObjectURL(blob);
        }
      } catch (err) {
        console.warn(`[VoiceoverStudio] Chunk #${i + 1} synthesis fallback:`, err);
      }

      updatedChunks[i].status = 'completed';
      setRenderJob((prev) => prev ? {
        ...prev,
        chunks: [...updatedChunks],
        progressPercent: Math.round(((i + 1) / total) * 100),
        etaSeconds: Math.max(0, Math.round((total - (i + 1)) * 1.2)),
        status: i === total - 1 ? 'completed' : 'rendering'
      } : null);
    }

    setIsRendering(false);
  };

  const playChunkAudio = (chunk: AudioChunk) => {
    if (chunk.audioUrl) {
      handleStopAudio();
      setIsPlaying(true);
      setActivePlayingVoiceId(selectedVoice.id);
      setCurrentSpokenSnippet(chunk.text);
      setIsPlayerOpen(true);
      setCurrentTime(0);

      const audio = new Audio(chunk.audioUrl);
      audioRef.current = audio;
      audio.onloadedmetadata = () => {
        setPlayerDuration(Math.ceil(audio.duration || chunk.estimatedSeconds));
      };
      audio.ontimeupdate = () => {
        setCurrentTime(Math.floor(audio.currentTime));
      };
      audio.onended = () => {
        setIsPlaying(false);
        setActivePlayingVoiceId(null);
      };
      audio.play().catch(console.error);
    } else {
      playSpeech(chunk.text, selectedVoice);
    }
  };

  return (
    <div className="bg-[#FAF7F2] text-[#1C1917] min-h-[85vh] rounded-2xl p-6 sm:p-10 space-y-8 border border-[#E8E2D9] shadow-sm font-sans">
      {/* Studio Top Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E2D9] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-[4px] bg-[#B4532A]/10 text-[#B4532A] font-bold border border-[#B4532A]/30">
              Voiceover Studio v1.0
            </span>
            <span className="text-[11px] font-mono text-[#4D7C0F]">
              ● 100% Local / Zero Cloud API
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] tracking-tight mt-1">
            Editorial Voice Production
          </h1>
          <p className="text-xs text-[#6B6259] mt-0.5">
            Turn long-form scripts into broadcast-quality narration with Nigerian & international voice talents.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-[6px] bg-white p-1 border border-[#E8E2D9]">
            <button
              type="button"
              onClick={() => setActiveView('casting')}
              className={`px-3.5 py-1.5 rounded-[4px] text-xs font-semibold transition-all ${
                activeView === 'casting'
                  ? 'bg-[#B4532A] text-white shadow-sm'
                  : 'text-[#6B6259] hover:text-[#1C1917]'
              }`}
            >
              The Casting Room ({LAUNCH_VOICES.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveView('editor')}
              className={`px-3.5 py-1.5 rounded-[4px] text-xs font-semibold transition-all ${
                activeView === 'editor'
                  ? 'bg-[#B4532A] text-white shadow-sm'
                  : 'text-[#6B6259] hover:text-[#1C1917]'
              }`}
            >
              Script & Cadence
            </button>

            <button
              type="button"
              onClick={() => setActiveView('render')}
              className={`px-3.5 py-1.5 rounded-[4px] text-xs font-semibold transition-all ${
                activeView === 'render'
                  ? 'bg-[#B4532A] text-white shadow-sm'
                  : 'text-[#6B6259] hover:text-[#1C1917]'
              }`}
            >
              Production Console
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsLexiconOpen(true)}
            className="px-3 py-1.5 rounded-[6px] border border-[#E8E2D9] bg-white hover:border-[#6B6259] text-xs font-semibold text-[#1C1917] transition-colors"
          >
            Lexicon ({lexiconRules.length})
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="px-3 py-1.5 rounded-[6px] border border-[#E8E2D9] bg-white hover:border-[#6B6259] text-xs font-semibold text-[#1C1917] transition-colors flex items-center gap-1.5"
            title="Configure pause timings, speech speed, and broadcast loudness"
          >
            <Sliders className="w-3.5 h-3.5 text-[#B4532A]" />
            <span>Audio Settings</span>
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: The Casting Room */}
      {activeView === 'casting' && (
        <CastingRoom
          selectedVoice={selectedVoice}
          onSelectVoice={(voice) => {
            setSelectedVoice(voice);
            setActiveView('editor');
          }}
          onPlaySample={(text, voice) => playSpeech(text, voice)}
          isPlaying={isPlaying}
          activePlayingVoiceId={activePlayingVoiceId}
        />
      )}

      {/* SUB-VIEW 2: Script Editor */}
      {activeView === 'editor' && (
        <div className="bg-white border border-[#E8E2D9] rounded-[8px] p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D9] pb-4">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#B4532A] font-semibold">
                Narrative Blueprint
              </span>
              <h3 className="text-xl font-serif font-bold text-[#1C1917]">
                Script & Teleprompter
              </h3>
              <p className="text-xs text-[#6B6259]">
                Narrator Assigned:{' '}
                <strong className="text-[#B4532A]">{selectedVoice.name}</strong> ({selectedVoice.accent})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => playSpeech(scriptText.slice(0, 180), selectedVoice)}
                className="px-3.5 py-1.5 rounded-[6px] border border-[#1C1917] text-xs font-semibold text-[#1C1917] hover:bg-[#FAF7F2] transition-colors"
              >
                ▶ Listen First Passage
              </button>

              {onSendToArchitect && (
                <button
                  type="button"
                  onClick={() => onSendToArchitect(scriptText)}
                  className="px-3.5 py-1.5 rounded-[6px] bg-[#1C1917] hover:bg-black text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors shadow-sm"
                  title="Send this script to Storyboard Architect to generate visual scenes"
                >
                  ⚡ Send to Storyboard Architect
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveView('render')}
                className="px-4 py-1.5 rounded-[6px] bg-[#B4532A] hover:bg-[#9A4524] text-white text-xs font-semibold transition-colors"
              >
                Proceed to Render Console →
              </button>
            </div>
          </div>

          {/* Project Title Input & File Import */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#1C1917]">Project / Story Name</label>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".txt,.md,.text"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs px-2.5 py-1 rounded-[4px] border border-[#B4532A] text-[#B4532A] hover:bg-[#B4532A]/10 font-medium transition-colors flex items-center gap-1.5"
                  title="Import a .txt or .md script from your computer"
                >
                  <span>📁 Import Script (.txt, .md)</span>
                </button>
              </div>
            </div>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full text-sm font-serif font-bold p-2.5 rounded-[6px] border border-[#E8E2D9] bg-[#FAF7F2] text-[#1C1917]"
            />
          </div>

          {/* Script Text Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[#6B6259]">
              <span>Script Text (Paragraphs create natural 600ms pauses)</span>
              <span className="font-mono">
                {scriptText.split(/\s+/).filter(Boolean).length} words • ~
                {Math.round((scriptText.split(/\s+/).filter(Boolean).length / 140) * 60)}s audio
              </span>
            </div>
            <textarea
              rows={12}
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              className="w-full p-4 rounded-[6px] border border-[#E8E2D9] bg-white font-mono text-xs leading-relaxed text-[#1C1917] focus:outline-none focus:border-[#B4532A] shadow-inner"
            />
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Render Console */}
      {activeView === 'render' && (
        <RenderConsole
          job={renderJob}
          voice={selectedVoice}
          availableVoices={LAUNCH_VOICES}
          onSelectVoice={(v) => {
            setSelectedVoice(v);
            if (renderJob) {
              setRenderJob((prev) =>
                prev
                  ? {
                      ...prev,
                      voiceId: v.id,
                      voiceName: v.name
                    }
                  : null
              );
            }
          }}
          isRendering={isRendering}
          onStartRender={handleStartRender}
          onPauseRender={() => setIsRendering(false)}
          onPlayChunk={playChunkAudio}
          lexiconRules={lexiconRules}
        />
      )}

      {/* Pronunciation Lexicon Modal */}
      <PronunciationModal
        isOpen={isLexiconOpen}
        onClose={() => setIsLexiconOpen(false)}
        rules={lexiconRules}
        onAddRule={(rule) => setLexiconRules((prev) => [...prev, rule])}
        onDeleteRule={(id) => setLexiconRules((prev) => prev.filter((r) => r.id !== id))}
        paragraphPauseMs={paragraphPauseMs}
        onUpdatePause={setParagraphPauseMs}
      />

      {/* Floating Persistent Audio Player */}
      {isPlayerOpen && (
        <PersistentPlayer
          voice={selectedVoice}
          textSnippet={currentSpokenSnippet}
          isPlaying={isPlaying}
          onTogglePlay={() => {
            if (isPlaying) {
              handleStopAudio();
            } else if (currentSpokenSnippet) {
              playSpeech(currentSpokenSnippet, selectedVoice);
            }
          }}
          onStop={handleStopAudio}
          onClose={() => {
            handleStopAudio();
            setIsPlayerOpen(false);
          }}
          currentTime={currentTime}
          duration={playerDuration}
        />
      )}

      {/* Audio Delivery & Cadence Settings Modal (Synchronized from voiceover-studio/CONTRACT.md) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#FAF7F2] border border-[#E8E2D9] rounded-[10px] w-full max-w-lg p-6 shadow-2xl space-y-6 text-[#1C1917]">
            <div className="flex items-center justify-between border-b border-[#E8E2D9] pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#B4532A]" />
                <h3 className="font-serif font-bold text-lg">Audio Delivery & Cadence Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-[#6B6259] hover:text-[#1C1917] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Speed Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-[#B4532A]" />
                    Speech Rate (Speed Multiplier)
                  </span>
                  <span className="font-mono text-[#B4532A]">{speed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#E8E2D9] rounded-lg appearance-none cursor-pointer accent-[#B4532A]"
                />
                <div className="flex justify-between text-[10px] text-[#6B6259]">
                  <span>0.50x (Slow / Deliberate)</span>
                  <span>1.00x (Standard)</span>
                  <span>2.00x (Brisk)</span>
                </div>
              </div>

              {/* Pause Timings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="font-semibold block">Sentence Pause</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="3000"
                      step="50"
                      value={sentencePauseMs}
                      onChange={(e) => setSentencePauseMs(parseInt(e.target.value, 10) || 0)}
                      className="w-full p-2 border border-[#E8E2D9] rounded-[4px] bg-white font-mono text-center text-xs"
                    />
                    <span className="text-[#6B6259]">ms</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold block">Paragraph Pause</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="5000"
                      step="100"
                      value={paragraphPauseMs}
                      onChange={(e) => setParagraphPauseMs(parseInt(e.target.value, 10) || 0)}
                      className="w-full p-2 border border-[#E8E2D9] rounded-[4px] bg-white font-mono text-center text-xs"
                    />
                    <span className="text-[#6B6259]">ms</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold block">Section Pause</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      step="200"
                      value={sectionPauseMs}
                      onChange={(e) => setSectionPauseMs(parseInt(e.target.value, 10) || 0)}
                      className="w-full p-2 border border-[#E8E2D9] rounded-[4px] bg-white font-mono text-center text-xs"
                    />
                    <span className="text-[#6B6259]">ms</span>
                  </div>
                </div>
              </div>

              {/* Broadcast Loudness */}
              <div className="space-y-1.5 pt-2 border-t border-[#E8E2D9]">
                <label className="font-semibold flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-[#B4532A]" />
                  Broadcast Target Loudness
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLoudnessLufs(-16)}
                    className={`p-3 rounded-[6px] border text-left transition-all ${
                      loudnessLufs === -16
                        ? 'border-[#B4532A] bg-[#B4532A]/10 font-bold'
                        : 'border-[#E8E2D9] bg-white'
                    }`}
                  >
                    <div className="font-mono text-sm text-[#1C1917]">-16 LUFS</div>
                    <div className="text-[10px] text-[#6B6259]">EBU R128 / Podcast Standard</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLoudnessLufs(-14)}
                    className={`p-3 rounded-[6px] border text-left transition-all ${
                      loudnessLufs === -14
                        ? 'border-[#B4532A] bg-[#B4532A]/10 font-bold'
                        : 'border-[#E8E2D9] bg-white'
                    }`}
                  >
                    <div className="font-mono text-sm text-[#1C1917]">-14 LUFS</div>
                    <div className="text-[10px] text-[#6B6259]">YouTube & Streaming Media</div>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E8E2D9]">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-5 py-2 bg-[#B4532A] hover:bg-[#9A4524] text-white text-xs font-semibold rounded-[6px] transition-colors"
              >
                Save & Apply Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
