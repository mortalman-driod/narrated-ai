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
  FileText,
  AlertCircle,
  X,
  Volume2,
  Copy,
  Check,
  Radio
} from 'lucide-react';
import { NICHE_PRESETS, TONE_OPTIONS, IMAGE_MODELS } from '@/lib/presets';
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
import { ThreeDCanvas } from '@/components/ui/ThreeDCanvas';
import { Card3D } from '@/components/ui/Card3D';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { SlideTabs } from '@/components/ui/SlideTabs';
import { SoundWaveVisualizer } from '@/components/ui/SoundWaveVisualizer';

const SAMPLE_PROMPTS = [
  'David vs Goliath: The Valley of Elah & The Anatomy of Divine Faith',
  '1998 World Cup Final: Zidane’s Iconic Double & The Brazilian Heartbreak',
  'Charles Finney & The Rochester Revival: The Spark that Transformed America',
  'The Shadow Self: Carl Jung & Why We Project Our Darkest Traits',
  'The Sunken City of Dwarka: The 9,000-Year Lost Underwater Realm',
  'The Dyatlov Pass Incident: What really happened on Dead Mountain'
];

export default function DashboardPage() {
  // Input State
  const [topic, setTopic] = useState('David vs Goliath: The Valley of Elah & The Anatomy of Divine Faith');
  const [duration, setDuration] = useState(60);
  const [nicheId, setNicheId] = useState('bible-stories');
  const [tone, setTone] = useState('authoritative');
  const [imageModel, setImageModel] = useState<'flux' | 'midjourney' | 'runway'>('flux');
  const [engineMode, setEngineMode] = useState<'cloud' | 'offline'>('cloud');
  const [activePlatformTab, setActivePlatformTab] = useState<'architect' | 'voiceover'>('architect');

  // Input Mode: 'premise' (generate narrative from premise) vs 'voiceover' (input existing voiceover narration directly)
  const [inputMode, setInputMode] = useState<'premise' | 'voiceover'>('premise');
  const [voiceoverText, setVoiceoverText] = useState(
    `In the Valley of Elah, Israel and the Philistines stood locked in standoff. Goliath, their colossal champion, stepped out into the dust to taunt the trembling ranks.

A young shepherd named David, bearing grain for his brothers, refused to surrender faith to fear.

Reaching into the dry brook, he selected five smooth stones. With only his sling and divine conviction, he stepped into history.`
  );
  const [isDictating, setIsDictating] = useState(false);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressUpdate>({
    stage: 'outline',
    percent: 0,
    message: ''
  });
  const [storyboard, setStoryboard] = useState<StoryboardResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'voiceover' | 'visuals' | 'timeline'>('voiceover');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [showOutline, setShowOutline] = useState(false);

  // Computed metrics for real-time script & duration detection
  const isDirectVoiceover = inputMode === 'voiceover';
  const effectiveText = (isDirectVoiceover ? voiceoverText : topic).trim();
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
      alert('Speech recognition is not supported in this browser. Please type or paste your voiceover script.');
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
          setVoiceoverText((prev) => (prev ? prev.trim() + ' ' + transcript.trim() : transcript.trim()));
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
      setProgress({
        stage: 'complete',
        percent: 100,
        message: modeToUse === 'offline'
          ? 'Offline generation complete (0 APIs used)!'
          : 'Gemini storyboard generation complete!'
      });

      // Interactive celebratory confetti burst
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#06B6D4', '#3B82F6', '#A855F7', '#F59E0B', '#10B981']
        });
      } catch {}
    } catch (err: any) {
      alert(`Error generating storyboard: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col relative overflow-x-hidden">
      {/* Interactive 3D Canvas Perspective Background */}
      <ThreeDCanvas />

      {/* Top Navbar */}
      <header className="border-b border-white/[0.08] bg-[#0A0F1D]/80 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-3 relative z-10">
          <motion.div
            whileHover={{ rotateY: 180, scale: 1.05 }}
            transition={{ duration: 0.6 }}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-glow-cyan shrink-0 border border-white/20"
          >
            <Film className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                NARRATED AI
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 font-semibold shadow-sm">
                STUDIO SUITE
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>Timestamped Scripts, Diffusion Prompts & Broadcast Voiceovers</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </p>
          </div>
        </div>

        {/* Primary Platform Switcher & Engine Mode */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          {/* Sliding Platform Tab Switcher */}
          <SlideTabs
            tabs={[
              { id: 'architect', label: 'Prompt Architect', icon: <Film className="w-3.5 h-3.5 text-cyan-400" /> },
              { id: 'voiceover', label: 'Voiceover Studio', icon: <Mic className="w-3.5 h-3.5 text-amber-300" />, badge: 'TTS' }
            ]}
            activeId={activePlatformTab}
            onChange={(id) => setActivePlatformTab(id as any)}
            indicatorClassName={
              activePlatformTab === 'architect'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 shadow-glow-cyan/40'
                : 'bg-gradient-to-r from-[#B4532A] to-amber-600 shadow-glow-amber/40'
            }
          />

          {/* Engine Mode Toggle (Active in Architect tab) */}
          {activePlatformTab === 'architect' && (
            <div className="inline-flex rounded-xl bg-black/40 p-1 border border-white/[0.08] backdrop-blur-md">
              <button
                type="button"
                onClick={() => setEngineMode('cloud')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  engineMode === 'cloud'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Uses Google Gemini"
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
                title="100% Offline / Zero API"
              >
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>Offline</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area with Sliding Transition */}
      <AnimatePresence mode="wait">
        {activePlatformTab === 'voiceover' ? (
          <motion.main
            key="voiceover-view"
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -25 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 relative z-10"
          >
            <VoiceoverStudio
              initialScript={storyboard?.full_script}
              initialTopic={storyboard?.title || topic}
              onSendToArchitect={(script) => {
                setVoiceoverText(script);
                setInputMode('voiceover');
                setActivePlatformTab('architect');
              }}
            />
          </motion.main>
        ) : (
          <motion.main
            key="architect-view"
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 25 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 relative z-10"
          >
            {/* Creator Control Studio */}
            <Card3D maxTilt={4} glare={false}>
              <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
                {/* Section Heading & Diffusion Target */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
                      <span>Narrative & Diffusion Architect</span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Generate viral documentary storyboards, synchronized 4–8s scene pacing, and diffusion prompts.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Diffusion Target:</span>
                    <div className="inline-flex rounded-xl bg-black/40 p-1 border border-white/[0.08]">
                      {IMAGE_MODELS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setImageModel(m.id as any)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                            imageModel === m.id
                              ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-glow-cyan/30'
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 bg-black/40 border border-white/[0.08] rounded-2xl backdrop-blur-md">
                  <SlideTabs
                    tabs={[
                      { id: 'premise', label: 'Story Premise Mode', icon: <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> },
                      { id: 'voiceover', label: 'Direct Voiceover & Script Mode', icon: <Mic className="w-3.5 h-3.5 text-amber-300" /> }
                    ]}
                    activeId={inputMode}
                    onChange={(id) => setInputMode(id as any)}
                    layoutId="workflow-mode-indicator"
                    indicatorClassName={
                      inputMode === 'premise'
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 shadow-glow-cyan/30'
                        : 'bg-gradient-to-r from-[#B4532A] to-amber-600 shadow-glow-amber/30'
                    }
                  />
                  <div className="text-[11px] text-slate-400 px-3 font-mono hidden md:block">
                    {inputMode === 'premise'
                      ? 'AI generates full narrative script from premise'
                      : 'Preserves your exact voiceover words & generates matched scenes'}
                  </div>
                </div>

                {/* Animated Mode Panel Switcher */}
                <AnimatePresence mode="wait">
                  {inputMode === 'voiceover' ? (
                    <motion.div
                      key="voiceover-segment"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.2 }}
                      className="bg-[#0B111F]/90 border border-amber-500/25 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl relative overflow-hidden"
                    >
                      {/* Segment Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[#B4532A]/25 text-amber-300 border border-[#B4532A]/50 font-bold shadow-sm">
                              Direct Voiceover Input
                            </span>
                            <span className="text-xs text-slate-400">
                              Your exact words preserved • Synchronized 4–8s scene cuts
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-white mt-1 flex items-center gap-2">
                            <span>Input Your Voiceover Narration</span>
                            {isDictating && <SoundWaveVisualizer isPlaying={true} barCount={8} color="from-rose-400 to-amber-400" />}
                          </h3>
                        </div>

                        {/* Quick Toolbar */}
                        <div className="flex flex-wrap items-center gap-2">
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
                                if (text) setVoiceoverText((prev) => (prev ? prev + '\n\n' + text : text));
                              } catch {
                                alert('Clipboard access denied. Please paste manually into the editor.');
                              }
                            }}
                          >
                            Paste Clipboard
                          </AnimatedButton>

                          <AnimatedButton
                            type="button"
                            variant="secondary"
                            onClick={() =>
                              setVoiceoverText(
                                `In the Valley of Elah, Israel and the Philistines stood locked in standoff. Goliath, their colossal champion, stepped out into the dust to taunt the trembling ranks.\n\nA young shepherd named David, bearing grain for his brothers, refused to surrender faith to fear.\n\nReaching into the dry brook, he selected five smooth stones. With only his sling and divine conviction, he stepped into history.`
                              )
                            }
                          >
                            Load Sample
                          </AnimatedButton>

                          <AnimatedButton
                            type="button"
                            variant="ghost"
                            onClick={() => setVoiceoverText('')}
                            className="text-slate-400 hover:text-rose-300"
                          >
                            Clear
                          </AnimatedButton>
                        </div>
                      </div>

                      {/* Large Script Textarea */}
                      <textarea
                        rows={7}
                        value={voiceoverText}
                        onChange={(e) => setVoiceoverText(e.target.value)}
                        disabled={isGenerating}
                        placeholder="Paste, type, or dictate your full voiceover script here... (e.g., In the deep trenches of the Pacific, sunlight fades into total silence...)"
                        className="w-full bg-black/40 border border-white/[0.08] rounded-2xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#B4532A] transition-all font-sans leading-relaxed resize-y shadow-inner"
                      />

                      {/* 3D Animated Stat Cubes */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        <div className="bg-black/40 border border-white/[0.08] rounded-xl p-3 text-center transition-transform hover:scale-[1.02]">
                          <div className="text-[10px] text-slate-400 uppercase font-mono">Word Count</div>
                          <div className="text-base font-bold text-white font-mono mt-0.5">{inputWords} words</div>
                        </div>
                        <div className="bg-black/40 border border-white/[0.08] rounded-xl p-3 text-center transition-transform hover:scale-[1.02]">
                          <div className="text-[10px] text-slate-400 uppercase font-mono">Spoken Runtime</div>
                          <div className="text-base font-bold text-amber-300 font-mono mt-0.5">~{calculatedDuration}s</div>
                        </div>
                        <div className="bg-black/40 border border-white/[0.08] rounded-xl p-3 text-center transition-transform hover:scale-[1.02]">
                          <div className="text-[10px] text-slate-400 uppercase font-mono">Scene Budget</div>
                          <div className="text-base font-bold text-cyan-300 font-mono mt-0.5">{estimatedScenes} scenes</div>
                        </div>
                        <div className="bg-black/40 border border-white/[0.08] rounded-xl p-3 text-center transition-transform hover:scale-[1.02]">
                          <div className="text-[10px] text-slate-400 uppercase font-mono">Pacing Target</div>
                          <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">~7.5s / scene</div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                        <span>💡 Your voiceover words remain untouched; the engine partitions them into optimal retention scenes with {imageModel.toUpperCase()} diffusion prompts.</span>
                        <span className="font-mono text-emerald-400 text-[10px] hidden sm:inline">Strict 4–8s bounds</span>
                      </div>
                    </motion.div>
                  ) : (
                    /* MODE 2: Story Premise Generator */
                    <motion.div
                      key="premise-segment"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-200">Story Premise / Subject Matter</label>
                        <span className="text-xs text-slate-400">Enter a concept to synthesize an original narrative</span>
                      </div>
                      <textarea
                        rows={3}
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        disabled={isGenerating}
                        placeholder="Type a story premise (e.g., David vs Goliath: The Valley of Elah & The Anatomy of Divine Faith)"
                        className="w-full bg-black/40 border border-white/[0.08] rounded-2xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all font-sans leading-relaxed shadow-inner"
                      />
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-slate-400 font-medium mr-1">Inspirations:</span>
                        {SAMPLE_PROMPTS.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setTopic(p);
                              if (p.includes('David') || p.includes('Finney')) setNicheId('bible-stories');
                              else if (p.includes('World Cup')) setNicheId('football-history');
                              else if (p.includes('Shadow Self')) setNicheId('human-psychology');
                              else if (p.includes('Dwarka')) setNicheId('ancient-civilizations');
                              else if (p.includes('Dyatlov')) setNicheId('forgotten-mysteries');
                            }}
                            disabled={isGenerating}
                            className="text-[11px] bg-black/40 hover:bg-white/10 text-slate-400 hover:text-cyan-300 px-3 py-1 rounded-lg border border-white/[0.08] transition-colors truncate max-w-[280px]"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
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

                {/* Niche Selector */}
                <NicheSelector
                  selectedNicheId={nicheId}
                  onSelectNiche={setNicheId}
                  disabled={isGenerating}
                />

                {/* Tone & Perspective Controls */}
                <div className="space-y-3 pt-2">
                  <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    <span>Narration Tone & Perspective</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {TONE_OPTIONS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        disabled={isGenerating}
                        onClick={() => setTone(t.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                          tone === t.id
                            ? 'bg-gradient-to-b from-[#132238] to-[#0D1627] border-emerald-400 ring-1 ring-emerald-400/60 shadow-lg scale-[1.02]'
                            : 'bg-black/40 border-white/[0.08] hover:border-slate-500 hover:bg-white/5'
                        }`}
                      >
                        <div className="text-xs font-bold text-white mb-0.5">{t.label}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Trigger Buttons */}
                <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span className="font-semibold text-slate-200">Execution Strategy: </span>
                    <span>
                      {isScript
                        ? `⚡ Script Partitioning Engine (${estimatedScenes} scenes @ ~7.5s)`
                        : duration <= 180
                        ? '⚡ Single-Pass Rapid Generator'
                        : '🧩 2-Stage Master Outline & Recursive Expansion'}
                    </span>
                    <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <UserCheck className="w-3 h-3" />
                      Character Consistency Locked
                    </span>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <AnimatedButton
                      type="button"
                      variant="secondary"
                      disabled={isGenerating || (isDirectVoiceover ? !voiceoverText.trim() : !topic.trim())}
                      onClick={() => handleGenerate(true)}
                      icon={<Zap className="w-4 h-4 text-emerald-400" />}
                      className="flex-1 sm:flex-none"
                    >
                      Offline Generator (0 API)
                    </AnimatedButton>

                    <AnimatedButton
                      type="button"
                      variant={isDirectVoiceover ? 'cyber' : 'primary'}
                      shimmer={true}
                      disabled={isGenerating || (isDirectVoiceover ? !voiceoverText.trim() : !topic.trim())}
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
                      className="flex-1 sm:flex-none text-xs sm:text-sm px-6 py-3 font-bold"
                    >
                      {isGenerating
                        ? 'Synthesizing Production Storyboard...'
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

            {/* Storyboard Output Area */}
            {storyboard && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="space-y-6"
              >
                {/* Storyboard Header Card */}
                <div className="glass-panel-glow rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-400/30 font-bold">
                        {storyboard.niche}
                      </span>
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-black/40 border border-white/[0.08] text-slate-300">
                        {storyboard.tone}
                      </span>
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                        {storyboard.image_model}
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{storyboard.title}</h3>
                    <p className="text-xs text-slate-400 mt-1.5">
                      Total Runtime: <strong className="text-cyan-300 font-mono text-sm">{storyboard.total_duration}</strong> across{' '}
                      <strong className="text-white">{storyboard.total_scenes} visual scenes</strong> (Avg Pacing:{' '}
                      {storyboard.pacing_wpm} WPM • Every scene 4–8s)
                    </p>
                  </div>

                  {/* Studio Actions & Export */}
                  <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
                    <AnimatedButton
                      type="button"
                      variant="cyber"
                      onClick={() => setActivePlatformTab('voiceover')}
                      icon={<Mic className="w-3.5 h-3.5 text-amber-300" />}
                    >
                      Voiceover Studio
                    </AnimatedButton>

                    <AnimatedButton
                      type="button"
                      variant="primary"
                      onClick={() => setIsExportOpen(true)}
                      icon={<Download className="w-3.5 h-3.5" />}
                    >
                      Export All
                    </AnimatedButton>
                  </div>
                </div>

                {/* Master Outline Accordion (if chunked generation) */}
                {storyboard.outline && (
                  <div className="glass-panel rounded-2xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowOutline(!showOutline)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                        <Layers className="w-4 h-4 text-cyan-400" />
                        <span>Master Outline & Act Breakdown ({storyboard.outline.acts.length} Acts)</span>
                      </div>
                      {showOutline ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>

                    {showOutline && (
                      <div className="p-5 border-t border-white/[0.08] space-y-4 bg-black/40">
                        <p className="text-xs text-slate-300 italic">{storyboard.outline.premise}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {storyboard.outline.acts.map((act) => (
                            <div key={act.act_number} className="bg-black/40 p-4 rounded-xl border border-white/[0.08] space-y-2">
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

                {/* Dedicated Primary Navigation Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-2">
                  <SlideTabs
                    tabs={[
                      { id: 'voiceover', label: 'Full Voiceover Script', icon: <Mic className="w-3.5 h-3.5 text-emerald-400" /> },
                      { id: 'visuals', label: 'Visual Prompts & Continuity', icon: <ImageIcon className="w-3.5 h-3.5 text-purple-400" /> },
                      { id: 'timeline', label: 'Timeline & Production Cards', icon: <Clock className="w-3.5 h-3.5 text-cyan-400" /> }
                    ]}
                    activeId={activeTab}
                    onChange={(id) => setActiveTab(id as any)}
                    layoutId="storyboard-subtab-indicator"
                  />

                  {/* View switcher when in timeline tab */}
                  {activeTab === 'timeline' && (
                    <div className="flex items-center bg-black/40 border border-white/[0.08] p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setViewMode('cards')}
                        title="Timeline Cards"
                        className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          viewMode === 'cards'
                            ? 'bg-white/10 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <LayoutGrid className="w-4 h-4" />
                        <span>Cards</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        title="Tabular View"
                        className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          viewMode === 'table'
                            ? 'bg-white/10 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <TableIcon className="w-4 h-4" />
                        <span>Table</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* TAB CONTENT 1: Full Voiceover Script */}
                {activeTab === 'voiceover' && (
                  <FullVoiceoverScript
                    storyboard={storyboard}
                    onOpenInVoiceoverStudio={() => setActivePlatformTab('voiceover')}
                  />
                )}

                {/* TAB CONTENT 2: Visual Generation & Character Model */}
                {activeTab === 'visuals' && (
                  <CharacterModelSheet storyboard={storyboard} />
                )}

                {/* TAB CONTENT 3: Timeline & Storyboard Table */}
                {activeTab === 'timeline' && (
                  <div className="space-y-4">
                    {viewMode === 'table' ? (
                      <StoryboardTable scenes={storyboard.scenes} />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {storyboard.scenes.map((scene) => (
                          <SceneCard key={scene.scene_number} scene={scene} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.section>
            )}
          </motion.main>
        )}
      </AnimatePresence>

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
