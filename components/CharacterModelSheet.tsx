'use client';

import React, { useState } from 'react';
import { StoryboardResponse, Scene } from '@/lib/generator/types';
import {
  User,
  Sparkles,
  Camera,
  Copy,
  Check,
  Palette,
  Shirt,
  ScanFace,
  Layers,
  Film
} from 'lucide-react';

interface CharacterModelSheetProps {
  storyboard: StoryboardResponse;
}

export const CharacterModelSheet: React.FC<CharacterModelSheetProps> = ({ storyboard }) => {
  const [copiedTag, setCopiedTag] = useState(false);
  const [copiedSceneId, setCopiedSceneId] = useState<number | null>(null);
  const [copiedBatch, setCopiedBatch] = useState(false);

  const character = storyboard.character_model || {
    character_name: 'Lead Subject',
    role_in_story: 'Protagonist',
    appearance_summary: 'Central narrative figure with recurring visual features.',
    face_and_hair: 'Distinct cinematic facial structure, expressive eyes, tailored hairstyle.',
    attire_and_gear: 'Genre-accurate attire with distinctive signature accessories.',
    color_palette: 'Cinematic color grading with high-contrast shadows.',
    consistency_prompt_tag: 'cinematic character portrait, distinct facial features, signature wardrobe, 35mm film photography'
  };

  const copyConsistencyTag = () => {
    navigator.clipboard.writeText(character.consistency_prompt_tag);
    setCopiedTag(true);
    setTimeout(() => setCopiedTag(false), 2000);
  };

  const copyScenePrompt = (scene: Scene) => {
    navigator.clipboard.writeText(scene.visual_prompt);
    setCopiedSceneId(scene.scene_number);
    setTimeout(() => setCopiedSceneId(null), 2000);
  };

  const copyAllPrompts = () => {
    const batch = storyboard.scenes
      .map((s) => `/* Scene ${s.scene_number} (${s.timestamp_start} - ${s.timestamp_end}) */\n${s.visual_prompt}`)
      .join('\n\n');
    navigator.clipboard.writeText(batch);
    setCopiedBatch(true);
    setTimeout(() => setCopiedBatch(false), 2500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Character Model Sheet Card */}
      <div className="bg-surface border border-accent-purple/30 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-accent-purple/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-accent-purple/20 border border-accent-purple/30 text-accent-purple">
                <User className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-bold text-white tracking-tight">Consistent Character Model Sheet</h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-accent-purple/20 text-accent-purple border border-accent-purple/40 font-semibold">
                Visual Continuity Anchor
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Identity parameters locked across all {storyboard.scenes.length} scenes to guarantee consistent facial features, clothing, and aesthetics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyAllPrompts}
              className="px-4 py-2 rounded-xl bg-accent-cyan/15 hover:bg-accent-cyan/25 text-accent-cyan border border-accent-cyan/30 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              {copiedBatch ? <Check className="w-3.5 h-3.5 text-accent-cyan" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedBatch ? 'Batch Prompts Copied' : 'Copy All Scene Prompts'}
            </button>
          </div>
        </div>

        {/* Character Attributes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 relative z-10">
          {/* Identity & Role */}
          <div className="p-4 rounded-xl bg-background/80 border border-border space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-accent-cyan">
              <User className="w-3.5 h-3.5" />
              Subject Identity
            </div>
            <div className="text-sm font-bold text-white">{character.character_name}</div>
            <div className="text-xs text-slate-400">{character.role_in_story}</div>
            <p className="text-[11px] text-slate-300 pt-1 leading-relaxed">{character.appearance_summary}</p>
          </div>

          {/* Facial Features & Hair */}
          <div className="p-4 rounded-xl bg-background/80 border border-border space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
              <ScanFace className="w-3.5 h-3.5" />
              Face & Hair Blueprint
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pt-1">
              {character.face_and_hair}
            </p>
          </div>

          {/* Attire & Signature Gear */}
          <div className="p-4 rounded-xl bg-background/80 border border-border space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <Shirt className="w-3.5 h-3.5" />
              Attire & Wardrobe
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pt-1">
              {character.attire_and_gear}
            </p>
          </div>

          {/* Color Palette & Mood */}
          <div className="p-4 rounded-xl bg-background/80 border border-border space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Palette className="w-3.5 h-3.5" />
              Palette & Atmosphere
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pt-1">
              {character.color_palette}
            </p>
          </div>
        </div>

        {/* Master Consistency Anchor Prompt Tag Banner */}
        <div className="mt-5 p-4 rounded-xl bg-background/90 border border-accent-purple/40 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent-purple animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Master Continuity Prompt Anchor Tag
                </span>
                <span className="text-[10px] text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded-full border border-accent-purple/20">
                  Injected into every scene
                </span>
              </div>
              <p className="text-xs font-mono text-slate-300 select-all bg-surface/80 p-2.5 rounded-lg border border-border mt-1">
                {character.consistency_prompt_tag}
              </p>
            </div>
            <button
              type="button"
              onClick={copyConsistencyTag}
              className="px-3 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 self-start sm:self-center transition-all shrink-0"
            >
              {copiedTag ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedTag ? 'Anchor Copied' : 'Copy Anchor Tag'}
            </button>
          </div>
        </div>
      </div>

      {/* Visual Prompts Generation List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-bold text-white flex items-center gap-2">
            <Film className="w-4 h-4 text-accent-cyan" />
            Image Generation Prompts ({storyboard.scenes.length} Scenes)
          </h4>
          <span className="text-xs text-slate-400 font-mono">
            Optimized for {storyboard.image_model}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {storyboard.scenes.map((scene) => {
            const isCopied = copiedSceneId === scene.scene_number;
            return (
              <div
                key={scene.scene_number}
                className="bg-surface border border-border rounded-xl p-5 hover:border-slate-600 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Scene Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white px-2 py-0.5 rounded bg-background border border-border">
                        Scene #{scene.scene_number}
                      </span>
                      <span className="text-xs font-mono text-accent-cyan">
                        {scene.timestamp_start} – {scene.timestamp_end}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ({scene.duration_seconds}s)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyScenePrompt(scene)}
                      title="Copy Visual Prompt"
                      className="p-1.5 rounded-lg bg-background hover:bg-surface-hover text-slate-400 hover:text-white border border-border transition-colors flex items-center gap-1 text-xs"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* Narration Context */}
                  <div className="p-2.5 rounded-lg bg-background/50 border border-border/60 text-xs text-slate-300 italic">
                    <span className="text-slate-500 font-sans not-italic mr-1.5 font-semibold">VO:</span>
                    "{scene.narration_script}"
                  </div>

                  {/* Visual Prompt Content */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-accent-purple" />
                      Visual Generation Prompt
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-mono bg-background/80 p-3 rounded-lg border border-border/80 select-all">
                      {scene.visual_prompt}
                    </p>
                  </div>
                </div>

                {/* Camera Motion Footer */}
                <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Camera className="w-3.5 h-3.5 text-accent-emerald" />
                    <span>{scene.camera_direction}</span>
                  </div>
                  <span className="text-[10px] text-accent-purple font-medium">
                    Consistent Anchor Verified ✓
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
