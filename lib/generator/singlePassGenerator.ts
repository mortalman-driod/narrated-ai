import { GenerationRequest, StoryboardResponse } from './types';
import { NICHE_PRESETS, IMAGE_MODELS } from '../presets';
import { callStructuredLLM } from '../llm/client';
import { enforceSceneTimingBounds, formatTimestamp } from './timing';
import { isScriptContent } from './proceduralEngine';

export async function generateSinglePassStoryboard(
  request: GenerationRequest
): Promise<StoryboardResponse> {
  const niche = NICHE_PRESETS[request.niche] || NICHE_PRESETS['custom-open'];
  const pacing = request.custom_pacing || niche.defaultPacing;
  const imageModel = IMAGE_MODELS.find((m) => m.id === request.image_model) || IMAGE_MODELS[0];

  const rawInput = (request.script || request.topic || '').trim();
  const isScript = request.is_script_input || isScriptContent(rawInput);

  const targetDuration = request.target_duration_seconds;
  // Professional video editing pacing: ~7.5 seconds per scene (60s = 8 scenes, 30s = 4 scenes)
  const idealSceneSeconds = 7.5;
  const targetSceneCount = Math.max(3, Math.round(targetDuration / idealSceneSeconds));
  const wordsPerSecond = pacing / 60;
  const minWords = Math.round(5 * wordsPerSecond);
  const maxWords = Math.round(9 * wordsPerSecond);

  const scriptDirective = isScript
    ? `CRITICAL DIRECTIVE - SCRIPT SEGMENTATION:
The user has provided an exact voiceover script below.
DO NOT change their story, invent unrelated characters, or rewrite their narrative premise!
You MUST take their provided script and segment it into EXACTLY ${targetSceneCount} sequential scenes.
For each scene:
- "narration_script": Use the exact words and sentences from the provided script for that window.
- "visual_prompt": Formulate a vivid, descriptive visual prompt tailored for ${imageModel.name} that explicitly illustrates the concrete physical action, environment, and subjects happening in THAT specific scene's narration!
- "camera_direction": Provide an authentic cinematic camera movement.`
    : `1. Pacing & Scene Count:
   - Narration pacing is set to ${pacing} WPM (~${wordsPerSecond.toFixed(2)} words/sec).
   - EVERY single scene duration MUST strictly be between 6 and 8 seconds.
   - Therefore, each scene's voiceover narration must contain between ${minWords} and ${maxWords} words.
   - For this ${targetDuration}-second video, you MUST generate EXACTLY ${targetSceneCount} sequential scenes (NO MORE, NO LESS). A 60-second video MUST HAVE EXACTLY 7 to 8 scenes, NEVER 15+ or 33 fragmented micro-scenes!`;

  const systemPrompt = `You are an elite Hollywood Director and AI Storyboard Architect specializing in viral video pacing for ${niche.name}.

STRICT PRODUCTION REQUIREMENTS:
${scriptDirective}

2. Tone & Voice:
   - Selected Tone: ${request.tone}
   - Direction: ${niche.promptDirective}

3. Full Continuous Voiceover Script:
   - The entire voiceover MUST read as a single, captivating, beautifully written story or video essay.
   - Every scene's narration flows seamlessly into the next with no awkward jumps or robotic phrasing.

4. Consistent Character Modeling for ${imageModel.name}:
   - Define a detailed Character Model Sheet for the protagonist or key narrator/subject.
   - Niche Character Directive: ${niche.characterModelingDirective}
   - Specify exact facial structure, hair, signature attire, and color palette.
   - Create a specific "consistency_prompt_tag" (e.g., "athletic 30-year-old midfield playmaker, sharp angular jawline, short fade undercut, intense dark eyes, iconic navy blue kit with white trim").
   - CRITICAL: Embed this character consistency anchor tag into scenes featuring the character to guarantee visual identity across all generated images.

5. Dynamic, Storyline-Aligned Visual Prompting for ${imageModel.name}:
   - CRITICAL REQUIREMENT: Every scene's visual prompt MUST explicitly illustrate the EXACT physical action, dramatic beat, and setting occurring in that specific scene's narration!
   - NEVER output a generic portrait, static headshot, or repeated boilerplate text. Every scene MUST depict a DIFFERENT progressive event!
   - Describe:
     a) Physical Action & Interaction: What is happening right now? (e.g., dipping fingers into the flowing brook to select five smooth stones, roaring defiance under stadium floodlights, looking through brass binoculars, clutching a worn leather Bible).
     b) Environment, Props & Textures: Sun-baked limestone valley, ancient battle banners, roaring stadium stands, flickering candlelight on parchment, authentic textiles and dirt.
     c) Cinematic Lighting & Framing: High-contrast chiaroscuro, volumetric dust rays, rim lighting, dramatic low-angle perspective, anamorphic lens flare.
     d) Style Keywords to integrate: "${niche.visualKeywords}".

6. Camera Direction:
   - Provide explicit, kinetic camera movement (e.g., "Slow push-in, low angle", "Dynamic tracking pan right", "Whip pan to subject", "Macro close-up on hands").

OUTPUT FORMAT: Return STRICT JSON matching:
{
  "title": "Compelling Title",
  "full_script": "The full voiceover narration written as one cohesive, complete piece of prose/text...",
  "character_model": {
    "character_name": "Name of main subject/protagonist",
    "role_in_story": "Role / Persona",
    "appearance_summary": "1-2 sentence core visual description",
    "face_and_hair": "Exact facial structure, skin complexion, hair texture and style",
    "attire_and_gear": "Exact wardrobe, textiles, accessories, and signature gear",
    "color_palette": "Primary colors and atmospheric tone",
    "consistency_prompt_tag": "Exact descriptive anchor phrase to include in diffusion prompts for consistent faces and clothing"
  },
  "scenes": [
    {
      "scene_number": 1,
      "narration_script": "Exact voiceover line for this window.",
      "visual_prompt": "Photorealistic visual prompt tailored for ${imageModel.name}...",
      "camera_direction": "Camera motion and angle"
    }
  ]
}`;

  const userPrompt = isScript
    ? `USER PROVIDED SCRIPT:
"""
${rawInput}
"""
Target Total Runtime: ${targetDuration} seconds
Exact Scenes to Segment: ${targetSceneCount}
Pacing: ${pacing} WPM
Image Model: ${imageModel.name}

Segment the provided script into exactly ${targetSceneCount} scenes and generate the required visual prompts.`
    : `Topic / Premise: "${request.topic}"
Target Total Runtime: ${targetDuration} seconds
Scenes to Generate: ${targetSceneCount}
Pacing: ${pacing} WPM
Niche: ${niche.name}
Tone: ${request.tone}
Image Model: ${imageModel.name}

Generate the complete JSON storyboard with the continuous full script and consistent character model.`;

  console.log(`[SinglePassGenerator] Generating ${targetSceneCount} scenes for "${isScript ? 'User Script' : request.topic}" (${targetDuration}s)...`);
  const rawData = await callStructuredLLM({
    systemPrompt,
    userPrompt,
    temperature: 0.7
  });

  if (!rawData.scenes || !Array.isArray(rawData.scenes)) {
    throw new Error('LLM failed to return valid scenes array');
  }

  // Format visual prompts according to target image model (e.g. Midjourney tags or Runway syntax)
  const formattedScenes = rawData.scenes.map((s: any) => ({
    narration_script: s.narration_script || '',
    visual_prompt: imageModel.formatter(s.visual_prompt || '', s.camera_direction || ''),
    camera_direction: s.camera_direction || 'Cinematic tracking shot'
  }));

  const forceHours = targetDuration >= 3600;
  const synchronizedScenes = enforceSceneTimingBounds(
    formattedScenes,
    targetDuration,
    pacing,
    0,
    1,
    forceHours
  );

  const totalCalculated = synchronizedScenes.reduce((sum, s) => sum + s.duration_seconds, 0);

  // Assemble full voiceover script if not provided
  const assembledScript = rawData.full_script?.trim() || synchronizedScenes.map((s) => s.narration_script).join(' ');

  return {
    title: rawData.title || request.topic,
    total_duration: formatTimestamp(totalCalculated, forceHours),
    total_scenes: synchronizedScenes.length,
    pacing_wpm: pacing,
    niche: niche.name,
    tone: request.tone,
    image_model: imageModel.name,
    full_script: assembledScript,
    character_model: rawData.character_model || {
      character_name: 'Main Subject',
      role_in_story: 'Protagonist',
      appearance_summary: `${niche.name} protagonist matching ${niche.promptDirective.slice(0, 80)}`,
      face_and_hair: 'Distinct cinematic facial features and expressive eyes',
      attire_and_gear: 'Authentic period and genre-accurate attire',
      color_palette: 'Cinematic atmospheric grade',
      consistency_prompt_tag: niche.visualKeywords.split(',').slice(0, 2).join(',')
    },
    scenes: synchronizedScenes
  };
}
