import React from 'react';
import { Composition } from 'remotion';
import { NarratedStory } from './NarratedStory';
import { defaultStoryboardProps } from './Composition';
import { Storyboard } from '../types';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="NarratedStory"
      component={NarratedStory as any}
      durationInFrames={420}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        storyboard: defaultStoryboardProps
      }}
      calculateMetadata={async ({ props }) => {
        const sb: Storyboard = (props as any)?.storyboard || defaultStoryboardProps;
        const totalDuration = (sb.scenes || []).reduce(
          (acc, sc) => acc + (sc.duration_in_frames || 90),
          0
        );
        return {
          durationInFrames: Math.max(30, totalDuration),
          fps: sb.fps || 30,
          width: sb.width || 1080,
          height: sb.height || 1920
        };
      }}
    />
  );
};
