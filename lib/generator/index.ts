import { GenerationRequest, StoryboardResponse, ProgressUpdate } from './types';
import { generateSinglePassStoryboard } from './singlePassGenerator';
import { generateChunkedStoryboard } from './chunkedGenerator';

export * from './types';
export * from './timing';
export * from './singlePassGenerator';
export * from './chunkedGenerator';

/**
 * Universal Storyboard Generation Orchestrator:
 * Automatically delegates to Single-Pass for short runs (<= 180s)
 * or Chunked Multi-Act Generator for long runs (> 180s up to 7200s / 2 hours).
 */
export async function generateStoryboard(
  request: GenerationRequest,
  onProgress?: (update: ProgressUpdate) => void
): Promise<StoryboardResponse> {
  const duration = request.target_duration_seconds;

  if (duration <= 180) {
    onProgress?.({
      stage: 'outline',
      percent: 30,
      message: 'Synthesizing concise narrative and visual scenes...'
    });
    const result = await generateSinglePassStoryboard(request);
    onProgress?.({
      stage: 'complete',
      percent: 100,
      message: 'Single-pass generation complete!'
    });
    return result;
  } else {
    return await generateChunkedStoryboard(request, onProgress);
  }
}
