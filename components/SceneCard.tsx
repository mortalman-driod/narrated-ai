'use client';

import React, { useState } from 'react';
import { Scene } from '@/lib/generator/types';
import { Copy, Check, Video, Mic, Compass } from 'lucide-react';
import { Card3D } from './ui/Card3D';

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
    <Card3D maxTilt={6} className="h-full">
      <div className="bg-[#030714]/85 border border-white/[0.08] hover:border-cyan-500/50 rounded-2xl p-5 transition-all duration-300 shadow-xl hover:shadow-cyan-500/10 backdrop-blur-md flex flex-col justify-between h-full group">
        <div>
          {/* Top Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-300 font-bold text-xs flex items-center justify-center border border-cyan-400/30 shadow-glow-cyan/20">
                {scene.scene_number.toString().padStart(2, '0')}
              </span>
              {scene.chapter_title && (
                <span className="text-xs text-slate-300 font-medium truncate max-w-[180px]">
                  {scene.chapter_title}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 font-mono text-[11px] px-2.5 py-1 rounded-full bg-black/40 border border-white/[0.08] text-cyan-300">
                <span>{scene.timestamp_start}</span>
                <span className="text-slate-500">➔</span>
                <span>{scene.timestamp_end}</span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {scene.duration_seconds}s
              </span>
            </div>
          </div>

          {/* Voiceover Script */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                Narration Voiceover ({wordCount} words)
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(scene.narration_script, false)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-0.5 rounded-md hover:bg-white/5"
              >
                {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedScript ? 'Copied' : 'Copy line'}
              </button>
            </div>
            <p className="text-sm text-slate-100 font-sans leading-relaxed bg-black/30 p-3 rounded-xl border border-white/[0.06] italic">
              "{scene.narration_script}"
            </p>
          </div>

          {/* Visual Prompt for Diffusion Model */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-purple-400" />
                Visual Prompt (Diffusion Model)
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(scene.visual_prompt, true)}
                className="text-[11px] text-purple-300 hover:text-purple-200 flex items-center gap-1 transition-colors font-medium px-2 py-0.5 rounded-md hover:bg-purple-500/10"
              >
                {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedPrompt ? 'Copied Prompt' : 'Copy prompt'}
              </button>
            </div>
            <div className="relative group/prompt">
              <p className="text-xs text-slate-300 font-mono bg-black/40 p-3 rounded-xl border border-white/[0.06] leading-relaxed line-clamp-3 group-hover/prompt:line-clamp-none transition-all">
                {scene.visual_prompt}
              </p>
            </div>
          </div>
        </div>

        {/* Camera Direction Pill */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400">Motion:</span>
            <span className="text-slate-200 font-medium italic truncate">{scene.camera_direction}</span>
          </span>
        </div>
      </div>
    </Card3D>
  );
};
