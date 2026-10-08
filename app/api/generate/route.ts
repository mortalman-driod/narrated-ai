import { NextRequest, NextResponse } from 'next/server';
import { generateStoryboard } from '@/lib/generator';
import { generateProceduralStoryboard } from '@/lib/generator/proceduralEngine';
import { runMockGenerationPipeline } from '@/lib/generator/mockPipeline';
import { GenerationRequest } from '@/lib/generator/types';

export const maxDuration = 300; // Next.js max execution duration for long runs

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const topic = body.topic || 'The Mystery of the Deep Ocean';
    const target_duration_seconds = Math.max(30, Math.min(7200, parseInt(body.target_duration_seconds || body.duration || '60', 10)));
    const niche = body.niche || 'bible-stories';
    const tone = body.tone || 'authoritative';
    const image_model = body.image_model || 'flux';
    const custom_pacing = body.custom_pacing ? parseInt(body.custom_pacing, 10) : undefined;
    const engineMode = body.engine_mode || (body.mock ? 'offline' : 'cloud');

    const script = body.script;
    const is_script_input = Boolean(body.is_script_input);

    const request: GenerationRequest = {
      topic,
      target_duration_seconds,
      niche,
      tone,
      image_model,
      custom_pacing,
      script,
      is_script_input
    };

    console.log(`[API /api/generate] Request received: "${topic}" (${target_duration_seconds}s) [Engine: ${engineMode}]`);

    let result;
    let fallbackUsed = false;
    let fallbackReason = '';

    if (engineMode === 'offline') {
      result = generateProceduralStoryboard(request);
      result.engine_used = 'offline';
    } else {
      try {
        result = await generateStoryboard(request, (progress) => {
          console.log(`[API Progress] ${progress.percent}%: ${progress.message}`);
        });
        result.engine_used = 'cloud';
      } catch (cloudErr: any) {
        console.warn(
          `[API /api/generate] Cloud generation encountered issue: ${cloudErr.message}. Activating graceful Offline Engine fallback...`
        );
        result = generateProceduralStoryboard(request);
        result.fallback_used = true;
        result.engine_used = 'offline';
        result.fallback_reason = cloudErr.message?.includes('high demand')
          ? 'Google Gemini cloud service is currently experiencing high demand. We seamlessly generated your full storyboard using the local 0-API engine.'
          : `Cloud service temporarily unavailable (${cloudErr.message}). Seamlessly generated via local 0-API engine.`;
        fallbackUsed = true;
        fallbackReason = result.fallback_reason;
      }
    }

    return NextResponse.json({
      success: true,
      storyboard: result,
      fallback_used: fallbackUsed,
      fallback_reason: fallbackReason
    });
  } catch (error: any) {
    console.error('[API /api/generate Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate storyboard'
      },
      { status: 500 }
    );
  }
}
