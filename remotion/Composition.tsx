import React from 'react';
import { NarratedStory, NarratedStoryProps } from './NarratedStory';
import { Storyboard } from '../types';

export { NarratedStory };
export type { NarratedStoryProps };

/**
 * Default sample storyboard for Remotion Studio preview
 */
export const defaultStoryboardProps: Storyboard = {
  title: 'The Mystery of Flight 19',
  topic: 'The Mystery of Flight 19',
  fps: 30,
  width: 1080,
  height: 1920,
  total_duration_in_frames: 420,
  scenes: [
    {
      scene_id: 1,
      voiceover_text: 'December 5th, 1945. Five Navy torpedo bombers take off from Fort Lauderdale into a calm, blue afternoon sky.',
      visual_prompt: 'Cinematic establishing shot of five 1945 US Navy Avenger bombers flying in tight formation over a calm blue Atlantic ocean, golden hour sunlight reflecting off the wings, vintage film tone, hyper-realistic, 8k',
      camera_motion: 'zoom in',
      duration_in_seconds: 4.0,
      duration_in_frames: 120,
      subtitles: [
        { text: 'December', start_frame: 0, end_frame: 15 },
        { text: '5th,', start_frame: 15, end_frame: 25 },
        { text: '1945.', start_frame: 25, end_frame: 40 },
        { text: 'Five', start_frame: 40, end_frame: 50 },
        { text: 'Navy', start_frame: 50, end_frame: 60 },
        { text: 'bombers', start_frame: 60, end_frame: 75 },
        { text: 'take', start_frame: 75, end_frame: 85 },
        { text: 'off', start_frame: 85, end_frame: 95 },
        { text: 'into', start_frame: 95, end_frame: 105 },
        { text: 'the', start_frame: 105, end_frame: 110 },
        { text: 'sky.', start_frame: 110, end_frame: 120 }
      ]
    },
    {
      scene_id: 2,
      voiceover_text: "Hours later, the flight leader's voice crackled through the radio in panic: 'Both my compasses are wild, and we cannot find west.'",
      visual_prompt: 'Close up inside a vintage 1940s airplane cockpit, spinning erratic compass gauges, trembling gloved hands on the control stick, misty dark clouds outside the canopy, dramatic shadows, cinematic lighting',
      camera_motion: 'slow pan right',
      duration_in_seconds: 5.0,
      duration_in_frames: 150,
      subtitles: [
        { text: 'Hours', start_frame: 0, end_frame: 15 },
        { text: 'later,', start_frame: 15, end_frame: 30 },
        { text: 'the', start_frame: 30, end_frame: 40 },
        { text: 'leader', start_frame: 40, end_frame: 55 },
        { text: 'crackled', start_frame: 55, end_frame: 75 },
        { text: 'in', start_frame: 75, end_frame: 85 },
        { text: 'panic:', start_frame: 85, end_frame: 105 },
        { text: 'Compasses', start_frame: 105, end_frame: 125 },
        { text: 'are', start_frame: 125, end_frame: 135 },
        { text: 'wild.', start_frame: 135, end_frame: 150 }
      ]
    },
    {
      scene_id: 3,
      voiceover_text: 'Neither wreckage nor bodies were ever recovered. Flight 19 remains aviation’s greatest unsolved enigma.',
      visual_prompt: 'Underwater abyss in the deep ocean, sunbeams piercing through murky water revealing empty ocean floor, cinematic mystery, hauntingly quiet, moody color grading',
      camera_motion: 'zoom out',
      duration_in_seconds: 5.0,
      duration_in_frames: 150,
      subtitles: [
        { text: 'Neither', start_frame: 0, end_frame: 18 },
        { text: 'wreckage', start_frame: 18, end_frame: 40 },
        { text: 'nor', start_frame: 40, end_frame: 55 },
        { text: 'bodies', start_frame: 55, end_frame: 75 },
        { text: 'were', start_frame: 75, end_frame: 90 },
        { text: 'ever', start_frame: 90, end_frame: 105 },
        { text: 'found.', start_frame: 105, end_frame: 125 },
        { text: 'Lost', start_frame: 125, end_frame: 135 },
        { text: 'forever.', start_frame: 135, end_frame: 150 }
      ]
    }
  ]
};

export const Composition: React.FC<NarratedStoryProps> = ({ storyboard = defaultStoryboardProps }) => {
  return <NarratedStory storyboard={storyboard} />;
};
