import { GenerationRequest, MasterOutline, StoryboardResponse } from './types';
import { NICHE_PRESETS, IMAGE_MODELS } from '../presets';
import { enforceSceneTimingBounds, formatTimestamp } from './timing';

/**
 * Deterministic Mock Pipeline to verify timestamp continuity, 4-8s scene segmentation,
 * and multi-part act/chapter expansion across 30s to 2 hours without API spend.
 */
export function runMockGenerationPipeline(request: GenerationRequest): StoryboardResponse {
  const niche = NICHE_PRESETS[request.niche] || NICHE_PRESETS['custom-open'];
  const pacing = request.custom_pacing || niche.defaultPacing;
  const imageModel = IMAGE_MODELS.find((m) => m.id === request.image_model) || IMAGE_MODELS[0];
  const targetSeconds = request.target_duration_seconds;
  const forceHours = targetSeconds >= 3600;

  console.log(`[MockPipeline] Running test for: "${request.topic}"`);
  console.log(`[MockPipeline] Target: ${targetSeconds}s (${Math.floor(targetSeconds / 60)}m ${targetSeconds % 60}s) | Niche: ${niche.name}`);

  const mockCharacter = {
    character_name: niche.id.includes('football') ? 'Iconic Number 10 Maestro'
      : niche.id.includes('bible') ? 'Ancient Prophet of Judea'
      : niche.id.includes('missionar') ? '19th-Century Circuit Preacher'
      : niche.id.includes('psycholog') ? 'Stoic Master Strategist'
      : niche.id.includes('horror') ? 'Haunted Detective in Heavy Trench Coat'
      : niche.id.includes('ancient') ? 'Obsessed Victorian Archaeologist'
      : 'Central Narrative Protagonist',
    role_in_story: 'Central Narrative Anchor',
    appearance_summary: `Definitive ${niche.name} figure designed for persistent facial and clothing consistency.`,
    face_and_hair: 'Chiseled bone structure, expressive deep-set eyes, weathered skin texture, dark swept hair.',
    attire_and_gear: 'Signature genre-accurate wardrobe with distinctive textures, collar, and brass accessories.',
    color_palette: 'Moody cinematic chiaroscuro, warm amber undertones, deep indigo shadow grading.',
    consistency_prompt_tag: `signature ${niche.name} persona, distinctive sharp jawline, intense focused gaze, iconic signature costume, 35mm portrait cinematography`
  };

  if (targetSeconds <= 180) {
    // Single-pass mock
    const sceneCount = Math.max(4, Math.round(targetSeconds / (niche.idealSceneDuration || 5.5)));
    const rawScenes = Array.from({ length: sceneCount }, (_, idx) => ({
      narration_script: `Scene ${idx + 1}: As the story of ${request.topic} unfolds, each decisive moment reveals a deeper layer of human ambition and destiny.`,
      visual_prompt: imageModel.formatter(`${mockCharacter.consistency_prompt_tag}, ${niche.visualKeywords}, cinematic composition, scene ${idx + 1}`, 'Slow push-in'),
      camera_direction: idx % 2 === 0 ? 'Slow push-in, low angle' : 'Dynamic tracking pan right'
    }));

    const scenes = enforceSceneTimingBounds(
      rawScenes,
      targetSeconds,
      pacing,
      0,
      1,
      forceHours
    );

    const totalCalculated = scenes.reduce((sum, s) => sum + s.duration_seconds, 0);

    return {
      title: request.topic,
      total_duration: formatTimestamp(totalCalculated, forceHours),
      total_scenes: scenes.length,
      pacing_wpm: pacing,
      niche: niche.name,
      tone: request.tone,
      image_model: imageModel.name,
      full_script: scenes.map((s) => s.narration_script).join(' '),
      character_model: mockCharacter,
      scenes
    };
  }

  // Multi-part Chunked Mock (for long-form: 8m, 15m, 60m, 120m)
  const actCount = targetSeconds <= 900 ? 3 : targetSeconds <= 1800 ? 4 : 5;
  const secondsPerAct = Math.round(targetSeconds / actCount);
  const chaptersPerAct = 3;
  const secondsPerChapter = Math.round(secondsPerAct / chaptersPerAct);

  const outline: MasterOutline = {
    title: request.topic,
    premise: `An epic narrative exploring ${request.topic} across ${actCount} dramatic acts.`,
    total_target_seconds: targetSeconds,
    character_model: mockCharacter,
    acts: Array.from({ length: actCount }, (_, aIdx) => ({
      act_number: aIdx + 1,
      act_title: `Act ${aIdx + 1}: The Escalation of ${request.topic}`,
      target_duration_seconds: secondsPerAct,
      chapters: Array.from({ length: chaptersPerAct }, (_, cIdx) => ({
        chapter_number: cIdx + 1,
        chapter_title: `Chapter ${cIdx + 1}: The Turning Point`,
        target_duration_seconds: secondsPerChapter,
        narrative_goal: `Advance the plot through chapter ${cIdx + 1}`,
        key_visual_anchor: `${mockCharacter.consistency_prompt_tag}, ${niche.visualKeywords}`
      }))
    }))
  };

  const allScenes = [];
  let currentOffset = 0;
  let runningSceneNumber = 1;

  for (const act of outline.acts) {
    for (const chap of act.chapters) {
      const scenesInChapter = Math.max(3, Math.round(chap.target_duration_seconds / 6.0));
      const rawChunk = Array.from({ length: scenesInChapter }, (_, sIdx) => ({
        narration_script: `Act ${act.act_number}, Chapter ${chap.chapter_number}, beat ${sIdx + 1}: The investigation into ${request.topic} deepens as critical revelations alter everything we assumed.`,
        visual_prompt: imageModel.formatter(`${chap.key_visual_anchor}, high fidelity 8k cinematic lighting`, 'Slow tracking shot'),
        camera_direction: 'Slow tracking shot, eye level',
        act_number: act.act_number,
        chapter_title: chap.chapter_title
      }));

      const syncChunk = enforceSceneTimingBounds(
        rawChunk,
        chap.target_duration_seconds,
        pacing,
        currentOffset,
        runningSceneNumber,
        forceHours
      );

      allScenes.push(...syncChunk);
      runningSceneNumber += syncChunk.length;
      currentOffset += syncChunk.reduce((sum, s) => sum + s.duration_seconds, 0);
    }
  }

  return {
    title: outline.title,
    total_duration: formatTimestamp(currentOffset, forceHours),
    total_scenes: allScenes.length,
    pacing_wpm: pacing,
    niche: niche.name,
    tone: request.tone,
    image_model: imageModel.name,
    full_script: allScenes.map((s) => s.narration_script).join(' '),
    character_model: mockCharacter,
    scenes: allScenes,
    outline
  };
}

/**
 * Validates timestamp continuity, no gaps, no overlaps, and 4-8s scene bounds
 */
export function verifyTimestampContinuity(scenes: Array<{
  timestamp_start: string;
  timestamp_end: string;
  duration_seconds: number;
}>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];

    // Check bounds [4, 8]
    if (sc.duration_seconds < 4 || sc.duration_seconds > 8) {
      errors.push(`Scene ${i + 1} duration ${sc.duration_seconds}s violates [4, 8] bound.`);
    }

    // Check continuity with previous scene
    if (i > 0) {
      const prev = scenes[i - 1];
      if (sc.timestamp_start !== prev.timestamp_end) {
        errors.push(`Discontinuity at Scene ${i + 1}: Starts at ${sc.timestamp_start}, but Scene ${i} ended at ${prev.timestamp_end}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
