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
  const cleanScript = storyboard.full_script?.trim() ||
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
        `[${s.timestamp_start} - ${s.timestamp_end}] (Scene ${s.scene_number})\n${s.narration_script}`
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
    <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Mic className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-white tracking-tight">Full Voiceover Narration</h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
              Recording Ready
            </span>
          </div>
          <p className="text-xs text-slate-400">
            One cohesive, complete piece of written narrative text formatted for voice actors, teleprompters, or TTS.
          </p>
        </div>

        {/* View Toggle & Copy/Download Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="inline-flex rounded-xl bg-background p-1 border border-border">
            <button
              type="button"
              onClick={() => setDisplayMode('clean')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                displayMode === 'clean'
                  ? 'bg-surface text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
              Clean Prose
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('annotated')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                displayMode === 'annotated'
                  ? 'bg-surface text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              Time-Coded
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-glow-blue"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied Script' : 'Copy Full Script'}
          </button>

          <button
            type="button"
            onClick={handleDownloadTxt}
            className="px-3.5 py-1.5 rounded-xl bg-background hover:bg-surface-hover text-slate-300 hover:text-white border border-border text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-accent-cyan" />
            .TXT
          </button>

          {onOpenInVoiceoverStudio && (
            <button
              type="button"
              onClick={onOpenInVoiceoverStudio}
              className="px-3.5 py-1.5 rounded-xl bg-[#B4532A] hover:bg-[#9A4524] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="Cast a Nigerian or International narrator and produce broadcast audio"
            >
              <Mic className="w-3.5 h-3.5" />
              Open in Voiceover Studio →
            </button>
          )}
        </div>
      </div>

      {/* Script Teleprompter / Reader Card */}
      <div className="relative bg-background/80 border border-border/80 rounded-xl p-6 sm:p-8 backdrop-blur-sm">
        {displayMode === 'clean' ? (
          <div className="prose prose-invert max-w-none text-slate-200 text-base sm:text-lg leading-relaxed font-sans space-y-4">
            {cleanScript.split('\n\n').length > 1 ? (
              cleanScript.split('\n\n').map((para, idx) => (
                <p key={idx} className="leading-relaxed text-slate-200">
                  {para}
                </p>
              ))
            ) : (
              <p className="leading-relaxed text-slate-200">
                {cleanScript}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4 font-mono text-sm">
            {storyboard.scenes.map((scene) => (
              <div
                key={scene.scene_number}
                className="p-3.5 rounded-lg bg-surface/40 border border-border hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1.5 text-xs text-accent-cyan font-bold">
                  <span className="px-2 py-0.5 rounded bg-background border border-border">
                    {scene.timestamp_start} → {scene.timestamp_end}
                  </span>
                  <span className="text-slate-400 font-normal">
                    Scene #{scene.scene_number} ({scene.duration_seconds}s)
                  </span>
                </div>
                <p className="text-slate-200 font-sans text-base leading-relaxed pl-1">
                  {scene.narration_script}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Production Teleprompter Meta Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="p-3.5 rounded-xl bg-background border border-border flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Word Count</div>
            <div className="text-sm font-bold text-white font-mono">{wordCount} words</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-background border border-border flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-cyan/10 text-accent-cyan">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Est. Reading Time</div>
            <div className="text-sm font-bold text-white font-mono">{estFormatted}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-background border border-border flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-purple/10 text-accent-purple">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Pacing Speed</div>
            <div className="text-sm font-bold text-white font-mono">{pacingWpm} WPM</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-background border border-border flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Scene Segments</div>
            <div className="text-sm font-bold text-white font-mono">{storyboard.scenes.length} Scenes</div>
          </div>
        </div>
      </div>
    </div>
  );
};
