'use client';

import React from 'react';
import { DURATION_PRESETS } from '@/lib/presets';
import { formatTimestamp } from '@/lib/generator/timing';
import { Clock } from 'lucide-react';

interface DurationSliderProps {
  value: number; // in seconds
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const DurationSlider: React.FC<DurationSliderProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent-cyan" />
          Target Runtime
        </label>
        <div className="flex items-center gap-2 bg-surface px-3 py-1 rounded-full border border-border">
          <span className="text-xs text-slate-400">Total Duration:</span>
          <span className="font-mono text-sm font-bold text-accent-cyan">
            {formatTimestamp(value, value >= 3600)}
          </span>
          <span className="text-xs text-slate-400">({value}s)</span>
        </div>
      </div>

      {/* Quick Presets Pills */}
      <div className="flex flex-wrap gap-2">
        {DURATION_PRESETS.map((preset) => {
          const isSelected = value === preset.seconds;
          return (
            <button
              key={preset.label}
              type="button"
              disabled={disabled}
              onClick={() => onChange(preset.seconds)}
              title={preset.desc}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-primary text-white shadow-glow-blue border border-blue-400'
                  : 'bg-surface hover:bg-surface-hover text-slate-300 border border-border'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Custom Slider */}
      <div className="space-y-1.5 pt-1">
        <input
          type="range"
          min={30}
          max={7200}
          step={15}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-accent-cyan focus:outline-none"
        />
        <div className="flex justify-between text-[11px] text-slate-500 font-mono">
          <span>30s (Hook)</span>
          <span>15m (Deep Dive)</span>
          <span>60m (1h Doc)</span>
          <span>120m (2h Epic)</span>
        </div>
      </div>
    </div>
  );
};
