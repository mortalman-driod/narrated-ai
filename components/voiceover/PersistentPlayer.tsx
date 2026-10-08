'use client';

import React from 'react';
import { Play, Pause, Square, X, Volume2 } from 'lucide-react';
import { VoiceProfile } from '@/lib/voiceover/types';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { SoundWaveVisualizer } from '@/components/ui/SoundWaveVisualizer';

interface PersistentPlayerProps {
  voice: VoiceProfile | null;
  textSnippet: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  onClose: () => void;
  currentTime?: number;
  duration?: number;
}

export const PersistentPlayer: React.FC<PersistentPlayerProps> = ({
  voice,
  textSnippet,
  isPlaying,
  onTogglePlay,
  onStop,
  onClose,
  currentTime = 0,
  duration = 8
}) => {
  if (!voice) return null;

  const progressPercent = Math.min(100, (currentTime / (duration || 1)) * 100);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#02050E]/95 text-white border-t border-white/[0.1] backdrop-blur-2xl px-4 sm:px-8 py-3.5 shadow-2xl animate-in slide-in-from-bottom duration-300">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Voice Info & Snippet */}
        <div className="flex items-center gap-3 w-full sm:w-auto truncate">
          <AnimatedButton
            type="button"
            variant="cyber"
            onClick={onTogglePlay}
            className="w-10 h-10 !p-0 rounded-xl flex items-center justify-center shrink-0 font-bold"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-amber-300" />}
          </AnimatedButton>

          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{voice.name}</span>
                {isPlaying && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-amber-300 uppercase border border-white/[0.08]">
                {voice.categoryLabel}
              </span>
              <SoundWaveVisualizer isPlaying={isPlaying} barCount={6} color="from-amber-400 to-rose-400" />
            </div>
            <p className="text-xs text-slate-400 truncate max-w-md italic mt-0.5 font-serif">
              "{textSnippet}"
            </p>
          </div>
        </div>

        {/* Center: Waveform Scrubber */}
        <div className="flex-1 w-full max-w-lg px-2 flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-400 w-10 text-right">
            0:{currentTime.toString().padStart(2, '0')}
          </span>

          <div className="flex-1 bg-white/15 h-2 rounded-full overflow-hidden relative">
            <div
              className="bg-gradient-to-r from-amber-500 via-rose-500 to-cyan-500 h-full transition-all duration-200 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <span className="text-[11px] font-mono text-slate-400 w-10">
            0:{duration.toString().padStart(2, '0')}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <AnimatedButton
            type="button"
            variant="secondary"
            onClick={onStop}
            icon={<Square className="w-3 h-3 text-rose-400" />}
            className="text-xs px-3 py-1.5"
          >
            Stop
          </AnimatedButton>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Close Player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
