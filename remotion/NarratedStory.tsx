import React from 'react';
import {
  interpolate,
  Series,
  useCurrentFrame,
  useVideoConfig
} from 'remotion';
import { Storyboard } from '../types';
import { SceneView } from './SceneView';

export interface NarratedStoryProps {
  storyboard: Storyboard;
}

export const NarratedStory: React.FC<NarratedStoryProps> = ({ storyboard }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();

  const scenes = storyboard?.scenes || [];

  // Overall progress bar (0 to 100%)
  const progressPercent = durationInFrames > 0
    ? Math.min(100, (frame / durationInFrames) * 100)
    : 0;

  // Header fade-in
  const headerOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp'
  });

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        fontFamily: 'Montserrat, Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Sequential Scenes */}
      <Series>
        {scenes.map((scene) => (
          <Series.Sequence
            key={scene.scene_id}
            durationInFrames={scene.duration_in_frames || 90}
          >
            <SceneView scene={scene} />
          </Series.Sequence>
        ))}
      </Series>

      {/* Top Header Badge */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: headerOpacity,
          zIndex: 60,
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 30,
            padding: '10px 24px'
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#FF0055',
              boxShadow: '0 0 10px #FF0055'
            }}
          />
          <span
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '1.5px',
              textTransform: 'uppercase'
            }}
          >
            {storyboard.title || 'Narrated AI'}
          </span>
        </div>
      </div>

      {/* Top Progress Bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: 5,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          zIndex: 100
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #00F0FF 0%, #FFE600 100%)',
            boxShadow: '0 0 12px rgba(0, 240, 255, 0.8)'
          }}
        />
      </div>
    </div>
  );
};
