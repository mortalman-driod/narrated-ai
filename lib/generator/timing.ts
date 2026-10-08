import { Scene } from './types';

/**
 * Formats seconds into MM:SS or HH:MM:SS format
 */
export function formatTimestamp(totalSeconds: number, forceHours: boolean = false): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0 || forceHours) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Calculates raw spoken duration in seconds based on word count, syllable cadence, and pauses
 */
export function calculateNarrationDuration(text: string, wpm: number): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 4;

  const secondsPerWord = 60 / wpm;
  let duration = words.length * secondsPerWord;

  // Natural pause adjustments
  const minorPauses = (text.match(/[,;:\-—]/g) || []).length;
  const majorPauses = (text.match(/[.!?]/g) || []).length;
  duration += minorPauses * 0.25 + majorPauses * 0.45;

  return duration;
}

/**
 * Enforces scene durations strictly between 4 and 8 seconds,
 * aligns the cumulative duration with targetSeconds, and formats timestamps.
 */
export function enforceSceneTimingBounds(
  rawScenes: Array<{
    narration_script: string;
    visual_prompt: string;
    camera_direction: string;
    duration_seconds?: number;
    act_number?: number;
    chapter_title?: string;
  }>,
  targetDurationSeconds: number,
  wpm: number,
  startOffsetSeconds: number = 0,
  startingSceneNumber: number = 1,
  forceHours: boolean = false
): Scene[] {
  if (rawScenes.length === 0) return [];

  // Step 0: Consolidate excessive micro-scenes if scene count exceeds maximum allowed for targetDurationSeconds
  // Professional video editing pacing: each scene runs for 6.5s to 8.5s (average ~7.5s).
  // A 60s video strictly contains 7 to 9 scenes (never 15+ or 33 micro-prompts!).
  // A 30s video strictly contains 4 to 5 scenes.
  const maxAllowedScenes = Math.max(2, Math.floor(targetDurationSeconds / 6.0));
  const optimalSceneCount = Math.max(2, Math.round(targetDurationSeconds / 7.5));

  let preparedScenes = rawScenes;
  if (rawScenes.length > maxAllowedScenes && rawScenes.length > 2) {
    const targetCount = optimalSceneCount;
    const consolidated: typeof rawScenes = [];
    const chunkSize = rawScenes.length / targetCount;

    for (let i = 0; i < targetCount; i++) {
      const startIdx = Math.floor(i * chunkSize);
      const endIdx = i === targetCount - 1 ? rawScenes.length : Math.floor((i + 1) * chunkSize);
      const group = rawScenes.slice(startIdx, endIdx);

      if (group.length === 0) continue;

      const mergedNarration = group.map((s) => s.narration_script.trim()).filter(Boolean).join(' ');
      // Take the most detailed visual prompt, or merge them cleanly
      const bestPrompt = group.reduce(
        (best, cur) => (cur.visual_prompt.length > best.visual_prompt.length ? cur : best),
        group[0]
      ).visual_prompt;
      const bestCamera = group[0].camera_direction || 'Cinematic tracking shot';

      consolidated.push({
        narration_script: mergedNarration,
        visual_prompt: bestPrompt,
        camera_direction: bestCamera,
        act_number: group[0].act_number,
        chapter_title: group[0].chapter_title
      });
    }

    preparedScenes = consolidated;
  }

  // Step 1: Initial clamp (strictly 4s to 8s)
  const initial = preparedScenes.map((s, idx) => {
    const rawSecs = s.duration_seconds || calculateNarrationDuration(s.narration_script, wpm);
    const clampedSecs = Math.max(4, Math.min(8, Math.round(rawSecs)));
    return {
      ...s,
      scene_number: startingSceneNumber + idx,
      duration_seconds: clampedSecs
    };
  });

  // Step 2: Re-align total sum to targetDurationSeconds without violating [4, 8]
  let currentTotal = initial.reduce((sum, s) => sum + s.duration_seconds, 0);
  let difference = targetDurationSeconds - currentTotal;

  let iterations = 0;
  while (difference !== 0 && iterations < 150) {
    iterations++;
    let adjusted = false;

    if (difference > 0) {
      for (const sc of initial) {
        if (difference === 0) break;
        if (sc.duration_seconds < 8) {
          sc.duration_seconds += 1;
          difference -= 1;
          adjusted = true;
        }
      }
    } else {
      for (const sc of initial) {
        if (difference === 0) break;
        if (sc.duration_seconds > 4) {
          sc.duration_seconds -= 1;
          difference += 1;
          adjusted = true;
        }
      }
    }

    if (!adjusted) break;
  }

  // Step 3: Compute continuous timestamps
  let currentSec = startOffsetSeconds;
  const result: Scene[] = [];

  for (let i = 0; i < initial.length; i++) {
    const sc = initial[i];
    const start = currentSec;
    const end = currentSec + sc.duration_seconds;

    result.push({
      scene_number: sc.scene_number,
      act_number: sc.act_number,
      chapter_title: sc.chapter_title,
      timestamp_start: formatTimestamp(start, forceHours),
      timestamp_end: formatTimestamp(end, forceHours),
      duration_seconds: sc.duration_seconds,
      narration_script: sc.narration_script.trim(),
      visual_prompt: sc.visual_prompt.trim(),
      camera_direction: sc.camera_direction.trim()
    });

    currentSec = end;
  }

  return result;
}
