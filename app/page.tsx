'use client';

import React, { useState } from 'react';
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
  X
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
      alert('Speech recognition is not supported in this browser. Please type or paste your voiceover text.');
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
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: isDirectVoiceover
            ? (effectiveText.split('\n')[0].replace(/[.!?]/g, '').trim().slice(0, 60) || 'Custom Voiceover Story')
            : topic,
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
    } catch (err: any) {
      alert(`Error generating storyboard: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent-cyan flex items-center justify-center shadow-glow-blue shrink-0">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>NARRATED AI</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
                STUDIO SUITE
              </span>
            </h1>
            <p className="text-xs text-slate-400">Timestamped Scripts, Diffusion Prompts & Broadcast Voiceovers</p>
          </div>
        </div>

        {/* Primary Platform Switcher & Engine Mode */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Platform Tab Switcher: Prompt Architect vs Voiceover Studio */}
          <div className="inline-flex rounded-xl bg-background p-1 border border-border">
            <button
              type="button"
              onClick={() => setActivePlatformTab('architect')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activePlatformTab === 'architect'
                  ? 'bg-surface text-white shadow-sm border border-border'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Prompt Architect</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePlatformTab('voiceover')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activePlatformTab === 'voiceover'
                  ? 'bg-[#B4532A] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-amber-300" />
              <span>Voiceover Studio (Local TTS)</span>
            </button>
          </div>

          {/* Engine Mode Toggle (Active in Architect tab) */}
          {activePlatformTab === 'architect' && (
            <div className="inline-flex rounded-xl bg-background p-1 border border-border">
              <button
                type="button"
                onClick={() => setEngineMode('cloud')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  engineMode === 'cloud'
                    ? 'bg-primary/20 text-accent-cyan border border-accent-cyan/30 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Uses Google Gemini"
              >
                <Sparkles className="w-3 h-3 text-accent-cyan" />
                <span>Cloud</span>
              </button>
              <button
                type="button"
                onClick={() => setEngineMode('offline')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
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

      {/* Main Content Area */}
      {activePlatformTab === 'voiceover' ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in">
          <VoiceoverStudio
            initialScript={storyboard?.full_script}
            initialTopic={storyboard?.title || topic}
            onSendToArchitect={(script) => {
              setVoiceoverText(script);
              setInputMode('voiceover');
              setActivePlatformTab('architect');
            }}
          />
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in">
          {/* Creator Control Studio */}
          <section className="bg-surface/80 border border-border rounded-2xl p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden backdrop-blur-sm">
          {/* Section Heading */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-accent-cyan" />
                Narrative Configuration
              </h2>
              <p className="text-xs text-slate-400">Configure story premises, target duration, viral niche, and diffusion target.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Diffusion Engine:</span>
              <div className="inline-flex rounded-lg bg-background p-1 border border-border">
                {IMAGE_MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setImageModel(m.id as any)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      imageModel === m.id
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Workflow Mode Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 bg-background/80 border border-border rounded-xl">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setInputMode('premise')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  inputMode === 'premise'
                    ? 'bg-primary/20 text-accent-cyan border border-accent-cyan/30 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
                <span>Story Premise Generator</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode('voiceover')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  inputMode === 'voiceover'
                    ? 'bg-[#B4532A] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mic className="w-3.5 h-3.5 text-amber-300" />
                <span>Direct Voiceover & Script Input</span>
              </button>
            </div>
            <div className="text-[11px] text-slate-400 px-2 font-mono">
              {inputMode === 'premise'
                ? 'AI crafts script from your story premise'
                : 'Directly converts your voiceover into timed scenes & visual prompts'}
            </div>
          </div>

          {/* MODE 1: Direct Voiceover Input Segment */}
          {inputMode === 'voiceover' ? (
            <div className="bg-surface/90 border border-[#B4532A]/30 rounded-2xl p-5 space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#B4532A]/20 text-amber-300 border border-[#B4532A]/40 font-bold">
                      Direct Voiceover Input
                    </span>
                    <span className="text-xs text-slate-400">
                      Exact text preserved • Synchronized 4–8s scene boundaries
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1">
                    Input Your Voiceover Script
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleDictation}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isDictating
                        ? 'bg-rose-600 text-white animate-pulse shadow-glow-rose'
                        : 'bg-background hover:bg-surface-hover text-slate-300 hover:text-white border border-border'
                    }`}
                    title="Speak into your microphone to dictate voiceover"
                  >
                    <Mic className={`w-3.5 h-3.5 ${isDictating ? 'text-white' : 'text-rose-400'}`} />
                    <span>{isDictating ? 'Listening... (Click to stop)' : 'Dictate with Mic'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) setVoiceoverText((prev) => (prev ? prev + '\n\n' + text : text));
                      } catch {
                        alert('Clipboard access denied. Please paste manually into the text box.');
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-background hover:bg-surface-hover text-slate-300 border border-border transition-colors"
                  >
                    Paste
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setVoiceoverText(
                        `In the Valley of Elah, Israel and the Philistines stood locked in standoff. Goliath, their colossal champion, stepped out into the dust to taunt the trembling ranks.\n\nA young shepherd named David, bearing grain for his brothers, refused to surrender faith to fear.\n\nReaching into the dry brook, he selected five smooth stones. With only his sling and divine conviction, he stepped into history.`
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-background hover:bg-surface-hover text-slate-300 border border-border transition-colors"
                  >
                    Sample
                  </button>

                  <button
                    type="button"
                    onClick={() => setVoiceoverText('')}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-background hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-border transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Textarea */}
              <textarea
                rows={7}
                value={voiceoverText}
                onChange={(e) => setVoiceoverText(e.target.value)}
                disabled={isGenerating}
                placeholder="Type, paste, or dictate your full voiceover script here... (e.g., In the deep trenches of the Pacific, sunlight fades into total silence...)"
                className="w-full bg-background border border-border rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#B4532A] transition-all font-sans leading-relaxed resize-y"
              />

              {/* Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="bg-background/80 border border-border rounded-xl p-2.5 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Word Count</div>
                  <div className="text-sm font-bold text-white font-mono">{inputWords} words</div>
                </div>
                <div className="bg-background/80 border border-border rounded-xl p-2.5 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Natural Duration</div>
                  <div className="text-sm font-bold text-amber-300 font-mono">~{calculatedDuration}s</div>
                </div>
                <div className="bg-background/80 border border-border rounded-xl p-2.5 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Visual Scenes</div>
                  <div className="text-sm font-bold text-accent-cyan font-mono">Exactly {estimatedScenes} scenes</div>
                </div>
                <div className="bg-background/80 border border-border rounded-xl p-2.5 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Scene Pacing</div>
                  <div className="text-sm font-bold text-emerald-400 font-mono">~7.5s / scene</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>💡 Your words remain untouched; the engine splits them into cinematic retention cuts and pairs each cut with a {imageModel.toUpperCase()} diffusion prompt.</span>
                <span className="font-mono text-emerald-400 text-[10px]">Strict 4–8s bounds</span>
              </div>
            </div>
          ) : (
            /* MODE 2: Story Premise Generator */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-200">Story Premise / Subject Matter</label>
                <span className="text-xs text-slate-400">Enter a premise to synthesize a complete script from scratch</span>
              </div>
              <textarea
                rows={3}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isGenerating}
                placeholder="Type a story premise or premise idea (e.g., David vs Goliath: The Valley of Elah & The Anatomy of Divine Faith)"
                className="w-full bg-background border border-border rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-cyan transition-all font-sans leading-relaxed"
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
                    className="text-[11px] bg-background hover:bg-surface-hover text-slate-400 hover:text-accent-cyan px-2.5 py-1 rounded-md border border-border transition-colors truncate max-w-[280px]"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Duration Selector (Visible in premise mode, or override in voiceover mode) */}
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
              <Compass className="w-4 h-4 text-accent-emerald" />
              Narration Tone & Perspective
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setTone(t.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    tone === t.id
                      ? 'bg-surface-hover border-accent-emerald ring-1 ring-accent-emerald'
                      : 'bg-background border-border hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs font-bold text-white mb-0.5">{t.label}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-1">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="font-semibold text-slate-200">Execution Strategy: </span>
              <span>{isScript ? `⚡ Script Partitioning Engine (${estimatedScenes} scenes @ ~7.5s)` : duration <= 180 ? '⚡ Single-Pass Rapid Generator' : '🧩 2-Stage Master Outline & Recursive Expansion'}</span>
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <UserCheck className="w-3 h-3" />
                Character Continuity Locked
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                disabled={isGenerating || (isDirectVoiceover ? !voiceoverText.trim() : !topic.trim())}
                onClick={() => handleGenerate(true)}
                className="px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-surface-hover text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
                title="Generate instantly without any external API or network calls"
              >
                <Zap className="w-4 h-4 text-emerald-400" />
                Offline Generator (0 API)
              </button>

              <button
                type="button"
                disabled={isGenerating || (isDirectVoiceover ? !voiceoverText.trim() : !topic.trim())}
                onClick={() => handleGenerate(false)}
                className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-glow-blue transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDirectVoiceover
                    ? 'bg-gradient-to-r from-[#B4532A] to-amber-600 hover:brightness-110'
                    : engineMode === 'offline'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110'
                    : 'bg-gradient-to-r from-primary via-blue-600 to-accent-cyan hover:brightness-110'
                }`}
              >
                {isDirectVoiceover ? (
                  <Mic className="w-4 h-4 text-amber-300" />
                ) : engineMode === 'offline' ? (
                  <Zap className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isGenerating
                  ? 'Synthesizing...'
                  : isDirectVoiceover
                  ? `Generate Storyboard from Voiceover (${estimatedScenes} Scenes)`
                  : engineMode === 'offline'
                  ? 'Generate Offline Storyboard'
                  : 'Generate Cloud AI Storyboard'}
              </button>
            </div>
          </div>
        </section>

        {/* Real-Time Progress Tracker */}
        <ProgressTracker
          stage={progress.stage}
          percent={progress.percent}
          message={progress.message}
          isGenerating={isGenerating}
        />

        {/* Storyboard Output Area */}
        {storyboard && (
          <section className="space-y-6 animate-in fade-in duration-500">
            {/* Storyboard Header Card */}
            <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-bold">
                    {storyboard.niche}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-background border border-border text-slate-400">
                    {storyboard.tone}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-accent-purple/15 text-accent-purple border border-accent-purple/30">
                    {storyboard.image_model}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">{storyboard.title}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Total Runtime: <strong className="text-white font-mono">{storyboard.total_duration}</strong> across{' '}
                  <strong className="text-white">{storyboard.total_scenes} visual scenes</strong> (Avg Pacing:{' '}
                  {storyboard.pacing_wpm} WPM • Every scene 4–8s)
                </p>
              </div>

              {/* Studio Actions & Export */}
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setActivePlatformTab('voiceover')}
                  className="px-3.5 py-2 rounded-xl bg-[#B4532A]/20 hover:bg-[#B4532A]/30 text-amber-300 border border-[#B4532A]/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  title="Send full script to Voiceover Studio"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Voiceover Studio</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsExportOpen(true)}
                  className="px-4 py-2 rounded-xl bg-accent-cyan/15 hover:bg-accent-cyan/25 text-accent-cyan border border-accent-cyan/30 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export All</span>
                </button>
              </div>
            </div>

            {/* Master Outline Accordion (if chunked generation) */}
            {storyboard.outline && (
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowOutline(!showOutline)}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-surface-hover/50 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                    <Layers className="w-4 h-4 text-accent-cyan" />
                    Master Outline & Act Breakdown ({storyboard.outline.acts.length} Acts)
                  </div>
                  {showOutline ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {showOutline && (
                  <div className="p-5 border-t border-border space-y-4 bg-background/50">
                    <p className="text-xs text-slate-300 italic">{storyboard.outline.premise}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {storyboard.outline.acts.map((act) => (
                        <div key={act.act_number} className="bg-surface p-3.5 rounded-lg border border-border space-y-2">
                          <h5 className="text-xs font-bold text-accent-cyan">{act.act_title}</h5>
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

            {/* Dedicated Primary Navigation Tabs: Voiceover vs Character Visuals vs Timeline */}
            <div className="flex items-center justify-between border-b border-border pb-1">
              <div className="flex items-center gap-2">
                {/* Tab 1: Full Voiceover Script */}
                <button
                  type="button"
                  onClick={() => setActiveTab('voiceover')}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                    activeTab === 'voiceover'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-surface'
                  }`}
                >
                  <Mic className="w-4 h-4 text-emerald-400" />
                  Full Voiceover Script
                </button>

                {/* Tab 2: Visual Generation & Character Model */}
                <button
                  type="button"
                  onClick={() => setActiveTab('visuals')}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                    activeTab === 'visuals'
                      ? 'bg-accent-purple/15 text-accent-purple border border-accent-purple/30 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-surface'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 text-accent-purple" />
                  Visual Prompts & Continuity
                </button>

                {/* Tab 3: Timeline & Storyboard Table */}
                <button
                  type="button"
                  onClick={() => setActiveTab('timeline')}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                    activeTab === 'timeline'
                      ? 'bg-primary/20 text-accent-cyan border border-accent-cyan/30 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-surface'
                  }`}
                >
                  <Clock className="w-4 h-4 text-accent-cyan" />
                  Timeline & Production Table
                </button>
              </div>

              {/* View switcher when in timeline tab */}
              {activeTab === 'timeline' && (
                <div className="hidden sm:flex items-center bg-background border border-border p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    title="Timeline Cards"
                    className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      viewMode === 'cards'
                        ? 'bg-surface text-white shadow-sm'
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
                        ? 'bg-surface text-white shadow-sm'
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
          </section>
        )}
      </main>
      )}

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
