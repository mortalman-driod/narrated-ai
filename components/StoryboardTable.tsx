'use client';

import React, { useState } from 'react';
import { Scene } from '@/lib/generator/types';
import { Copy, Check, Search } from 'lucide-react';

interface StoryboardTableProps {
  scenes: Scene[];
}

export const StoryboardTable: React.FC<StoryboardTableProps> = ({ scenes }) => {
  const [filterText, setFilterText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const filteredScenes = scenes.filter(
    (s) =>
      s.narration_script.toLowerCase().includes(filterText.toLowerCase()) ||
      s.visual_prompt.toLowerCase().includes(filterText.toLowerCase()) ||
      s.camera_direction.toLowerCase().includes(filterText.toLowerCase()) ||
      s.scene_number.toString().includes(filterText)
  );

  return (
    <div className="space-y-4">
      {/* Search Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search dialogue, prompts, camera..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-accent-cyan"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Showing {filteredScenes.length} of {scenes.length} scenes
        </span>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-background/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3.5 w-14 text-center">#</th>
              <th className="py-3 px-3.5 w-32">Window</th>
              <th className="py-3 px-3.5 w-16 text-center">Dur</th>
              <th className="py-3 px-4 w-1/3">Voiceover Narration</th>
              <th className="py-3 px-4">Visual Scene Prompt (Diffusion)</th>
              <th className="py-3 px-3.5 w-40">Camera Motion</th>
              <th className="py-3 px-3.5 w-20 text-center">Copy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs">
            {filteredScenes.map((scene) => {
              const isCopied = copiedId === `prompt-${scene.scene_number}`;
              return (
                <tr
                  key={scene.scene_number}
                  className="hover:bg-surface-hover/50 transition-colors group"
                >
                  <td className="py-3.5 px-3.5 text-center font-bold text-slate-400">
                    {scene.scene_number}
                  </td>
                  <td className="py-3.5 px-3.5 font-mono text-[11px] text-accent-cyan whitespace-nowrap">
                    {scene.timestamp_start} - {scene.timestamp_end}
                  </td>
                  <td className="py-3.5 px-3.5 text-center">
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold text-[11px] border border-amber-500/20">
                      {scene.duration_seconds}s
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-sans text-slate-200 leading-relaxed">
                    "{scene.narration_script}"
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300 leading-relaxed">
                    <div className="line-clamp-2 group-hover:line-clamp-none transition-all">
                      {scene.visual_prompt}
                    </div>
                  </td>
                  <td className="py-3.5 px-3.5 text-slate-300 italic text-[11px]">
                    {scene.camera_direction}
                  </td>
                  <td className="py-3.5 px-3.5 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(scene.visual_prompt, `prompt-${scene.scene_number}`)
                      }
                      title="Copy Visual Prompt"
                      className="p-1.5 rounded-lg bg-background hover:bg-slate-800 text-slate-400 hover:text-white border border-border transition-colors"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
