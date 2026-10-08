import React from 'react';
import {
  Audio,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from 'remotion';
import { Scene } from '../types';
import { Subtitles } from './Subtitles';

interface SceneViewProps {
  scene: Scene;
}

function resolveMediaUrl(src?: string): string | undefined {
  if (!src) return undefined;
  if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  const clean = src.replace(/\\/g, '/').replace(/^\/?(public\/)?/, '');
  try {
    return staticFile(clean);
  } catch {
    return src;
  }
}

export const SceneView: React.FC<SceneViewProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const duration = scene.duration_in_frames || 90;

  // Camera Motion (Ken Burns Effect)
  const motion = (scene.camera_motion || 'zoom in').toLowerCase();

  let scale = 1.0;
  let translateX = 0;
  let translateY = 0;

  if (motion.includes('zoom in')) {
    scale = interpolate(frame, [0, duration], [1.0, 1.15], {
      extrapolateRight: 'clamp'
    });
  } else if (motion.includes('zoom out')) {
    scale = interpolate(frame, [0, duration], [1.15, 1.0], {
      extrapolateRight: 'clamp'
    });
  } else if (motion.includes('pan right')) {
    scale = 1.12;
    translateX = interpolate(frame, [0, duration], [-35, 35], {
      extrapolateRight: 'clamp'
    });
  } else if (motion.includes('pan left')) {
    scale = 1.12;
    translateX = interpolate(frame, [0, duration], [35, -35], {
      extrapolateRight: 'clamp'
    });
  } else if (motion.includes('tilt up')) {
    scale = 1.12;
    translateY = interpolate(frame, [0, duration], [30, -30], {
      extrapolateRight: 'clamp'
    });
  } else if (motion.includes('tilt down')) {
    scale = 1.12;
    translateY = interpolate(frame, [0, duration], [-30, 30], {
      extrapolateRight: 'clamp'
    });
  } else {
    scale = interpolate(frame, [0, duration], [1.0, 1.08], {
      extrapolateRight: 'clamp'
    });
  }

  // Fade in at start, fade out at end
  const opacity = interpolate(
    frame,
    [0, 8, duration - 8, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const imageSrc = resolveMediaUrl(scene.image_file);
  const audioSrc = resolveMediaUrl(scene.audio_file);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#05070D',
        opacity
      }}
    >
      {/* Background Media with Camera Motion */}
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          transformOrigin: 'center center',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {imageSrc ? (
          <Img
            src={imageSrc}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle at center, #1E293B 0%, #0F172A 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94A3B8'
            }}
          >
            Scene {scene.scene_id}
          </div>
        )}
      </div>

      {/* Atmospheric Vignette Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          boxShadow: 'inset 0 0 160px rgba(0,0,0,0.85), inset 0 0 80px rgba(0,0,0,0.6)',
          pointerEvents: 'none'
        }}
      />

      {/* Synchronized Narration Audio */}
      {audioSrc && <Audio src={audioSrc} />}

      {/* Burned-in Animated Subtitles */}
      {scene.subtitles && scene.subtitles.length > 0 && (
        <Subtitles
          subtitles={scene.subtitles}
          currentSceneFrame={frame}
        />
      )}
    </div>
  );
};
