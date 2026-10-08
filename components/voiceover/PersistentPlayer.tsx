'use client';

import React from 'react';
import { VoiceProfile } from '@/lib/voiceover/types';

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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1C1917] text-white border-t border-[#38332E] px-4 sm:px-8 py-3.5 shadow-2xl animate-in slide-in-from-bottom duration-300">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Voice Info & Snippet */}
        <div className="flex items-center gap-3 w-full sm:w-auto truncate">
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-10 h-10 rounded-[6px] bg-[#B4532A] hover:bg-[#9A4524] flex items-center justify-center text-white shrink-0 font-bold transition-transform active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>

          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="text-sm font-serif font-bold text-white">{voice.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-300 uppercase">
                {voice.categoryLabel}
              </span>
            </div>
            <p className="text-xs text-[#E8E2D9]/70 truncate max-w-md italic mt-0.5">
              "{textSnippet}"
            </p>
          </div>
        </div>

        {/* Center: Waveform Scrubber */}
        <div className="flex-1 w-full max-w-lg px-2 flex items-center gap-3">
          <span className="text-[11px] font-mono text-[#E8E2D9]/60 w-10 text-right">
            0:{currentTime.toString().padStart(2, '0')}
          </span>

          <div className="flex-1 bg-white/15 h-2 rounded-full overflow-hidden relative">
            <div
              className="bg-[#B4532A] h-full transition-all duration-200 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <span className="text-[11px] font-mono text-[#E8E2D9]/60 w-10">
            0:{duration.toString().padStart(2, '0')}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onStop}
            className="text-xs text-[#E8E2D9]/80 hover:text-white px-2 py-1 rounded border border-white/20"
          >
            Stop
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[#E8E2D9]/60 hover:text-white p-1"
            title="Close Player"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};
