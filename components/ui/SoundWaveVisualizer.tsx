'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface SoundWaveVisualizerProps {
  isPlaying?: boolean;
  barCount?: number;
  color?: string;
  className?: string;
}

export const SoundWaveVisualizer: React.FC<SoundWaveVisualizerProps> = ({
  isPlaying = true,
  barCount = 12,
  color = 'from-cyan-400 to-blue-500',
  className = ''
}) => {
  return (
    <div className={`flex items-end gap-1 h-6 px-1 ${className}`}>
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.span
          key={i}
          animate={
            isPlaying
              ? {
                  height: [
                    `${Math.max(15, (Math.sin(i * 1.2) * 0.5 + 0.5) * 85)}%`,
                    `${Math.max(25, (Math.cos(i * 0.8) * 0.5 + 0.5) * 100)}%`,
                    `${Math.max(10, (Math.sin(i * 2.1) * 0.5 + 0.5) * 65)}%`
                  ]
                }
              : { height: '20%' }
          }
          transition={{
            repeat: Infinity,
            repeatType: 'reverse',
            duration: 0.6 + (i % 5) * 0.12,
            ease: 'easeInOut'
          }}
          className={`w-1 rounded-full bg-gradient-to-t ${color} shadow-sm transition-all`}
          style={{ minHeight: '3px' }}
        />
      ))}
    </div>
  );
};
