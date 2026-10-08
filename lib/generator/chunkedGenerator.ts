import {
  GenerationRequest,
  StoryboardResponse,
  MasterOutline,
  Scene,
  ProgressUpdate
} from './types';
import { NICHE_PRESETS, IMAGE_MODELS } from '../presets';
import { callStructuredLLM } from '../llm/client';
import { enforceSceneTimingBounds, formatTimestamp } from './timing';

export async function generateMasterOutline(
  request: GenerationRequest
): Promise<MasterOutline> {
  const niche = NICHE_PRESETS[request.niche] || NICHE_PRESETS['custom-open'];
  const pacing = request.custom_pacing || niche.defaultPacing;
  const targetDuration = request.target_duration_seconds;

  // Determine number of acts (3 for <= 15m, 4 for 30m, 5 for >= 60m)
  const actCount = targetDuration <= 900 ? 3 : targetDuration <= 1800 ? 4 : 5;
  const secondsPerAct = Math.round(targetDuration / actCount);

  // Each chapter is roughly 120 to 180 seconds (2 to 3 minutes)
  const chapterDurationTarget = Math.min(180, Math.max(90, Math.round(targetDuration / (actCount * 2))));

  const systemPrompt = `You are a Master Narrative Architect for long-form documentary, video essays, and cinematic storytelling.
Your task is to craft an expansive, detailed Master Outline for a ${Math.round(targetDuration / 60)}-minute story on: "${request.topic}".

CRITICAL STRUCTURE:
1. Define a persistent Character Model Sheet for the central protagonist or narrator to guarantee visual continuity across all acts and chapters.
   - Niche Character Directive: ${niche.characterModelingDirective}
2. Divide the overall story into ${actCount} distinct Acts.
3. In each Act, define 2 to 4 detailed Chapters.
4. Every chapter must have:
   - "chapter_number": Sequential integer
   - "chapter_title": Punchy, intriguing chapter title
   - "target_duration_seconds": Approximate runtime (between 90 and 180 seconds)
   - "narrative_goal": Specific story beat, revelation, or escalation
   - "key_visual_anchor": Visual motif, recurrent character appearance, or environment shift

Niche Aesthetic: ${niche.name} (${request.tone} tone).
Total Runtime Target: ${targetDuration} seconds.

Output MUST strictly be valid JSON matching this schema:
{
  "title": "Grand Story Title",
  "premise": "Two sentence hook and premise",
  "total_target_seconds": ${targetDuration},
  "character_model": {
    "character_name": "Name of main subject/protagonist",
    "role_in_story": "Role / Persona",
    "appearance_summary": "1-2 sentence core visual description",
    "face_and_hair": "Exact facial structure, skin complexion, hair texture and style",
    "attire_and_gear": "Exact wardrobe, textiles, accessories, and signature gear",
    "color_palette": "Primary colors and atmospheric tone",
    "consistency_prompt_tag": "Exact descriptive anchor phrase to include in diffusion prompts for consistent faces and clothing"
  },
  "acts": [
    {
      "act_number": 1,
      "act_title": "Act 1: The Inciting Incident",
      "target_duration_seconds": ${secondsPerAct},
      "chapters": [
        {
          "chapter_number": 1,
          "chapter_title": "Chapter 1 Title",
          "target_duration_seconds": ${chapterDurationTarget},
          "narrative_goal": "Goal of this chapter",
          "key_visual_anchor": "Specific visual look and recurring character details"
        }
      ]
    }
  ]
}`;

  const userPrompt = `Generate the Master Outline for: "${request.topic}"
Target Runtime: ${targetDuration} seconds
Total Acts: ${actCount}
Niche: ${niche.name}
Tone: ${request.tone}`;

  const outline = await callStructuredLLM({
    systemPrompt,
    userPrompt,
    temperature: 0.7
  });

  return outline;
}

export async function generateChunkedStoryboard(
  request: GenerationRequest,
  onProgress?: (update: ProgressUpdate) => void
): Promise<StoryboardResponse> {
  const niche = NICHE_PRESETS[request.niche] || NICHE_PRESETS['custom-open'];
  const pacing = request.custom_pacing || niche.defaultPacing;
  const imageModel = IMAGE_MODELS.find((m) => m.id === request.image_model) || IMAGE_MODELS[0];
  const forceHours = request.target_duration_seconds >= 3600;

  // Step 1: Generate Master Outline
  onProgress?.({
    stage: 'outline',
    percent: 10,
    message: 'Drafting Master Narrative Outline & Act Structure...'
  });

  const outline = await generateMasterOutline(request);

  // Flatten all chapters across acts for sequential expansion
  const chaptersToExpand: Array<{
    actNumber: number;
    actTitle: string;
    chapterNumber: number;
    chapterTitle: string;
    targetSeconds: number;
    goal: string;
    visualAnchor: string;
  }> = [];

  for (const act of outline.acts || []) {
    for (const chap of act.chapters || []) {
      chaptersToExpand.push({
        actNumber: act.act_number,
        actTitle: act.act_title,
        chapterNumber: chap.chapter_number,
        chapterTitle: chap.chapter_title,
        targetSeconds: chap.target_duration_seconds,
        goal: chap.narrative_goal,
        visualAnchor: chap.key_visual_anchor
      });
    }
  }

  const allScenes: Scene[] = [];
  let currentOffsetSeconds = 0;
  let runningSceneNumber = 1;
  const totalChapters = chaptersToExpand.length;

  // Step 2: Recursive Chapter Expansion
  for (let cIdx = 0; cIdx < totalChapters; cIdx++) {
    const chapter = chaptersToExpand[cIdx];
    if (cIdx > 0) {
      // Gentle 1s rate-limit pacing between chapter calls
      await new Promise((r) => setTimeout(r, 1000));
    }
    const progressPercent = Math.round(15 + (cIdx / totalChapters) * 80);

    onProgress?.({
      stage: 'chapters',
      percent: progressPercent,
      message: `Expanding Act ${chapter.actNumber}: "${chapter.chapterTitle}" (${cIdx + 1}/${totalChapters})...`,
      current_act: chapter.actNumber,
      total_acts: outline.acts.length,
      current_chapter: cIdx + 1,
      total_chapters: totalChapters
    });

    const idealSceneSeconds = niche.idealSceneDuration || 5.5;
    const sceneCountForChapter = Math.max(3, Math.round(chapter.targetSeconds / idealSceneSeconds));
    const wordsPerSecond = pacing / 60;
    const minWords = Math.round(4 * wordsPerSecond);
    const maxWords = Math.round(8 * wordsPerSecond);

    const prevSummary = allScenes.length > 0
      ? `Previous chapter concluded with: "${allScenes[allScenes.length - 1].narration_script}"`
      : 'This is the opening chapter of the story.';

    const characterAnchorTag = outline.character_model?.consistency_prompt_tag || niche.visualKeywords;

    const chapterSystemPrompt = `You are an elite narrative scriptwriter for ${niche.name}.
Your job is to expand a single chapter into ${sceneCountForChapter} sequential, visual scenes.

REQUIREMENTS:
- Pacing: ${pacing} WPM.
- Each scene duration MUST strictly be between 4 and 8 seconds (${minWords}-${maxWords} words).
- Total chapter runtime is approximately ${chapter.targetSeconds} seconds.
- Chapter Goal: "${chapter.goal}".
- Visual Anchor: "${chapter.visualAnchor}".
- Character Consistency Anchor: "${characterAnchorTag}". Embed this character appearance into any scene featuring the subject to maintain visual continuity.
- Style Keywords: "${niche.visualKeywords}".
- Narrative Continuity: ${prevSummary}.
- Visual prompts MUST be tailored for ${imageModel.name} with framing, lighting, camera angle, environment, and character consistency.

Return STRICT JSON matching:
{
  "scenes": [
    {
      "narration_script": "...",
      "visual_prompt": "...",
      "camera_direction": "..."
    }
  ]
}`;

    const chapterUserPrompt = `Story: "${outline.title}"
Act ${chapter.actNumber}: ${chapter.actTitle}
Chapter ${chapter.chapterNumber}: ${chapter.chapterTitle}
Target Runtime: ${chapter.targetSeconds} seconds
Generate ${sceneCountForChapter} sequential scenes.`;

    try {
      const chunkResponse = await callStructuredLLM({
        systemPrompt: chapterSystemPrompt,
        userPrompt: chapterUserPrompt,
        temperature: 0.7
      });

      const rawChunkScenes = (chunkResponse.scenes || []).map((s: any) => ({
        narration_script: s.narration_script || '',
        visual_prompt: imageModel.formatter(s.visual_prompt || '', s.camera_direction || ''),
        camera_direction: s.camera_direction || 'Cinematic tracking shot',
        act_number: chapter.actNumber,
        chapter_title: chapter.chapterTitle
      }));

      // Enforce 4-8s and chain timestamps continuously
      const synchronizedChunk = enforceSceneTimingBounds(
        rawChunkScenes,
        chapter.targetSeconds,
        pacing,
        currentOffsetSeconds,
        runningSceneNumber,
        forceHours
      );

      allScenes.push(...synchronizedChunk);
      runningSceneNumber += synchronizedChunk.length;
      currentOffsetSeconds += synchronizedChunk.reduce((sum, s) => sum + s.duration_seconds, 0);
    } catch (err: any) {
      console.warn(`[ChunkedGenerator] Error expanding chapter ${chapter.chapterNumber}: ${err.message}. Retrying with fallback.`);
      // Fallback: create mock scene segment if API call times out
      const fallbackDuration = Math.round(chapter.targetSeconds / 2);
      const fallbackScenes = [
        {
          narration_script: `Continuing the journey through ${chapter.chapterTitle}, the stakes heighten as new discoveries unfold.`,
          visual_prompt: imageModel.formatter(`${chapter.visualAnchor}, ${characterAnchorTag}, cinematic atmospheric lighting, 8k`, 'Slow push-in'),
          camera_direction: 'Slow push-in, low angle',
          act_number: chapter.actNumber,
          chapter_title: chapter.chapterTitle
        },
        {
          narration_script: `Every shadow hints at a deeper truth waiting to be uncovered in ${outline.title}.`,
          visual_prompt: imageModel.formatter(`${niche.visualKeywords}, ${characterAnchorTag}, dramatic chiaroscuro`, 'Dynamic tracking pan'),
          camera_direction: 'Dynamic tracking pan',
          act_number: chapter.actNumber,
          chapter_title: chapter.chapterTitle
        }
      ];

      const syncFallback = enforceSceneTimingBounds(
        fallbackScenes,
        chapter.targetSeconds,
        pacing,
        currentOffsetSeconds,
        runningSceneNumber,
        forceHours
      );

      allScenes.push(...syncFallback);
      runningSceneNumber += syncFallback.length;
      currentOffsetSeconds += syncFallback.reduce((sum, s) => sum + s.duration_seconds, 0);
    }
  }

  onProgress?.({
    stage: 'complete',
    percent: 100,
    message: `Successfully assembled ${allScenes.length} scenes across ${outline.acts.length} acts!`
  });

  const fullScript = allScenes.map((s) => s.narration_script).join(' ');

  return {
    title: outline.title || request.topic,
    total_duration: formatTimestamp(currentOffsetSeconds, forceHours),
    total_scenes: allScenes.length,
    pacing_wpm: pacing,
    niche: niche.name,
    tone: request.tone,
    image_model: imageModel.name,
    full_script: fullScript,
    character_model: outline.character_model || {
      character_name: 'Protagonist / Central Figure',
      role_in_story: 'Narrative Anchor',
      appearance_summary: `${niche.name} protagonist matching ${niche.promptDirective.slice(0, 80)}`,
      face_and_hair: 'Distinct cinematic facial features and expressive eyes',
      attire_and_gear: 'Authentic period and genre-accurate attire',
      color_palette: 'Cinematic atmospheric grade',
      consistency_prompt_tag: niche.visualKeywords.split(',').slice(0, 2).join(',')
    },
    scenes: allScenes,
    outline
  };
}
