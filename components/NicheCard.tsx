'use client';

import React, { useState } from 'react';
import { NICHE_PRESETS, NICHE_CATEGORIES, NichePreset } from '@/lib/presets';
import {
  Zap,
  ShieldAlert,
  Landmark,
  Eye,
  Flame,
  Smile,
  Sliders,
  Sparkles,
  BookOpen,
  Cross,
  Trophy,
  Activity,
  Brain,
  Compass,
  Skull,
  Clock,
  UserCheck
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  Zap: <Zap className="w-5 h-5 text-amber-400" />,
  ShieldAlert: <ShieldAlert className="w-5 h-5 text-rose-400" />,
  Landmark: <Landmark className="w-5 h-5 text-emerald-400" />,
  Eye: <Eye className="w-5 h-5 text-cyan-400" />,
  Flame: <Flame className="w-5 h-5 text-orange-400" />,
  Smile: <Smile className="w-5 h-5 text-yellow-400" />,
  Sliders: <Sliders className="w-5 h-5 text-purple-400" />,
  BookOpen: <BookOpen className="w-5 h-5 text-amber-300" />,
  Cross: <Cross className="w-5 h-5 text-rose-300" />,
  Trophy: <Trophy className="w-5 h-5 text-yellow-400" />,
  Activity: <Activity className="w-5 h-5 text-emerald-400" />,
  Brain: <Brain className="w-5 h-5 text-purple-300" />,
  Compass: <Compass className="w-5 h-5 text-sky-400" />,
  Skull: <Skull className="w-5 h-5 text-slate-400" />,
  Clock: <Clock className="w-5 h-5 text-indigo-400" />,
  Sparkles: <Sparkles className="w-5 h-5 text-accent-cyan" />
};

interface NicheSelectorProps {
  selectedNicheId: string;
  onSelectNiche: (nicheId: string) => void;
  disabled?: boolean;
}

export const NicheSelector: React.FC<NicheSelectorProps> = ({
  selectedNicheId,
  onSelectNiche,
  disabled = false
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const allNiches = Object.values(NICHE_PRESETS);

  const filteredNiches =
    activeCategory === 'all'
      ? allNiches
      : allNiches.filter((n) => n.category === activeCategory);

  return (
    <div className="space-y-4">
      {/* Category Pills Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-purple" />
          Content Niche & Character Style
        </label>
        <span className="text-xs text-slate-400">
          Showing {filteredNiches.length} of {allNiches.length} Viral Niches
        </span>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1">
        {NICHE_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              disabled={disabled}
              onClick={() => setActiveCategory(cat.id)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                isActive
                  ? 'bg-primary/20 text-accent-cyan border-accent-cyan/40 shadow-sm'
                  : 'bg-background/80 text-slate-400 border-border hover:text-white hover:bg-surface-hover'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Grid of Niche Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredNiches.map((niche) => {
          const isSelected = selectedNicheId === niche.id;
          return (
            <div
              key={niche.id}
              onClick={() => !disabled && onSelectNiche(niche.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'bg-surface-hover border-accent-cyan shadow-glow-cyan/20 ring-1 ring-accent-cyan'
                  : 'bg-surface border-border hover:border-slate-600 hover:bg-surface-hover/60'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-background/60 border border-border">
                    {ICON_MAP[niche.iconName] || <Sparkles className="w-5 h-5 text-accent-cyan" />}
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-background border border-border text-slate-300">
                    {niche.badge}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">{niche.name}</h4>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {niche.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-400" />
                  Consistent Character
                </span>
                {isSelected && (
                  <span className="text-accent-cyan font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
                    Selected
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
