import { AudioChunk } from './types';

export interface ChunkingOptions {
  targetChunkSeconds?: number; // default: 25 seconds
  wpm?: number; // default: 140 WPM
  paragraphPauseMs?: number; // default: 600ms
  sectionBreakMs?: number; // default: 1200ms
  fullStopPauseMs?: number; // default: 300ms
}

/**
 * Splits long-form narration scripts into optimal 20-40 second audio chunks
 * preserving natural paragraph cadence and sentence boundaries.
 */
export function chunkLongScript(
  text: string,
  options: ChunkingOptions = {}
): AudioChunk[] {
  const targetSeconds = options.targetChunkSeconds || 25;
  const wpm = options.wpm || 140;
  const wordsPerSecond = wpm / 60;
  const targetWordsPerChunk = Math.round(targetSeconds * wordsPerSecond); // ~58 words

  // Split text by paragraphs first to preserve semantic flow
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const sentences: string[] = [];

  for (const para of paragraphs) {
    // Regex sentence splitter matching period, exclamation, question mark followed by space or end
    const paraSentences = para
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (paraSentences.length > 0) {
      sentences.push(...paraSentences);
      // Mark paragraph break
      sentences.push('__PARAGRAPH_BREAK__');
    }
  }

  const chunks: AudioChunk[] = [];
  let currentWords: string[] = [];
  let chunkIndex = 1;

  for (let i = 0; i < sentences.length; i++) {
    const item = sentences[i];

    if (item === '__PARAGRAPH_BREAK__') {
      // If we already accumulated enough words, close chunk on paragraph boundary
      if (currentWords.length >= targetWordsPerChunk * 0.75) {
        const chunkText = currentWords.join(' ').trim();
        if (chunkText) {
          const count = chunkText.split(/\s+/).length;
          chunks.push({
            chunkIndex: chunkIndex++,
            text: chunkText,
            wordCount: count,
            estimatedSeconds: Math.round((count / wordsPerSecond) * 10) / 10,
            status: 'pending'
          });
          currentWords = [];
        }
      }
      continue;
    }

    const itemWords = item.split(/\s+/).filter(Boolean);

    if (currentWords.length + itemWords.length > targetWordsPerChunk * 1.3 && currentWords.length > 0) {
      // Close current chunk and start new one
      const chunkText = currentWords.join(' ').trim();
      const count = chunkText.split(/\s+/).length;
      chunks.push({
        chunkIndex: chunkIndex++,
        text: chunkText,
        wordCount: count,
        estimatedSeconds: Math.round((count / wordsPerSecond) * 10) / 10,
        status: 'pending'
      });
      currentWords = [...itemWords];
    } else {
      currentWords.push(...itemWords);
    }
  }

  // Push remaining words
  if (currentWords.length > 0) {
    const chunkText = currentWords.join(' ').trim();
    const count = chunkText.split(/\s+/).length;
    chunks.push({
      chunkIndex: chunkIndex++,
      text: chunkText,
      wordCount: count,
      estimatedSeconds: Math.round((count / wordsPerSecond) * 10) / 10,
      status: 'pending'
    });
  }

  return chunks;
}
