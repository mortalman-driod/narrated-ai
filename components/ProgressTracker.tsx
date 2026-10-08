'use client';

import React from 'react';
import { Loader2, Sparkles, Layers } from 'lucide-react';

interface ProgressTrackerProps {
  stage: string;
  percent: number;
  message: string;
  isGenerating: boolean;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  stage,
  percent,
  message,
  isGenerating
}) => {
  if (!isGenerating) return null;

  return (
    <div className="bg-surface/90 border border-accent-cyan/40 shadow-glow-cyan/20 rounded-2xl p-6 backdrop-blur-md animate-in fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Synthesizing Storyboard</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent-cyan/20 text-accent-cyan font-mono">
                {percent}%
              </span>
            </h4>
            <p className="text-xs text-slate-300 font-sans mt-0.5">{message}</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-mono">
          <Layers className="w-4 h-4 text-accent-purple" />
          <span>Stage: {stage.toUpperCase()}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-background rounded-full h-2.5 overflow-hidden border border-border p-0.5">
        <div
          className="bg-gradient-to-r from-accent-cyan via-primary to-accent-purple h-full rounded-full transition-all duration-300 shadow-sm"
          style={{ width: `${Math.max(5, percent)}%` }}
        />
      </div>
    </div>
  );
};
