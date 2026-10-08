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
  UserCheck,
  Check
} from 'lucide-react';

const ICON_MAP: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  Zap: { icon: <Zap className="w-5 h-5 text-amber-400" />, color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
  ShieldAlert: { icon: <ShieldAlert className="w-5 h-5 text-rose-400" />, color: 'text-rose-400', bg: 'bg-rose-500/15 border-rose-500/30' },
  Landmark: { icon: <Landmark className="w-5 h-5 text-emerald-400" />, color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  Eye: { icon: <Eye className="w-5 h-5 text-cyan-400" />, color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-400/30' },
  Flame: { icon: <Flame className="w-5 h-5 text-orange-400" />, color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' },
  Smile: { icon: <Smile className="w-5 h-5 text-yellow-400" />, color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' },
  Sliders: { icon: <Sliders className="w-5 h-5 text-purple-400" />, color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/30' },
  BookOpen: { icon: <BookOpen className="w-5 h-5 text-amber-300" />, color: 'text-amber-300', bg: 'bg-amber-500/15 border-amber-500/30' },
  Cross: { icon: <Cross className="w-5 h-5 text-rose-300" />, color: 'text-rose-300', bg: 'bg-rose-500/15 border-rose-500/30' },
  Trophy: { icon: <Trophy className="w-5 h-5 text-yellow-400" />, color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' },
  Activity: { icon: <Activity className="w-5 h-5 text-emerald-400" />, color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  Brain: { icon: <Brain className="w-5 h-5 text-purple-300" />, color: 'text-purple-300', bg: 'bg-purple-500/15 border-purple-500/30' },
  Compass: { icon: <Compass className="w-5 h-5 text-sky-400" />, color: 'text-sky-400', bg: 'bg-sky-500/15 border-sky-400/30' },
  Skull: { icon: <Skull className="w-5 h-5 text-slate-400" />, color: 'text-slate-400', bg: 'bg-slate-500/15 border-slate-500/30' },
  Clock: { icon: <Clock className="w-5 h-5 text-indigo-400" />, color: 'text-indigo-400', bg: 'bg-indigo-500/15 border-indigo-500/30' },
  Sparkles: { icon: <Sparkles className="w-5 h-5 text-cyan-400" />, color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-400/30' }
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
      {/* Category Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <label className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Production Genre & Visual Style</span>
        </label>

        {/* Category Filter Pills with Pop Colors */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-black/50 border border-white/[0.08] rounded-xl">
          {NICHE_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                disabled={disabled}
                onClick={() => setActiveCategory(cat.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-glow-cyan/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Spacious Listed Rows (Listed Out instead of crowded grid) */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        {filteredNiches.map((niche) => {
          const isSelected = selectedNicheId === niche.id;
          const iconMeta = ICON_MAP[niche.iconName] || {
            icon: <Sparkles className="w-5 h-5 text-cyan-400" />,
            color: 'text-cyan-400',
            bg: 'bg-cyan-500/15 border-cyan-400/30'
          };

          return (
            <div
              key={niche.id}
              onClick={() => !disabled && onSelectNiche(niche.id)}
              className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-xl ${
                isSelected
                  ? 'bg-gradient-to-r from-[#06152F] via-[#041024] to-[#020914] border-cyan-400 shadow-glow-cyan/20 ring-1 ring-cyan-400/60'
                  : 'bg-[#030714]/80 border-white/[0.07] hover:border-white/20 hover:bg-[#060E22]/80'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {/* Left: Pop Icon + Info */}
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <div className={`p-2.5 rounded-xl border shrink-0 ${iconMeta.bg} shadow-md`}>
                  {iconMeta.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <h4 className="text-sm font-bold text-white tracking-tight truncate">
                      {niche.name}
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 font-semibold uppercase">
                      {niche.badge}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      Character Consistency
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1 leading-relaxed">
                    {niche.description}
                  </p>
                </div>
              </div>

              {/* Right: Select Action with Pop Glow */}
              <div className="flex items-center gap-2.5 shrink-0 sm:self-center">
                {isSelected ? (
                  <span className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-glow-cyan/40">
                    <Check className="w-3.5 h-3.5" />
                    <span>Selected</span>
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl border border-white/[0.08] hover:border-cyan-400/40 bg-black/40 transition-colors">
                    Select
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
