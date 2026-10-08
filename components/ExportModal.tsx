'use client';

import React, { useState } from 'react';
import { StoryboardResponse } from '@/lib/generator/types';
import {
  Download,
  FileJson,
  FileText,
  FileSpreadsheet,
  Copy,
  Check,
  X,
  Mic,
  User
} from 'lucide-react';

interface ExportModalProps {
  storyboard: StoryboardResponse;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  storyboard,
  isOpen,
  onClose
}) => {
  const [copiedBatch, setCopiedBatch] = useState(false);

  if (!isOpen) return null;

  // 1. Full Voiceover Script (.txt)
  const downloadVoiceoverTxt = () => {
    const fullScript = storyboard.full_script?.trim() ||
      storyboard.scenes.map((s) => s.narration_script).join(' ');

    const content = `TITLE: ${storyboard.title}
NICHE: ${storyboard.niche} (${storyboard.tone} tone)
TOTAL DURATION: ${storyboard.total_duration} | PACING: ${storyboard.pacing_wpm} WPM
SCENES: ${storyboard.scenes.length}

============================================================
CONTINUOUS VOICEOVER NARRATION
============================================================

${fullScript}

============================================================
TIME-CODED SCENE DIALOGUE
============================================================

${storyboard.scenes
  .map(
    (s) =>
      `[${s.timestamp_start} - ${s.timestamp_end}] (Scene ${s.scene_number}, ${s.duration_seconds}s):\n${s.narration_script}`
  )
  .join('\n\n')}
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storyboard.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_voiceover.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 2. Character Model Sheet (.md)
  const downloadCharacterSheet = () => {
    const char = storyboard.character_model || {
      character_name: 'Lead Subject',
      role_in_story: 'Protagonist',
      appearance_summary: 'Central character',
      face_and_hair: 'Distinct facial features',
      attire_and_gear: 'Signature attire',
      color_palette: 'Cinematic tones',
      consistency_prompt_tag: 'cinematic character portrait'
    };

    const content = `# Character Model Sheet: ${char.character_name}
**Story Title:** ${storyboard.title}  
**Niche:** ${storyboard.niche}  
**Role:** ${char.role_in_story}  

## Core Identity & Appearance
${char.appearance_summary}

## Facial Structure & Hair
${char.face_and_hair}

## Attire, Wardrobe & Signature Gear
${char.attire_and_gear}

## Color Palette & Atmospheric Grading
${char.color_palette}

## Master Consistency Anchor Prompt Tag
> **Note:** Embed this exact tag into your text-to-image prompts (Midjourney, Flux, Stable Diffusion) to guarantee facial and attire continuity across scenes.

\`\`\`
${char.consistency_prompt_tag}
\`\`\`
`;

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storyboard.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_character_model.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 3. JSON Export
  const downloadJSON = () => {
    const data = JSON.stringify(storyboard, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storyboard.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_storyboard.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 4. CSV Export
  const downloadCSV = () => {
    const headers = ['Scene', 'Start', 'End', 'Duration_Sec', 'Narration_Script', 'Visual_Prompt', 'Camera_Direction'];
    const rows = storyboard.scenes.map((s) => [
      s.scene_number,
      `"${s.timestamp_start}"`,
      `"${s.timestamp_end}"`,
      s.duration_seconds,
      `"${s.narration_script.replace(/"/g, '""')}"`,
      `"${s.visual_prompt.replace(/"/g, '""')}"`,
      `"${s.camera_direction.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storyboard.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_storyboard.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 5. Markdown Production Document
  const downloadMarkdown = () => {
    const mdLines = [
      `# Storyboard: ${storyboard.title}`,
      `Total Duration: ${storyboard.total_duration} (${storyboard.scenes.length} scenes) | Pacing: ${storyboard.pacing_wpm} WPM`,
      '',
      '## Voiceover Narration',
      storyboard.full_script || storyboard.scenes.map((s) => s.narration_script).join(' '),
      '',
      '## Production Scenes',
      '| # | Window | Dur | Narration | Visual Prompt | Camera |',
      '| :---: | :---: | :---: | :--- | :--- | :--- |',
      ...storyboard.scenes.map(
        (s) =>
          `| ${s.scene_number} | \`${s.timestamp_start} - ${s.timestamp_end}\` | \`${s.duration_seconds}s\` | "${s.narration_script.replace(/\|/g, '\\|')}" | ${s.visual_prompt.replace(/\|/g, '\\|')} | *${s.camera_direction}* |`
      )
    ];

    const blob = new Blob([mdLines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storyboard.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_storyboard.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy batch prompts
  const copyAllPrompts = () => {
    const batch = storyboard.scenes
      .map((s) => `/* Scene ${s.scene_number} (${s.timestamp_start} - ${s.timestamp_end}) */\n${s.visual_prompt}`)
      .join('\n\n');
    navigator.clipboard.writeText(batch);
    setCopiedBatch(true);
    setTimeout(() => setCopiedBatch(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-background transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <Download className="w-5 h-5 text-accent-cyan" />
          Export Production Artifacts
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Download formatted assets tailored for voice actors, teleprompters, diffusion generators, and video editors.
        </p>

        {/* Export Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {/* Full Script TXT Button */}
          <button
            type="button"
            onClick={downloadVoiceoverTxt}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-background border border-border hover:border-emerald-400 hover:bg-surface-hover/80 transition-all group"
          >
            <Mic className="w-6 h-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">Full Voiceover</span>
            <span className="text-[10px] text-slate-400">Plain Text (.txt)</span>
          </button>

          {/* Character Model Sheet Button */}
          <button
            type="button"
            onClick={downloadCharacterSheet}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-background border border-border hover:border-accent-purple hover:bg-surface-hover/80 transition-all group"
          >
            <User className="w-6 h-6 text-accent-purple mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">Character Model</span>
            <span className="text-[10px] text-slate-400">Continuity Sheet (.md)</span>
          </button>

          {/* JSON Button */}
          <button
            type="button"
            onClick={downloadJSON}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-background border border-border hover:border-amber-400 hover:bg-surface-hover/80 transition-all group"
          >
            <FileJson className="w-6 h-6 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">Full JSON</span>
            <span className="text-[10px] text-slate-400">Complete API Data</span>
          </button>

          {/* Markdown Button */}
          <button
            type="button"
            onClick={downloadMarkdown}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-background border border-border hover:border-cyan-400 hover:bg-surface-hover/80 transition-all group"
          >
            <FileText className="w-6 h-6 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">Storyboard MD</span>
            <span className="text-[10px] text-slate-400">Tables & Formats</span>
          </button>

          {/* CSV Button */}
          <button
            type="button"
            onClick={downloadCSV}
            className="flex flex-col items-center justify-center p-4 rounded-xl bg-background border border-border hover:border-blue-400 hover:bg-surface-hover/80 transition-all group"
          >
            <FileSpreadsheet className="w-6 h-6 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">NLE Cut CSV</span>
            <span className="text-[10px] text-slate-400">Premiere / DaVinci</span>
          </button>
        </div>

        {/* Copy All Prompts Bar */}
        <div className="p-4 rounded-xl bg-background border border-border flex items-center justify-between">
          <div>
            <h5 className="text-xs font-bold text-white mb-0.5">Copy Batch Visual Prompts</h5>
            <p className="text-[11px] text-slate-400">All {storyboard.scenes.length} diffusion prompts formatted with character anchors</p>
          </div>
          <button
            type="button"
            onClick={copyAllPrompts}
            className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            {copiedBatch ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedBatch ? 'Copied All' : 'Copy All'}
          </button>
        </div>
      </div>
    </div>
  );
};
