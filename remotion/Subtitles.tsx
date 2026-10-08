import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SubtitleWord } from '../types';

interface SubtitlesProps {
  subtitles: SubtitleWord[];
  currentSceneFrame: number;
}

export const Subtitles: React.FC<SubtitlesProps> = ({ subtitles, currentSceneFrame }) => {
  const { fps } = useVideoConfig();

  if (!subtitles || subtitles.length === 0) {
    return null;
  }

  // Find the active word index
  const activeIndex = subtitles.findIndex(
    (w) => currentSceneFrame >= w.start_frame && currentSceneFrame <= w.end_frame
  );

  // Group into readable chunks of ~4-5 words centered around the active word
  const chunkSize = 4;
  const currentChunkIndex = activeIndex >= 0 ? Math.floor(activeIndex / chunkSize) : 0;
  const chunkStart = currentChunkIndex * chunkSize;
  const chunkWords = subtitles.slice(chunkStart, chunkStart + chunkSize);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '18%',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 40px',
        zIndex: 50,
        pointerEvents: 'none'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px 16px',
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(12px)',
          padding: '16px 28px',
          borderRadius: '24px',
          border: '1.5px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          maxWidth: '92%'
        }}
      >
        {chunkWords.map((word, i) => {
          const globalWordIndex = chunkStart + i;
          const isActive = globalWordIndex === activeIndex;
          const isPast = globalWordIndex < activeIndex;

          const scale = isActive ? 1.12 : 1.0;
          const color = isActive
            ? '#FFE600' // High-energy yellow
            : isPast
            ? '#FFFFFF'
            : 'rgba(255, 255, 255, 0.6)';

          const textShadow = isActive
            ? '0 0 16px rgba(255, 230, 0, 0.7), 0 2px 8px rgba(0, 0, 0, 0.9)'
            : '0 2px 6px rgba(0, 0, 0, 0.8)';

          return (
            <span
              key={`${globalWordIndex}-${word.text}`}
              style={{
                fontFamily: 'Montserrat, Inter, system-ui, -apple-system, sans-serif',
                fontSize: '44px',
                fontWeight: 900,
                color,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                transform: `scale(${scale})`,
                transition: 'transform 0.08s ease-out, color 0.08s ease-out',
                textShadow,
                display: 'inline-block'
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
