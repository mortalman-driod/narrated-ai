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
    <Card3D maxTilt={3} className="w-full">
      <div className="bg-[#030714]/85 border border-white/[0.08] hover:border-cyan-500/50 rounded-2xl p-5 sm:p-6 transition-all duration-300 shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-4">
        <div>
          {/* Top Header */}
          <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-white/[0.08] gap-2">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-glow-cyan/30 shrink-0">
                #{scene.scene_number.toString().padStart(2, '0')}
              </span>
              {scene.chapter_title && (
                <span className="text-sm text-white font-bold tracking-tight">
                  {scene.chapter_title}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 font-mono text-[11px] px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 font-bold">
                <span>{scene.timestamp_start}</span>
                <span className="text-slate-400">➔</span>
                <span>{scene.timestamp_end}</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                {scene.duration_seconds}s cut
              </span>
            </div>
          </div>

          {/* Voiceover Script Block with Pop Styling */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                <span>Synchronized Voiceover ({wordCount} words)</span>
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(scene.narration_script, false)}
                className="text-[11px] text-emerald-300 hover:text-white flex items-center gap-1 transition-colors px-2 py-0.5 rounded-md hover:bg-emerald-500/10 font-medium"
              >
                {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedScript ? 'Copied' : 'Copy narration'}
              </button>
            </div>
            <div className="border-l-4 border-emerald-400 bg-black/60 p-3.5 rounded-xl border border-white/[0.08]">
              <p className="text-sm text-white font-sans leading-relaxed italic">
                "{scene.narration_script}"
              </p>
            </div>
          </div>

          {/* Visual Prompt for Diffusion Model with Pop Styling */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-purple-400" />
                <span>Diffusion Prompt ({scene.camera_direction})</span>
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
            <div className="border-l-4 border-purple-500 bg-black/60 p-3.5 rounded-xl border border-white/[0.08]">
              <p className="text-xs text-slate-200 font-mono leading-relaxed">
                {scene.visual_prompt}
              </p>
            </div>
          </div>
        </div>

        {/* Camera Direction / Motion Pill */}
        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-slate-400">
            <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-slate-400">Cinematography:</span>
            <span className="text-cyan-300 font-semibold italic truncate">{scene.camera_direction}</span>
          </span>
        </div>
      </div>
    </Card3D>
  );
};
