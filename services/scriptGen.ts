import OpenAI from 'openai';
import axios from 'axios';
import dotenv from 'dotenv';
import { PipelineInput, Storyboard, Scene } from '../types';

dotenv.config();

/**
 * Fallback mock script generator for testing without incurring API charges
 */
export function generateMockScript(input: PipelineInput): Storyboard {
  const topic = input.topic || 'The Mystery of Flight 19';
  console.log(`[ScriptGen] Generating mock storyboard for topic: "${topic}"...`);

  return {
    title: topic,
    topic: topic,
    fps: 30,
    width: 1080,
    height: 1920,
    scenes: [
      {
        scene_id: 1,
        voiceover_text: "December 5th, 1945. Five Navy torpedo bombers take off from Fort Lauderdale into a calm, blue afternoon sky.",
        visual_prompt: "Cinematic establishing shot of five 1945 US Navy Avenger bombers flying in tight formation over a calm blue Atlantic ocean, golden hour sunlight reflecting off the wings, vintage film tone, hyper-realistic, 8k",
        camera_motion: "zoom in"
      },
      {
        scene_id: 2,
        voiceover_text: "Hours later, the flight leader's voice crackled through the radio in panic: 'Both my compasses are wild, and we cannot find west.'",
        visual_prompt: "Close up inside a vintage 1940s airplane cockpit, spinning erratic compass gauges, trembling gloved hands on the control stick, misty dark clouds outside the canopy, dramatic shadows, cinematic lighting",
        camera_motion: "slow pan right"
      },
      {
        scene_id: 3,
        voiceover_text: "The weather soured into a violent storm. Contact was lost as night swallowed twenty-seven men and six aircraft.",
        visual_prompt: "Stormy ocean swells in the Bermuda Triangle at twilight, lightning illuminating tempestuous dark waves, silhouettes of airplanes fading into heavy fog, mysterious atmosphere, atmospheric depth",
        camera_motion: "zoom out"
      },
      {
        scene_id: 4,
        voiceover_text: "Neither wreckage nor bodies were ever recovered. To this day, the disappearance of Flight 19 remains aviation's greatest unsolved enigma.",
        visual_prompt: "Underwater abyss in the deep ocean, sunbeams piercing through murky water revealing empty ocean floor, cinematic mystery, hauntingly quiet, moody color grading",
        camera_motion: "slow pan left"
      }
    ]
  };
}

/**
 * Generates storyboard script using Google Gemini API
 */
export async function generateScriptWithGemini(
  input: PipelineInput,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<Storyboard> {
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  console.log(`[ScriptGen] Contacting Google Gemini (${model}) for topic: "${input.topic}"...`);

  const response = await axios.post(
    url,
    {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nTask:\n${userPrompt}` }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7
      }
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    }
  );

  const rawJson = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawJson) {
    throw new Error('Empty response from Gemini API');
  }

  const parsed = JSON.parse(rawJson);
  if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
    throw new Error('Invalid JSON structure from Gemini: missing scenes array');
  }

  const storyboard: Storyboard = {
    title: parsed.title || input.topic,
    topic: input.topic,
    fps: parseInt(process.env.VIDEO_FPS || '30', 10),
    width: parseInt(process.env.VIDEO_WIDTH || '1080', 10),
    height: parseInt(process.env.VIDEO_HEIGHT || '1920', 10),
    scenes: parsed.scenes.map((s: any, idx: number): Scene => ({
      scene_id: s.scene_id || idx + 1,
      voiceover_text: s.voiceover_text || '',
      visual_prompt: s.visual_prompt || '',
      camera_motion: s.camera_motion || 'zoom in'
    }))
  };

  console.log(`[ScriptGen] Gemini generated ${storyboard.scenes.length} scenes for "${storyboard.title}".`);
  return storyboard;
}

/**
 * Generates video script and storyboard using OpenAI GPT-4o / GPT-4o-mini,
 * with automatic fallback to Gemini (if GEMINI_API_KEY is present) or mock storyboard.
 */
export async function generateScript(input: PipelineInput): Promise<Storyboard> {
  if (input.mock) {
    return generateMockScript(input);
  }

  const audience = input.audience || 'General audience interested in mysteries, history, and engaging storytelling';
  const duration = input.duration || '45-60 seconds';
  const tone = input.tone || 'Suspenseful, dramatic, documentary narrator';

  const systemPrompt = `You are an elite short-form documentary scriptwriter and visual director for viral narrated videos (inspired by Narrated AI, Vox, and Kurzgesagt).
Your goal is to transform the user's premise into an engaging, high-retention video storyboard.

Rules:
1. Divide the narration into 3 to 6 impactful, sequential scenes.
2. Each scene must have:
   - "scene_id": Sequential integer (1, 2, 3...)
   - "voiceover_text": Punchy, spoken-word script designed for dramatic narration (approx 15-25 words per scene).
   - "visual_prompt": A rich Midjourney/Flux prompt describing the scene visually with cinematic lighting, depth, artistic direction, and high detail.
   - "camera_motion": One of ["slow pan right", "slow pan left", "zoom in", "zoom out", "tilt up", "tilt down"].
3. Keep the storytelling dynamic with a strong hook in Scene 1, escalating tension, and a memorable concluding takeaway.
4. Output MUST strictly be valid JSON matching this schema:
{
  "title": "Title of the Video",
  "scenes": [
    {
      "scene_id": 1,
      "voiceover_text": "...",
      "visual_prompt": "...",
      "camera_motion": "..."
    }
  ]
}`;

  const userPrompt = `Topic/Premise: ${input.topic}
Target Audience: ${audience}
Desired Duration: ${duration}
Voice Tone: ${tone}

Generate the complete JSON storyboard.`;

  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // 1. Try OpenAI if configured
  if (openAiKey && !openAiKey.includes('your_openai_api_key')) {
    try {
      const openai = new OpenAI({ apiKey: openAiKey });
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

      console.log(`[ScriptGen] Contacting OpenAI (${model}) for topic: "${input.topic}"...`);

      const response = await openai.chat.completions.create({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from OpenAI');

      const parsed = JSON.parse(content);
      if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
        throw new Error('Invalid JSON structure: missing scenes array');
      }

      const storyboard: Storyboard = {
        title: parsed.title || input.topic,
        topic: input.topic,
        fps: parseInt(process.env.VIDEO_FPS || '30', 10),
        width: parseInt(process.env.VIDEO_WIDTH || '1080', 10),
        height: parseInt(process.env.VIDEO_HEIGHT || '1920', 10),
        scenes: parsed.scenes.map((s: any, idx: number): Scene => ({
          scene_id: s.scene_id || idx + 1,
          voiceover_text: s.voiceover_text || '',
          visual_prompt: s.visual_prompt || '',
          camera_motion: s.camera_motion || 'zoom in'
        }))
      };

      console.log(`[ScriptGen] Successfully generated ${storyboard.scenes.length} scenes for "${storyboard.title}".`);
      return storyboard;
    } catch (openAiError: any) {
      console.warn(`[ScriptGen] OpenAI API Error: ${openAiError.message}.`);
      if (geminiKey && !geminiKey.includes('your_gemini_api_key')) {
        console.log('[ScriptGen] Attempting Google Gemini fallback...');
      }
    }
  }

  // 2. Try Gemini if configured
  if (geminiKey && !geminiKey.includes('your_gemini_api_key')) {
    try {
      return await generateScriptWithGemini(input, geminiKey, systemPrompt, userPrompt);
    } catch (geminiError: any) {
      console.warn(`[ScriptGen] Gemini API Error: ${geminiError.message}.`);
    }
  }

  // 3. Fallback to deterministic mock storyboard
  console.log('[ScriptGen] Using high-retention mock storyboard template.');
  return generateMockScript(input);
}
