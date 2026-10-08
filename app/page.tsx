'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Film,
  Download,
  Table as TableIcon,
  LayoutGrid,
  Zap,
  SlidersHorizontal,
  Compass,
  Layers,
  ChevronDown,
  ChevronUp,
  Mic,
  Clock,
  UserCheck,
  Image as ImageIcon,
  Check,
  Volume2,
  CheckCircle2,
  Radio
} from 'lucide-react';
import { TONE_OPTIONS, IMAGE_MODELS } from '@/lib/presets';
import { DurationSlider } from '@/components/DurationSlider';
import { NicheSelector } from '@/components/NicheCard';
import { SceneCard } from '@/components/SceneCard';
import { StoryboardTable } from '@/components/StoryboardTable';
import { ExportModal } from '@/components/ExportModal';
import { ProgressTracker } from '@/components/ProgressTracker';
import { FullVoiceoverScript } from '@/components/FullVoiceoverScript';
import { CharacterModelSheet } from '@/components/CharacterModelSheet';
import { VoiceoverStudio } from '@/components/voiceover/VoiceoverStudio';
import { StoryboardResponse, ProgressUpdate } from '@/lib/generator/types';
import { LAUNCH_VOICES } from '@/lib/voiceover/voices';
import { VoiceProfile } from '@/lib/voiceover/types';
import { ThreeDCanvas } from '@/components/ui/ThreeDCanvas';
import { Card3D } from '@/components/ui/Card3D';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { SlideTabs } from '@/components/ui/SlideTabs';
import { SoundWaveVisualizer } from '@/components/ui/SoundWaveVisualizer';

export default function DashboardPage() {
  // Navigation: Instant seamless switching between Prompt Architect and Voiceover Studio (both stay mounted in DOM!)
  const [activeTab, setActiveTab] = useState<'architect' | 'voiceover'>('architect');

  // Input & Project State
  const [topic, setTopic] = useState('David vs Goliath: The Valley of Elah & The Anatomy of Divine Faith');
  const [duration, setDuration] = useState(60);
  const [nicheId, setNicheId] = useState('bible-stories');
  const [tone, setTone] = useState('authoritative');
  const [imageModel, setImageModel] = useState<'flux' | 'midjourney' | 'runway'>('flux');
  const [engineMode, setEngineMode] = useState<'cloud' | 'offline'>('cloud');

  // Synchronized Voice Talent State
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile>(LAUNCH_VOICES[0]);

  // Synchronized Master Script (Shared real-time between Architect & Voiceover Studio)
  const [sharedScript, setSharedScript] = useState<string>(
    `In the Valley of Elah, Israel and the Philistines stood locked in standoff. Goliath, their colossal champion, stepped out into the dust to taunt the trembling ranks.

A young shepherd named David, bearing grain for his brothers, refused to surrender faith to fear.

Reaching into the dry brook, he selected five smooth stones. With only his sling and divine conviction, he stepped into history.`
  );

  // Input Mode in Prompt Architect: 'premise' (generate narrative from premise) vs 'voiceover' (input existing voiceover narration)
  const [inputMode, setInputMode] = useState<'premise' | 'voiceover'>('premise');
  const [isDictating, setIsDictating] = useState(false);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressUpdate>({
    stage: 'outline',
    percent: 0,
    message: ''
  });
  const [storyboard, setStoryboard] = useState<StoryboardResponse | null>(null);
  const [storyboardViewTab, setStoryboardViewTab] = useState<'voiceover' | 'visuals' | 'timeline'>('voiceover');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [showOutline, setShowOutline] = useState(false);

  // Computed metrics for real-time script & duration synchronization
  const isDirectVoiceover = inputMode === 'voiceover';
  const effectiveText = (isDirectVoiceover ? sharedScript : topic).trim();
  const inputWords = effectiveText ? effectiveText.split(/\s+/).filter(Boolean).length : 0;
  const isScript = isDirectVoiceover || (inputWords >= 20 && ((effectiveText.match(/[.!?]/g) || []).length >= 2 || effectiveText.includes('\n')));
  const calculatedDuration = Math.max(15, Math.round(inputWords / 2.3));
  const effectiveDuration = isScript ? calculatedDuration : duration;
  const estimatedScenes = Math.max(2, Math.round(effectiveDuration / 7.5));

  // Voice dictation using browser Web Speech API
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
          setSharedScript((prev) => (prev ? prev.trim() + ' ' + transcript.trim() : transcript.trim()));
        }
      };
      recognition.onerror = () => setIsDictating(false);
      recognition.onend = () => setIsDictating(false);
      recognition.start();
    } catch {
      setIsDictating(false);
    }
  };

  // Trigger Generation
  const handleGenerate = async (forceOffline: boolean = false) => {
    const modeToUse = forceOffline ? 'offline' : engineMode;
    setIsGenerating(true);
    setProgress({
      stage: 'outline',
      percent: 15,
      message: modeToUse === 'offline'
        ? (isScript ? `Partitioning ${inputWords}-word script into ${estimatedScenes} visual scenes (0 API)...` : 'Synthesizing offline procedural narrative & character model...')
        : (isScript ? `Connecting to Gemini to segment script into ${estimatedScenes} scenes...` : 'Connecting to Gemini AI Engine...')
    });

    try {
      const finalTopic = isDirectVoiceover
        ? (effectiveText.split('\n')[0].replace(/[.!?]/g, '').trim().slice(0, 60) || 'Custom Voiceover Story')
        : topic;

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: finalTopic,
          target_duration_seconds: effectiveDuration,
          niche: nicheId,
          tone,
          image_model: imageModel,
          engine_mode: modeToUse,
          is_script_input: isScript,
          script: isScript ? effectiveText : undefined
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      setStoryboard(data.storyboard);
      // Synchronize full script to Voiceover Studio
      if (data.storyboard?.full_script) {
        setSharedScript(data.storyboard.full_script);
      }

      setProgress({
        stage: 'complete',
        percent: 100,
        message: modeToUse === 'offline'
          ? 'Offline generation complete (0 APIs used)!'
          : 'Gemini storyboard generation complete!'
      });

      // Celebratory confetti burst
      try {
        confetti({
          particleCount: 110,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#06B6D4', '#3B82F6', '#A855F7', '#F59E0B', '#10B981', '#F43F5E']
        });
      } catch {}
    } catch (err: any) {
      alert(`Error generating storyboard: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020408] text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 3D Perspective Constellation Background */}
      <ThreeDCanvas />

      {/* Top Navbar */}
      <header className="border-b border-white/[0.06] bg-[#02050E]/90 backdrop-blur-2xl sticky top-0 z-40 px-6 sm:px-10 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3.5 relative z-10">
          <motion.div
            whileHover={{ rotateY: 180, scale: 1.05 }}
            transition={{ duration: 0.6 }}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-glow-cyan shrink-0 border border-white/20"
          >
            <Film className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="bg-gradient-to-r from-white via-cyan-100 to-slate-400 bg-clip-text text-transparent">
                NARRATED AI
              </span>
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 font-bold shadow-sm">
                SYNCHRONIZED STUDIO
              </span>
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>Timestamped Scripts • 4–8s Diffusion Scenes • Neural Voiceovers</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </p>
          </div>
        </div>

        {/* Platform Switcher Tabs & Engine Selector */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          {/* Seamless Instant Tab Switcher (Both sections stay loaded and live!) */}
          <SlideTabs
            tabs={[
              { id: 'architect', label: 'Prompt & Storyboard Architect', icon: <Film className="w-4 h-4 text-cyan-400" /> },
              { id: 'voiceover', label: 'Voiceover Studio & Audio Engine', icon: <Mic className="w-4 h-4 text-amber-300" />, badge: 'TTS' }
            ]}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as any)}
            indicatorClassName={
              activeTab === 'architect'
                ? 'bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 shadow-glow-cyan/40'
                : 'bg-gradient-to-r from-amber-600 via-rose-500 to-amber-600 shadow-glow-amber/40'
            }
          />

          {/* Cloud vs Offline Mode Toggle */}
          <div className="inline-flex rounded-xl bg-black/60 p-1 border border-white/[0.08] backdrop-blur-md">
            <button
              type="button"
              onClick={() => setEngineMode('cloud')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                engineMode === 'cloud'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Google Gemini Cloud AI"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Cloud</span>
            </button>
            <button
              type="button"
              onClick={() => setEngineMode('offline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                engineMode === 'offline'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="100% Offline / Zero API Engine"
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Offline</span>
            </button>
          </div>
        </div>
      </header>

      {/* Synchronized Master Status Pill Bar with Pop Colors */}
      <div className="bg-[#030714]/90 border-b border-white/[0.06] px-6 sm:px-10 py-3 relative z-20 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>● LIVE SYNCHRONIZED</span>
            </span>

            <span className="text-slate-300 font-semibold truncate max-w-sm sm:max-w-md">
              Project: <span className="text-white font-bold">{storyboard?.title || topic}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-slate-400 font-mono text-xs">
            <span className="text-cyan-300 font-bold">{inputWords} words</span>
            <span>•</span>
            <span className="text-amber-300 font-bold">~{calculatedDuration}s spoken audio</span>
            <span>•</span>
            <span className="text-purple-300 font-bold">{estimatedScenes} visual scenes</span>
            <span>•</span>
            <span className="text-emerald-300 font-bold flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Narrator: {selectedVoice.name} ({selectedVoice.accent.split(' ')[0]})</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Studio Content Area: Spacious, Clean, Both Sections Kept Alive */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-10 relative z-10 space-y-10">
        {/* ======================================================== */}
        {/* SECTION 1: PROMPT & STORYBOARD ARCHITECT                  */}
        {/* (Kept mounted in DOM so zero state is lost when toggling)  */}
        {/* ======================================================== */}
        <div className={activeTab === 'architect' ? 'space-y-10' : 'hidden'}>
          {/* Narrative & Diffusion Architect Studio Box */}
          <Card3D maxTilt={2} glare={false}>
            <section className="bg-[#030714]/85 border border-white/[0.08] rounded-3xl p-8 sm:p-10 space-y-8 backdrop-blur-2xl shadow-2xl">
              {/* Studio Heading & Diffusion Target */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                    <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
                    <span>Narrative & Diffusion Architect</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Generate viral storyboards with 4–8s scene cuts and matching image diffusion prompts.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Diffusion Target:</span>
                  <div className="inline-flex rounded-xl bg-black/60 p-1 border border-white/[0.08]">
                    {IMAGE_MODELS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setImageModel(m.id as any)}
                        className={`px-3.5 py-1 text-xs font-bold rounded-lg transition-all ${
                          imageModel === m.id
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-glow-cyan/40'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {m.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sliding Workflow Mode Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 bg-black/60 border border-white/[0.08] rounded-2xl backdrop-blur-md">
                <SlideTabs
                  tabs={[
                    { id: 'premise', label: 'Story Premise Mode', icon: <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> },
                    { id: 'voiceover', label: 'Direct Voiceover Script Mode', icon: <Mic className="w-3.5 h-3.5 text-amber-300" /> }
                  ]}
                  activeId={inputMode}
                  onChange={(id) => setInputMode(id as any)}
                  layoutId="studio-workflow-indicator"
                  indicatorClassName={
                    inputMode === 'premise'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 shadow-glow-cyan/30'
                      : 'bg-gradient-to-r from-amber-600 via-rose-500 to-amber-600 shadow-glow-amber/30'
                  }
                />
                <span className="text-xs font-mono text-slate-400 px-3 hidden sm:inline">
                  {inputMode === 'premise'
                    ? 'AI generates full narrative script from premise'
                    : 'Preserves your exact voiceover words & generates matched scenes'}
                </span>
              </div>

              {/* Dynamic Input Panel */}
              <AnimatePresence mode="wait">
                {inputMode === 'voiceover' ? (
                  /* MODE 1: Direct Voiceover Input with Pop Colors */
                  <motion.div
                    key="voiceover-segment"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-[#040A1A]/90 border border-amber-500/30 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl relative"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                            Direct Voiceover Input
                          </span>
                          <span className="text-xs text-slate-400">
                            Your exact words preserved • Synchronized 4–8s scene cuts
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white mt-1 flex items-center gap-2.5">
                          <span>Input Your Voiceover Narration</span>
                          {isDictating && <SoundWaveVisualizer isPlaying={true} barCount={8} color="from-rose-400 to-amber-400" />}
                        </h3>
                      </div>

                      {/* Toolbar */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <AnimatedButton
                          type="button"
                          variant={isDictating ? 'danger' : 'secondary'}
                          onClick={toggleDictation}
                          icon={<Mic className={`w-3.5 h-3.5 ${isDictating ? 'text-white' : 'text-rose-400'}`} />}
                          className={isDictating ? 'animate-pulse-halo' : ''}
                        >
                          {isDictating ? 'Listening... (Click to stop)' : 'Dictate with Mic'}
                        </AnimatedButton>

                        <AnimatedButton
                          type="button"
                          variant="secondary"
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              if (text) setSharedScript((prev) => (prev ? prev + '\n\n' + text : text));
                            } catch {
                              alert('Clipboard access denied. Please paste manually into the editor.');
                            }
                          }}
                        >
                          Paste Clipboard
                        </AnimatedButton>

                        <AnimatedButton
                          type="button"
                          variant="ghost"
                          onClick={() => setSharedScript('')}
                          className="text-slate-400 hover:text-rose-300"
                        >
                          Clear
                        </AnimatedButton>
                      </div>
                    </div>

                    {/* High-Contrast Script Textarea with Pop Focus */}
                    <textarea
                      rows={8}
                      value={sharedScript}
                      onChange={(e) => setSharedScript(e.target.value)}
                      disabled={isGenerating}
                      placeholder="Paste, type, or dictate your full voiceover script here... (e.g., In the deep trenches of the Pacific, sunlight fades into total silence...)"
                      className="w-full bg-black/60 border border-white/[0.1] rounded-2xl p-5 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all font-sans leading-relaxed resize-y shadow-inner"
                    />

                    {/* Pop Stat Cubes (Cyan, Amber, Purple, Emerald) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                      <div className="bg-black/50 border border-cyan-500/25 rounded-2xl p-4 text-center shadow-lg">
                        <div className="text-[10px] text-cyan-300 uppercase font-mono font-bold tracking-wider">Word Count</div>
                        <div className="text-lg font-bold text-white font-mono mt-0.5">{inputWords} words</div>
                      </div>
                      <div className="bg-black/50 border border-amber-500/25 rounded-2xl p-4 text-center shadow-lg">
                        <div className="text-[10px] text-amber-300 uppercase font-mono font-bold tracking-wider">Spoken Runtime</div>
                        <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">~{calculatedDuration}s</div>
                      </div>
                      <div className="bg-black/50 border border-purple-500/25 rounded-2xl p-4 text-center shadow-lg">
                        <div className="text-[10px] text-purple-300 uppercase font-mono font-bold tracking-wider">Scene Budget</div>
                        <div className="text-lg font-bold text-purple-300 font-mono mt-0.5">{estimatedScenes} scenes</div>
                      </div>
                      <div className="bg-black/50 border border-emerald-500/25 rounded-2xl p-4 text-center shadow-lg">
                        <div className="text-[10px] text-emerald-300 uppercase font-mono font-bold tracking-wider">Pacing Target</div>
                        <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">~7.5s / scene</div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* MODE 2: Clean Story Premise Generator */
                  <motion.div
                    key="premise-segment"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-white">Story Premise / Subject Matter</label>
                      <span className="text-xs text-slate-400">Enter a concept to synthesize an original narrative</span>
                    </div>
                    <textarea
                      rows={4}
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      disabled={isGenerating}
                      placeholder="Type your story premise (e.g., The Lost Kingdom of Benin: The Great Earthworks & Ancient Bronze Masters...)"
                      className="w-full bg-black/60 border border-white/[0.1] rounded-2xl p-5 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all font-sans leading-relaxed shadow-inner"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Duration Slider (Active in Premise Mode) */}
              {inputMode === 'premise' && (
                <DurationSlider
                  value={duration}
                  onChange={setDuration}
                  disabled={isGenerating}
                />
              )}

              {/* Niche Selector: Spacious Listed Layout */}
              <NicheSelector
                selectedNicheId={nicheId}
                onSelectNiche={setNicheId}
                disabled={isGenerating}
              />

              {/* Tone & Perspective Controls: Listed Out with Pop Accents */}
              <div className="space-y-3 pt-2">
                <label className="text-sm font-bold text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span>Narration Tone & Perspective</span>
                </label>
                <div className="space-y-2">
                  {TONE_OPTIONS.map((t) => {
                    const isSelected = tone === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={isGenerating}
                        onClick={() => setTone(t.id)}
                        className={`w-full p-4 rounded-2xl border text-left transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#06152F] via-[#041024] to-[#020914] border-emerald-400 ring-1 ring-emerald-400/60 shadow-lg'
                            : 'bg-black/50 border-white/[0.08] hover:border-slate-500 hover:bg-white/5'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-bold text-white mb-0.5 flex items-center gap-2">
                            <span>{t.label}</span>
                            {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
                          </div>
                          <div className="text-xs text-slate-400">{t.desc}</div>
                        </div>

                        <div className="shrink-0 self-start sm:self-center">
                          {isSelected ? (
                            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 font-semibold">Select</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Trigger Buttons */}
              <div className="pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="font-semibold text-slate-200">Execution Strategy: </span>
                  <span>
                    {isScript
                      ? `⚡ Script Partitioning Engine (${estimatedScenes} scenes @ ~7.5s)`
                      : duration <= 180
                      ? '⚡ Rapid Single-Pass Synthesis'
                      : '🧩 2-Stage Master Outline & Recursive Expansion'}
                  </span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <AnimatedButton
                    type="button"
                    variant="secondary"
                    disabled={isGenerating || (isDirectVoiceover ? !sharedScript.trim() : !topic.trim())}
                    onClick={() => handleGenerate(true)}
                    icon={<Zap className="w-4 h-4 text-emerald-400" />}
                    className="flex-1 sm:flex-none text-xs px-4 py-2.5 font-bold"
                  >
                    Offline (0 API)
                  </AnimatedButton>

                  <AnimatedButton
                    type="button"
                    variant={isDirectVoiceover ? 'cyber' : 'primary'}
                    shimmer={true}
                    disabled={isGenerating || (isDirectVoiceover ? !sharedScript.trim() : !topic.trim())}
                    onClick={() => handleGenerate(false)}
                    icon={
                      isDirectVoiceover ? (
                        <Mic className="w-4 h-4 text-amber-300" />
                      ) : engineMode === 'offline' ? (
                        <Zap className="w-4 h-4" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-cyan-200" />
                      )
                    }
                    className="flex-1 sm:flex-none text-xs sm:text-sm px-7 py-3.5 font-bold shadow-glow-cyan"
                  >
                    {isGenerating
                      ? 'Synthesizing Storyboard...'
                      : isDirectVoiceover
                      ? `Generate Storyboard from Voiceover (${estimatedScenes} Scenes)`
                      : engineMode === 'offline'
                      ? 'Generate Offline Storyboard'
                      : 'Generate Cloud AI Storyboard'}
                  </AnimatedButton>
                </div>
              </div>
            </section>
          </Card3D>

          {/* Real-Time Progress Tracker */}
          <ProgressTracker
            stage={progress.stage}
            percent={progress.percent}
            message={progress.message}
            isGenerating={isGenerating}
          />

          {/* Storyboard Output Area: Spacious Sequential Layout */}
          {storyboard && (
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="space-y-8"
            >
              {/* Storyboard Header Card with Pop Accents */}
              <div className="bg-[#030714]/90 border border-cyan-500/30 rounded-3xl p-7 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-2xl backdrop-blur-2xl">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[11px] font-mono uppercase px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-bold">
                      {storyboard.niche}
                    </span>
                    <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/40 font-bold">
                      {storyboard.tone}
                    </span>
                    <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-bold">
                      {storyboard.image_model}
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{storyboard.title}</h3>
                  <p className="text-xs text-slate-400 mt-1.5 font-mono">
                    Runtime: <strong className="text-cyan-300 text-sm">{storyboard.total_duration}</strong> across{' '}
                    <strong className="text-white">{storyboard.total_scenes} sequential scenes</strong> (Pacing:{' '}
                    {storyboard.pacing_wpm} WPM • 4–8s bounds)
                  </p>
                </div>

                {/* Studio Actions & Export */}
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <AnimatedButton
                    type="button"
                    variant="cyber"
                    shimmer={true}
                    onClick={() => setActiveTab('voiceover')}
                    icon={<Mic className="w-4 h-4 text-amber-300" />}
                    className="text-xs px-4 py-2.5 font-bold"
                  >
                    Audition in Voiceover Studio
                  </AnimatedButton>

                  <AnimatedButton
                    type="button"
                    variant="primary"
                    onClick={() => setIsExportOpen(true)}
                    icon={<Download className="w-4 h-4" />}
                    className="text-xs px-4 py-2.5 font-bold"
                  >
                    Export All
                  </AnimatedButton>
                </div>
              </div>

              {/* Master Outline Accordion */}
              {storyboard.outline && (
                <div className="bg-[#030714]/85 border border-white/[0.08] rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowOutline(!showOutline)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 text-xs font-bold text-slate-200">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>Master Outline Breakdown ({storyboard.outline.acts.length} Acts)</span>
                    </div>
                    {showOutline ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>

                  {showOutline && (
                    <div className="p-6 border-t border-white/[0.08] space-y-4 bg-black/60">
                      <p className="text-xs text-slate-300 italic">{storyboard.outline.premise}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {storyboard.outline.acts.map((act) => (
                          <div key={act.act_number} className="bg-black/50 p-4 rounded-xl border border-white/[0.08] space-y-2">
                            <h5 className="text-xs font-bold text-cyan-300">{act.act_title}</h5>
                            <ul className="space-y-1.5">
                              {act.chapters.map((chap) => (
                                <li key={chap.chapter_number} className="text-[11px] text-slate-300">
                                  <span className="text-slate-400 font-medium">Ch {chap.chapter_number}:</span> {chap.chapter_title}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Storyboard Navigation Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
                <SlideTabs
                  tabs={[
                    { id: 'voiceover', label: 'Full Voiceover Script', icon: <Mic className="w-4 h-4 text-emerald-400" /> },
                    { id: 'visuals', label: 'Visual Prompts & Character Sheet', icon: <ImageIcon className="w-4 h-4 text-purple-400" /> },
                    { id: 'timeline', label: 'Sequential Scene Cards', icon: <Clock className="w-4 h-4 text-cyan-400" /> }
                  ]}
                  activeId={storyboardViewTab}
                  onChange={(id) => setStoryboardViewTab(id as any)}
                  layoutId="storyboard-subview-indicator"
                  indicatorClassName="bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 shadow-glow-cyan/30"
                />

                {storyboardViewTab === 'timeline' && (
                  <div className="flex items-center bg-black/50 border border-white/[0.08] p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setViewMode('cards')}
                      className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        viewMode === 'cards' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span>Cards</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        viewMode === 'table' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <TableIcon className="w-4 h-4" />
                      <span>Table</span>
                    </button>
                  </div>
                )}
              </div>

              {/* TAB CONTENT 1: Full Voiceover Script */}
              {storyboardViewTab === 'voiceover' && (
                <FullVoiceoverScript
                  storyboard={storyboard}
                  onOpenInVoiceoverStudio={() => setActiveTab('voiceover')}
                />
              )}

              {/* TAB CONTENT 2: Character Sheet & Visual Consistency */}
              {storyboardViewTab === 'visuals' && (
                <CharacterModelSheet storyboard={storyboard} />
              )}

              {/* TAB CONTENT 3: Sequential Scene Cards (Listed Out) */}
              {storyboardViewTab === 'timeline' && (
                <div className="space-y-4">
                  {viewMode === 'table' ? (
                    <StoryboardTable scenes={storyboard.scenes} />
                  ) : (
                    <div className="space-y-4">
                      {storyboard.scenes.map((scene) => (
                        <SceneCard key={scene.scene_number} scene={scene} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.section>
          )}
        </div>

        {/* ======================================================== */}
        {/* SECTION 2: VOICEOVER STUDIO & AUDIO ENGINE                */}
        {/* (Kept mounted in DOM so audio & state are never lost)      */}
        {/* ======================================================== */}
        <div className={activeTab === 'voiceover' ? 'space-y-8' : 'hidden'}>
          <VoiceoverStudio
            initialScript={sharedScript}
            initialTopic={storyboard?.title || topic}
            currentVoice={selectedVoice}
            onScriptChange={(script) => setSharedScript(script)}
            onVoiceChange={(v) => setSelectedVoice(v)}
            onSendToArchitect={(script) => {
              setSharedScript(script);
              setInputMode('voiceover');
              setActiveTab('architect');
            }}
          />
        </div>
      </main>

      {/* Export Modal */}
      {storyboard && (
        <ExportModal
          storyboard={storyboard}
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
        />
      )}
    </div>
  );
}
