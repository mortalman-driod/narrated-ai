'use client';

import React, { useState } from 'react';
import { Scene } from '@/lib/generator/types';
import { Copy, Check, Video, Mic, Compass } from 'lucide-react';

interface SceneCardProps {
  scene: Scene;
}

export const SceneCard: React.FC<SceneCardProps> = ({ scene }) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const wordCount = scene.narration_script.trim().split(/\s+/).filter(Boolean).length;

  const copyToClipboard = (text: string, isPrompt: boolean) => {
    navigator.clipboard.writeText(text);
    if (isPrompt) {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } else {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    }
  };

  return (
    <div className="bg-surface border border-border hover:border-slate-600 rounded-xl p-5 transition-all shadow-sm flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-primary/20 text-primary font-bold text-xs flex items-center justify-center border border-primary/30">
              {scene.scene_number.toString().padStart(2, '0')}
            </span>
            {scene.chapter_title && (
              <span className="text-xs text-slate-400 font-medium truncate max-w-[180px]">
                {scene.chapter_title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 font-mono text-xs px-2.5 py-1 rounded-full bg-background border border-border text-accent-cyan">
              <span>{scene.timestamp_start}</span>
              <span className="text-slate-500">➔</span>
              <span>{scene.timestamp_end}</span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-accent-amber/15 text-accent-amber border border-accent-amber/30">
              {scene.duration_seconds}s
            </span>
          </div>
        </div>

        {/* Voiceover Script */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-accent-emerald" />
              Narration Voiceover ({wordCount} words)
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(scene.narration_script, false)}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedScript ? 'Copied' : 'Copy line'}
            </button>
          </div>
          <p className="text-sm text-slate-100 font-sans leading-relaxed bg-background/50 p-3 rounded-lg border border-border/60">
            "{scene.narration_script}"
          </p>
        </div>

        {/* Visual Prompt for Diffusion Model */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-accent-purple" />
              Visual Prompt (Diffusion Model)
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(scene.visual_prompt, true)}
              className="text-[11px] text-accent-purple hover:text-accent-purple/80 flex items-center gap-1 transition-colors font-medium"
            >
              {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedPrompt ? 'Copied Prompt' : 'Copy prompt'}
            </button>
          </div>
          <div className="relative group">
            <p className="text-xs text-slate-300 font-mono bg-background p-3 rounded-lg border border-border leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
              {scene.visual_prompt}
            </p>
          </div>
        </div>
      </div>

      {/* Camera Direction Pill */}
      <div className="pt-2.5 border-t border-border flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="text-slate-400">Camera:</span>
          <span className="text-slate-200 font-medium italic">{scene.camera_direction}</span>
        </span>
      </div>
    </div>
  );
};
