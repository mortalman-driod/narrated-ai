import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface SceneItem {
  scene_number: number;
  timestamp_start: string;
  timestamp_end: string;
  duration_seconds: number;
  narration_script: string;
  visual_prompt: string;
  camera_direction: string;
}

export interface StoryboardOutput {
  title: string;
  total_duration: string;
  pacing_wpm?: number;
  style_preset?: string;
  scenes: SceneItem[];
}

export interface NarrativeInput {
  topic: string;
  target_duration_seconds: number;
  pacing: number; // default: 140 WPM
  style_preset: string; // default: "cinematic realism"
}

/**
 * Formats seconds into MM:SS format
 */
export function formatMMSS(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Style Preset Enhancement Directives for Midjourney & Flux
 */
const STYLE_PROMPT_ENHANCEMENTS: Record<string, string> = {
  'cinematic realism': '35mm anamorphic photography, photorealistic, Arri Alexa LF cinema camera, cinematic volumetric lighting, shallow depth of field, 8k resolution, authentic textures, filmic color grade',
  'dark fantasy': 'Dark fantasy oil painting aesthetic, volumetric rolling fog, deep chiaroscuro shadows, grim desaturated earthy palette with crimson and slate accents, Elden Ring atmospheric tone, high texture detail',
  'retro anime': '1990s hand-drawn cel-shaded anime aesthetic, Studio Ghibli and Akira art style, rich painted watercolor background, vintage grain, dynamic lighting, nostalgic color palette',
  'cyberpunk noir': 'High-contrast neo-noir, rain-slicked asphalt reflecting neon holograms, teal and magenta ambient lighting, heavy atmospheric smog, anamorphic lens flares, gritty photorealism',
  'historical documentary': 'Archival National Geographic exploration style, period-accurate garments and equipment, diffused natural overcast daylight, warm sepia and earthen undertones, authentic Kodachrome film look'
};

/**
 * Calculates raw spoken duration in seconds based on word count, WPM, and natural pauses
 */
export function calculateNarrationDuration(text: string, wpm: number): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 4;

  const secondsPerWord = 60 / wpm;
  let duration = words.length * secondsPerWord;

  // Add natural pauses for punctuation
  const minorPauses = (text.match(/[,;:\-—]/g) || []).length;
  const majorPauses = (text.match(/[.!?]/g) || []).length;
  duration += minorPauses * 0.25 + majorPauses * 0.45;

  return duration;
}

/**
 * Timing & Script Engine: Normalizes and strictly enforces scene durations between 4 and 8 seconds,
 * aligns total runtime with target_duration_seconds, and assigns continuous MM:SS timestamps.
 */
export function enforceTimingsAndPacing(
  scenes: Array<{
    scene_number?: number;
    narration_script: string;
    visual_prompt: string;
    camera_direction: string;
    duration_seconds?: number;
  }>,
  targetDurationSeconds: number,
  wpm: number
): SceneItem[] {
  // Step 1: Compute initial clamped durations (strictly 4s to 8s)
  const initialScenes = scenes.map((s, idx) => {
    const calculatedSecs = calculateNarrationDuration(s.narration_script, wpm);
    const clampedSecs = Math.max(4, Math.min(8, Math.round(calculatedSecs)));
    return {
      ...s,
      scene_number: idx + 1,
      duration_seconds: clampedSecs
    };
  });

  // Step 2: Harmonize total duration to match targetDurationSeconds while respecting 4s-8s bound
  let currentTotal = initialScenes.reduce((sum, s) => sum + s.duration_seconds, 0);
  let difference = targetDurationSeconds - currentTotal;

  // Distribute difference incrementally without breaking the [4, 8] constraint
  let attempts = 0;
  while (difference !== 0 && attempts < 100) {
    attempts++;
    let changed = false;

    if (difference > 0) {
      // Need to add seconds to scenes that have room (< 8s)
      for (const scene of initialScenes) {
        if (difference === 0) break;
        if (scene.duration_seconds < 8) {
          scene.duration_seconds += 1;
          difference -= 1;
          changed = true;
        }
      }
    } else {
      // Need to subtract seconds from scenes that have room (> 4s)
      for (const scene of initialScenes) {
        if (difference === 0) break;
        if (scene.duration_seconds > 4) {
          scene.duration_seconds -= 1;
          difference += 1;
          changed = true;
        }
      }
    }

    if (!changed) break; // All scenes are at bounds
  }

  // Step 3: Compute continuous cumulative MM:SS timestamps
  let currentSecond = 0;
  const synchronizedScenes: SceneItem[] = [];

  for (let i = 0; i < initialScenes.length; i++) {
    const sc = initialScenes[i];
    const startSec = currentSecond;
    const endSec = currentSecond + sc.duration_seconds;

    synchronizedScenes.push({
      scene_number: i + 1,
      timestamp_start: formatMMSS(startSec),
      timestamp_end: formatMMSS(endSec),
      duration_seconds: sc.duration_seconds,
      narration_script: sc.narration_script.trim(),
      visual_prompt: sc.visual_prompt.trim(),
      camera_direction: sc.camera_direction.trim()
    });

    currentSecond = endSec;
  }

  return synchronizedScenes;
}

/**
 * Builds the AI prompt directing Gemini to create a continuous, synchronized script with diffusion prompts
 */
function buildSystemPrompt(input: NarrativeInput, targetSceneCount: number): { systemInstruction: string; userMessage: string } {
  const styleKeywords = STYLE_PROMPT_ENHANCEMENTS[input.style_preset.toLowerCase()] || input.style_preset;
  const wordsPerSecond = input.pacing / 60;
  const minWords = Math.round(4 * wordsPerSecond);
  const maxWords = Math.round(8 * wordsPerSecond);
  const targetWords = Math.round(6 * wordsPerSecond);

  const systemInstruction = `You are a World-Class Narrative Architect and Visual Prompt Director.
Your task is to transform a story premise into a compelling, synchronized, timestamped narrative paired with high-impact text-to-image/video diffusion prompts (tailored for Flux and Midjourney v6).

CRITICAL CONSTRAINTS & REQUIREMENTS:
1. Pacing & Word Count:
   - Target pacing is ${input.pacing} Words Per Minute (~${wordsPerSecond.toFixed(2)} words per second).
   - EVERY single scene duration must strictly be between 4 and 8 seconds.
   - Therefore, each scene's narration line MUST contain between ${minWords} and ${maxWords} words (ideal average: ~${targetWords} words). Do not write overly long or one-word scenes.
   - You MUST generate exactly ${targetSceneCount} sequential scenes so that the total story runtime reaches approximately ${input.target_duration_seconds} seconds.

2. Visual Prompt Synthesis (Flux / Midjourney):
   - For every scene, craft a photorealistic, descriptive visual prompt.
   - Include:
     a) Subject framing (e.g., extreme wide establishing shot, medium low-angle tracking shot, intimate close-up).
     b) Lighting (e.g., volumetric god rays through humid jungle foliage, dramatic chiaroscuro, golden hour rim light).
     c) Environment and architectural detail.
     d) Camera gear & lens style (e.g., 35mm anamorphic lens, shallow depth of field, subtle film grain).
     e) Color grading consistent with the style: "${input.style_preset}".
   - VISUAL CONTINUITY: You MUST establish recurring visual anchors (consistent character physical features, clothing/gear, lighting tone, and environment progression) so consecutive scenes look like they belong in the exact same film.

3. Camera Direction:
   - Provide a concise, cinematic camera motion (e.g., "Slow push-in, low angle", "Dynamic tracking pan right", "High-angle drone pull-back").

4. Output Schema:
   - Output MUST strictly be valid JSON matching this schema:
{
  "title": "Compelling Title",
  "scenes": [
    {
      "scene_number": 1,
      "narration_script": "Exact voiceover line for this scene.",
      "visual_prompt": "Rich visual description adhering to ${input.style_preset}...",
      "camera_direction": "Camera motion and angle"
    }
  ]
}`;

  const userMessage = `Story Premise / Topic: "${input.topic}"
Target Duration: ${input.target_duration_seconds} seconds
Pacing: ${input.pacing} WPM
Style Preset: ${input.style_preset} (${styleKeywords})
Target Scene Count: ${targetSceneCount} scenes

Generate the complete JSON storyboard.`;

  return { systemInstruction, userMessage };
}

/**
 * Main Storyboard Generator: Calls Gemini API with strict JSON schema, computes timestamps,
 * enforces scene duration rules, and outputs validated StoryboardOutput.
 */
export async function generateNarrativeStoryboard(input: NarrativeInput): Promise<StoryboardOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('your_gemini_api_key')) {
    throw new Error('Missing valid GEMINI_API_KEY in environment variables.');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  // Compute optimal scene count (each scene is 4-8s, target average ~6s)
  const targetSceneCount = Math.max(3, Math.round(input.target_duration_seconds / 6.0));

  console.log(`[NarrativeEngine] Generating storyboard for: "${input.topic}"`);
  console.log(`[NarrativeEngine] Target Runtime: ${input.target_duration_seconds}s | Pacing: ${input.pacing} WPM | Target Scenes: ${targetSceneCount}`);
  console.log(`[NarrativeEngine] Visual Style: "${input.style_preset}" using model: ${model}`);

  const { systemInstruction, userMessage } = buildSystemPrompt(input, targetSceneCount);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\nTask:\n${userMessage}` }]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7,
      maxOutputTokens: 8192
    }
  };

  const response = await axios.post(endpoint, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000
  });

  const rawJsonText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawJsonText) {
    throw new Error('Empty response received from Gemini API');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch (err: any) {
    throw new Error(`Failed to parse JSON from Gemini response: ${err.message}\nRaw Text: ${rawJsonText.slice(0, 300)}`);
  }

  if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
    throw new Error('Gemini response missing "scenes" array.');
  }

  // Pass through Timing & Script Engine
  const synchronizedScenes = enforceTimingsAndPacing(
    parsed.scenes,
    input.target_duration_seconds,
    input.pacing
  );

  const totalSeconds = synchronizedScenes.reduce((sum, s) => sum + s.duration_seconds, 0);

  const storyboard: StoryboardOutput = {
    title: parsed.title || input.topic,
    total_duration: formatMMSS(totalSeconds),
    pacing_wpm: input.pacing,
    style_preset: input.style_preset,
    scenes: synchronizedScenes
  };

  console.log(`[NarrativeEngine] Successfully generated ${storyboard.scenes.length} synchronized scenes (Total Runtime: ${storyboard.total_duration})`);
  return storyboard;
}
