'use client';

import React, { useState } from 'react';
import { StoryboardResponse } from '@/lib/generator/types';
import {
  FileText,
  Copy,
  Check,
  Download,
  Mic,
  Clock,
  Sparkles,
  AlignLeft,
  ListOrdered
} from 'lucide-react';
import { AnimatedButton } from './ui/AnimatedButton';

interface FullVoiceoverScriptProps {
  storyboard: StoryboardResponse;
  onOpenInVoiceoverStudio?: () => void;
}

export const FullVoiceoverScript: React.FC<FullVoiceoverScriptProps> = ({
  storyboard,
  onOpenInVoiceoverStudio
}) => {
  const [copied, setCopied] = useState(false);
  const [displayMode, setDisplayMode] = useState<'clean' | 'annotated'>('clean');

  // Calculate statistics
  const cleanScript =
    storyboard.full_script?.trim() ||
    storyboard.scenes.map((s) => s.narration_script).join(' ');

  const wordCount = cleanScript.split(/\s+/).filter(Boolean).length;
  const pacingWpm = storyboard.pacing_wpm || 140;
  const estimatedSeconds = Math.round((wordCount / pacingWpm) * 60);
  const estMins = Math.floor(estimatedSeconds / 60);
  const estSecs = estimatedSeconds % 60;
  const estFormatted = `${estMins}m ${estSecs.toString().padStart(2, '0')}s`;

  // Annotated script with timestamp anchors
  const annotatedScript = storyboard.scenes
    .map(
      (s) =>
        `[${s.timestamp_start} - ${s.timestamp_end}] (Scene ${s.scene_number} • ${s.duration_seconds}s)\n${s.narration_script}`
    )
    .join('\n\n');

  // Copy to clipboard
  const handleCopy = () => {
    const textToCopy = displayMode === 'clean' ? cleanScript : annotatedScript;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download as text file
  const handleDownloadTxt = () => {
    const header = `TITLE: ${storyboard.title}\nNICHE: ${storyboard.niche} (${storyboard.tone} tone)\nTOTAL RUNTIME: ${storyboard.total_duration} | PACING: ${pacingWpm} WPM | WORDS: ${wordCount}\n\n====================\nVOICEOVER SCRIPT\n====================\n\n`;
    const content = header + (displayMode === 'clean' ? cleanScript : annotatedScript);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storyboard.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_voiceover.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#030714]/90 border border-cyan-500/25 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 shadow-glow-cyan/20">
              <Mic className="w-4 h-4" />
            </span>
            <h3 className="text-xl font-bold text-white tracking-tight">Full Voiceover Narration</h3>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
              Recording Ready
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Cohesive, broadcast-formatted narrative prose synchronized for voice actors and neural speech synthesis.
          </p>
        </div>

        {/* View Toggle & Copy/Download Buttons with Pop Accents */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher */}
          <div className="inline-flex rounded-xl bg-black/60 p-1 border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setDisplayMode('clean')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                displayMode === 'clean'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-glow-cyan/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Clean Prose</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('annotated')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                displayMode === 'annotated'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow-purple/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Time-Coded</span>
            </button>
          </div>

          <AnimatedButton
            type="button"
            variant="primary"
            onClick={handleCopy}
            icon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            className="text-xs px-3.5 py-2 font-bold"
          >
            {copied ? 'Copied Script' : 'Copy Script'}
          </AnimatedButton>

          <AnimatedButton
            type="button"
            variant="secondary"
            onClick={handleDownloadTxt}
            icon={<Download className="w-3.5 h-3.5 text-cyan-400" />}
            className="text-xs px-3.5 py-2 font-semibold"
          >
            .TXT
          </AnimatedButton>

          {onOpenInVoiceoverStudio && (
            <AnimatedButton
              type="button"
              variant="cyber"
              onClick={onOpenInVoiceoverStudio}
              icon={<Mic className="w-3.5 h-3.5 text-amber-300" />}
              className="text-xs px-4 py-2 font-bold"
            >
              Open in Voiceover Studio →
            </AnimatedButton>
          )}
        </div>
      </div>

      {/* Script Teleprompter / Reader Card with Pop Styling */}
      <div className="relative bg-black/60 border border-white/[0.08] rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-inner">
        {displayMode === 'clean' ? (
          <div className="text-white text-base sm:text-lg leading-relaxed font-sans space-y-5">
            {cleanScript.split('\n\n').length > 1 ? (
              cleanScript.split('\n\n').map((para, idx) => (
                <p key={idx} className="leading-relaxed text-slate-100 border-l-2 border-cyan-400/40 pl-4">
                  {para}
                </p>
              ))
            ) : (
              <p className="leading-relaxed text-slate-100 border-l-2 border-cyan-400/40 pl-4">
                {cleanScript}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {storyboard.scenes.map((scene) => (
              <div
                key={scene.scene_number}
                className="p-4 rounded-xl bg-[#050C1F]/90 border border-white/[0.08] hover:border-cyan-400/40 transition-all space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 font-mono font-bold">
                    {scene.timestamp_start} → {scene.timestamp_end}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono text-[10px]">
                    Scene #{scene.scene_number} ({scene.duration_seconds}s)
                  </span>
                  {scene.chapter_title && (
                    <span className="text-slate-400 font-sans text-xs italic">
                      • {scene.chapter_title}
                    </span>
                  )}
                </div>
                <p className="text-slate-100 text-sm sm:text-base leading-relaxed pl-1 font-serif">
                  {scene.narration_script}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Production Teleprompter Meta Footer with Pop Colors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="p-4 rounded-2xl bg-black/50 border border-cyan-500/20 flex items-center gap-3 shadow-md">
          <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Word Count</div>
            <div className="text-sm font-bold text-cyan-300 font-mono">{wordCount} words</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-black/50 border border-amber-500/20 flex items-center gap-3 shadow-md">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Est. Spoken Time</div>
            <div className="text-sm font-bold text-amber-300 font-mono">{estFormatted}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-black/50 border border-purple-500/20 flex items-center gap-3 shadow-md">
          <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-400/30 text-purple-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Pacing Speed</div>
            <div className="text-sm font-bold text-purple-300 font-mono">{pacingWpm} WPM</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-black/50 border border-emerald-500/20 flex items-center gap-3 shadow-md">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Scene Segments</div>
            <div className="text-sm font-bold text-emerald-400 font-mono">{storyboard.scenes.length} Scenes</div>
          </div>
        </div>
      </div>
    </div>
  );
};
