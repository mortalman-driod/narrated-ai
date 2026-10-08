'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sliders, X, Volume2, Gauge, Mic, Sparkles, FolderUp, Film, Check, Radio } from 'lucide-react';
import { VoiceProfile, PronunciationRule, RenderJob, AudioChunk } from '@/lib/voiceover/types';
import { LAUNCH_VOICES } from '@/lib/voiceover/voices';
import { DEFAULT_PRONUNCIATION_LEXICON, applyPronunciationLexicon } from '@/lib/voiceover/lexicon';
import { chunkLongScript } from '@/lib/voiceover/chunker';
import { CastingRoom } from './CastingRoom';
import { PersistentPlayer } from './PersistentPlayer';
import { PronunciationModal } from './PronunciationModal';
import { RenderConsole } from './RenderConsole';
import { SlideTabs } from '@/components/ui/SlideTabs';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { SoundWaveVisualizer } from '@/components/ui/SoundWaveVisualizer';
import { Card3D } from '@/components/ui/Card3D';

interface VoiceoverStudioProps {
  initialScript?: string;
  initialTopic?: string;
  onSendToArchitect?: (script: string) => void;
  onScriptChange?: (script: string) => void;
  onVoiceChange?: (voice: VoiceProfile) => void;
  currentVoice?: VoiceProfile;
}

export const VoiceoverStudio: React.FC<VoiceoverStudioProps> = ({
  initialScript = '',
  initialTopic = 'Untitled Voiceover Project',
  onSendToArchitect,
  onScriptChange,
  onVoiceChange,
  currentVoice
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

  // Synchronize scriptText when initialScript changes from parent
  useEffect(() => {
    if (initialScript && initialScript !== scriptText) {
      setScriptText(initialScript);
    }
  }, [initialScript]);

  // Synchronize projectName when initialTopic changes from parent
  useEffect(() => {
    if (initialTopic && initialTopic !== projectName) {
      setProjectName(initialTopic);
    }
  }, [initialTopic]);

  // Voice Selection & Audio State
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile>(currentVoice || LAUNCH_VOICES[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activePlayingVoiceId, setActivePlayingVoiceId] = useState<string | null>(null);
  const [currentSpokenSnippet, setCurrentSpokenSnippet] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playerDuration, setPlayerDuration] = useState<number>(10);
  const [isPlayerOpen, setIsPlayerOpen] = useState<boolean>(false);
  const [isDictating, setIsDictating] = useState<boolean>(false);

  // Pronunciation Lexicon & Delivery Settings
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

  const handleScriptChange = (newText: string) => {
    setScriptText(newText);
    onScriptChange?.(newText);
  };

  const handleVoiceSelect = (voice: VoiceProfile) => {
    setSelectedVoice(voice);
    onVoiceChange?.(voice);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        handleScriptChange(text);
        if (!projectName || projectName === 'Untitled Voiceover Project' || projectName.includes('David vs Goliath')) {
          const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
          setProjectName(cleanName);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Mic dictation using Web Speech API
  const toggleDictation = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type or paste your script.');
      return;
    }

    if (isDictating) {
      setIsDictating(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsDictating(true);
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
        if (transcript) {
          const updated = scriptText ? scriptText.trim() + ' ' + transcript.trim() : transcript.trim();
          handleScriptChange(updated);
        }
      };
      recognition.onerror = () => setIsDictating(false);
      recognition.onend = () => setIsDictating(false);
      recognition.start();
    } catch {
      setIsDictating(false);
    }
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

  // Primary Speech Handler
  const playSpeech = async (text: string, voice: VoiceProfile) => {
    handleStopAudio();

    const processedText = applyPronunciationLexicon(text, lexiconRules);

    setIsPlaying(true);
    setActivePlayingVoiceId(voice.id);
    setCurrentSpokenSnippet(processedText);
    setIsPlayerOpen(true);
    setCurrentTime(0);

    try {
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
      setRenderJob((prev) =>
        prev
          ? {
              ...prev,
              chunks: [...updatedChunks],
              progressPercent: Math.round(((i + 0.3) / total) * 100),
              status: 'rendering'
            }
          : null
      );

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
      setRenderJob((prev) =>
        prev
          ? {
              ...prev,
              chunks: [...updatedChunks],
              progressPercent: Math.round(((i + 1) / total) * 100),
              etaSeconds: Math.max(0, Math.round((total - (i + 1)) * 1.2)),
              status: i === total - 1 ? 'completed' : 'rendering'
            }
          : null
      );
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

  const wordCount = scriptText.split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.round((wordCount / (140 * speed)) * 60);

  return (
    <div className="bg-[#02050E]/90 text-slate-100 min-h-[85vh] rounded-3xl p-6 sm:p-8 space-y-6 border border-white/[0.08] shadow-2xl backdrop-blur-2xl">
      {/* Studio Top Navigation Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30 shadow-sm">
              Voiceover Studio Suite
            </span>
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>100% Neural / Zero Cloud API</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
            <span>Broadcast Voice Production</span>
            <Sparkles className="w-5 h-5 text-amber-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronized long-form audio narration with authentic Nigerian & global voice actors.
          </p>
        </div>

        {/* View Switcher Tabs & Tools */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sliding Navigation Tabs */}
          <SlideTabs
            tabs={[
              { id: 'casting', label: `Casting Room (${LAUNCH_VOICES.length})`, icon: <Mic className="w-3.5 h-3.5 text-amber-300" /> },
              { id: 'editor', label: 'Script & Cadence', icon: <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> },
              { id: 'render', label: 'Production Console', icon: <Radio className="w-3.5 h-3.5 text-emerald-400" /> }
            ]}
            activeId={activeView}
            onChange={(id) => setActiveView(id as any)}
            layoutId="voiceover-nav-indicator"
            indicatorClassName="bg-gradient-to-r from-[#B4532A] to-amber-600 shadow-glow-amber/30"
          />

          {/* Lexicon Trigger */}
          <AnimatedButton
            type="button"
            variant="secondary"
            onClick={() => setIsLexiconOpen(true)}
            className="text-xs px-3 py-1.5"
          >
            Lexicon ({lexiconRules.length})
          </AnimatedButton>

          {/* Settings Trigger */}
          <AnimatedButton
            type="button"
            variant="secondary"
            onClick={() => setIsSettingsOpen(true)}
            icon={<Sliders className="w-3.5 h-3.5 text-amber-400" />}
            className="text-xs px-3 py-1.5"
            title="Configure pause timings, speech speed, and broadcast loudness"
          >
            Audio Settings
          </AnimatedButton>
        </div>
      </div>

      {/* SUB-VIEW 1: The Casting Room */}
      {activeView === 'casting' && (
        <CastingRoom
          selectedVoice={selectedVoice}
          onSelectVoice={(voice) => {
            handleVoiceSelect(voice);
            setActiveView('editor');
          }}
          onPlaySample={(text, voice) => playSpeech(text, voice)}
          isPlaying={isPlaying}
          activePlayingVoiceId={activePlayingVoiceId}
        />
      )}

      {/* SUB-VIEW 2: Script & Cadence Editor */}
      {activeView === 'editor' && (
        <Card3D maxTilt={2} glare={false}>
          <div className="bg-[#030714]/90 border border-white/[0.08] rounded-2xl p-6 sm:p-7 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/25">
                  Synchronized Teleprompter
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Script & Acoustic Cadence
                </h3>
                <p className="text-xs text-slate-400">
                  Assigned Narrator:{' '}
                  <strong className="text-amber-300">{selectedVoice.name}</strong> ({selectedVoice.accent}) •{' '}
                  <span className="text-emerald-400 font-mono">Paced at ~140 WPM</span>
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <AnimatedButton
                  type="button"
                  variant="secondary"
                  onClick={() => playSpeech(scriptText.slice(0, 180), selectedVoice)}
                  icon={<Volume2 className="w-3.5 h-3.5 text-amber-300" />}
                  className="text-xs px-3 py-1.5"
                >
                  Listen Opening
                </AnimatedButton>

                {onSendToArchitect && (
                  <AnimatedButton
                    type="button"
                    variant="cyber"
                    shimmer={true}
                    onClick={() => onSendToArchitect(scriptText)}
                    icon={<Film className="w-3.5 h-3.5 text-cyan-300" />}
                    className="text-xs px-3.5 py-1.5 font-bold"
                    title="Send this script to Storyboard Architect to generate synchronized visual scenes"
                  >
                    Sync to Storyboard Architect
                  </AnimatedButton>
                )}

                <AnimatedButton
                  type="button"
                  variant="primary"
                  onClick={() => setActiveView('render')}
                  className="text-xs px-4 py-1.5 font-bold"
                >
                  Proceed to Console →
                </AnimatedButton>
              </div>
            </div>

            {/* Project Title Input & File Import */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200">Project / Storyline Title</label>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".txt,.md,.text"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <AnimatedButton
                    type="button"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    icon={<FolderUp className="w-3.5 h-3.5 text-amber-400" />}
                    className="text-xs px-2.5 py-1 text-slate-300 hover:text-white"
                  >
                    Import .txt / .md
                  </AnimatedButton>
                </div>
              </div>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full text-sm font-sans font-bold p-3 rounded-xl border border-white/[0.08] bg-black/50 text-white focus:outline-none focus:border-amber-400 shadow-inner"
              />
            </div>

            {/* Script Text Area with Live Dictation & Counter */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
                <div className="flex items-center gap-3">
                  <span>Script Text (Paragraphs form 600ms boundary pauses)</span>
                  <AnimatedButton
                    type="button"
                    variant={isDictating ? 'danger' : 'secondary'}
                    onClick={toggleDictation}
                    icon={<Mic className={`w-3 h-3 ${isDictating ? 'text-white' : 'text-rose-400'}`} />}
                    className="text-[11px] px-2.5 py-1"
                  >
                    {isDictating ? 'Listening...' : 'Dictate with Mic'}
                  </AnimatedButton>
                  {isDictating && <SoundWaveVisualizer isPlaying={true} barCount={6} color="from-rose-400 to-amber-400" />}
                </div>
                <span className="font-mono text-amber-300">
                  {wordCount} words • ~{estimatedSeconds}s spoken audio
                </span>
              </div>
              <textarea
                rows={12}
                value={scriptText}
                onChange={(e) => handleScriptChange(e.target.value)}
                placeholder="Type, paste, or dictate your voiceover script here..."
                className="w-full p-4 rounded-2xl border border-white/[0.08] bg-black/60 font-sans text-sm leading-relaxed text-white focus:outline-none focus:border-amber-400 shadow-inner resize-y"
              />
            </div>

            {/* Stat Pill Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-black/40 border border-white/[0.08] rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Word Count</div>
                <div className="text-base font-bold text-white font-mono mt-0.5">{wordCount}</div>
              </div>
              <div className="bg-black/40 border border-white/[0.08] rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Spoken Duration</div>
                <div className="text-base font-bold text-amber-300 font-mono mt-0.5">~{estimatedSeconds}s</div>
              </div>
              <div className="bg-black/40 border border-white/[0.08] rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Assigned Voice</div>
                <div className="text-sm font-bold text-cyan-300 truncate mt-0.5">{selectedVoice.name}</div>
              </div>
              <div className="bg-black/40 border border-white/[0.08] rounded-xl p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Acoustic Cadence</div>
                <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">{speed}x Speed</div>
              </div>
            </div>
          </div>
        </Card3D>
      )}

      {/* SUB-VIEW 3: Production Render Console */}
      {activeView === 'render' && (
        <RenderConsole
          job={renderJob}
          voice={selectedVoice}
          availableVoices={LAUNCH_VOICES}
          onSelectVoice={(v) => {
            handleVoiceSelect(v);
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

      {/* Audio Delivery & Cadence Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#030714] border border-white/[0.1] rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl space-y-6 text-white">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-lg">Audio Delivery & Cadence Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Speed Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-amber-400" />
                    Speech Rate (Speed Multiplier)
                  </span>
                  <span className="font-mono text-amber-300">{speed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0.50x (Slow / Deliberate)</span>
                  <span>1.00x (Broadcast Standard)</span>
                  <span>2.00x (Brisk)</span>
                </div>
              </div>

              {/* Pause Timings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="font-semibold block text-slate-300">Sentence Pause</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="3000"
                      step="50"
                      value={sentencePauseMs}
                      onChange={(e) => setSentencePauseMs(parseInt(e.target.value, 10) || 0)}
                      className="w-full p-2 border border-white/[0.08] rounded-xl bg-black/60 font-mono text-center text-xs text-white"
                    />
                    <span className="text-slate-400">ms</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold block text-slate-300">Paragraph Pause</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="5000"
                      step="100"
                      value={paragraphPauseMs}
                      onChange={(e) => setParagraphPauseMs(parseInt(e.target.value, 10) || 0)}
                      className="w-full p-2 border border-white/[0.08] rounded-xl bg-black/60 font-mono text-center text-xs text-white"
                    />
                    <span className="text-slate-400">ms</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold block text-slate-300">Section Pause</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="10000"
                      step="200"
                      value={sectionPauseMs}
                      onChange={(e) => setSectionPauseMs(parseInt(e.target.value, 10) || 0)}
                      className="w-full p-2 border border-white/[0.08] rounded-xl bg-black/60 font-mono text-center text-xs text-white"
                    />
                    <span className="text-slate-400">ms</span>
                  </div>
                </div>
              </div>

              {/* Broadcast Loudness */}
              <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                <label className="font-semibold flex items-center gap-1.5 text-slate-200">
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  Broadcast Target Loudness
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLoudnessLufs(-16)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      loudnessLufs === -16
                        ? 'border-amber-400 bg-amber-500/15 font-bold shadow-sm'
                        : 'border-white/[0.08] bg-black/40 text-slate-300'
                    }`}
                  >
                    <div className="font-mono text-sm text-white">-16 LUFS</div>
                    <div className="text-[10px] text-slate-400">EBU R128 / Podcast Standard</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLoudnessLufs(-14)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      loudnessLufs === -14
                        ? 'border-amber-400 bg-amber-500/15 font-bold shadow-sm'
                        : 'border-white/[0.08] bg-black/40 text-slate-300'
                    }`}
                  >
                    <div className="font-mono text-sm text-white">-14 LUFS</div>
                    <div className="text-[10px] text-slate-400">YouTube & Streaming Video</div>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/[0.08]">
              <AnimatedButton
                type="button"
                variant="cyber"
                onClick={() => setIsSettingsOpen(false)}
                className="px-5 py-2 font-bold"
              >
                Save & Apply Settings
              </AnimatedButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
