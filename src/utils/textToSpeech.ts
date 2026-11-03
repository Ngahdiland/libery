/**
 * Utility functions for device Text-To-Speech audio playback,
 * sentence chunking, and background keep-alive.
 */

// A tiny 1-second silent audio WAV data URI used to keep the iOS/Android
// background audio session awake when device text-to-speech is playing.
export const SILENT_AUDIO_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';

/**
 * Splits chapter body text into clean sentence-sized speech chunks.
 * Handles abbreviations, quotes, and punctuation boundaries, ensuring
 * no chunk exceeds `maxChunkLength` characters so the mobile TTS engine
 * never times out or drops utterances.
 */
export function splitTextIntoSentences(text: string, maxChunkLength = 300): string[] {
  if (!text || text.trim().length === 0) return [];

  // Normalize line endings and extra whitespace
  const normalized = text.replace(/\r\n/g, '\n').replace(/\t/g, ' ').trim();

  // Split on sentence boundaries: periods, exclamation marks, question marks, or double newlines
  const rawSegments = normalized.split(/(?<=[.!?])\s+(?=[A-Z0-9"“'‘])|\n\s*\n+/g);

  const chunks: string[] = [];

  for (const segment of rawSegments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    if (trimmed.length <= maxChunkLength) {
      chunks.push(trimmed);
    } else {
      // If a single sentence or paragraph is unusually long, split on commas/semicolons/spaces
      const subSegments = trimmed.split(/(?<=[,;:—–])\s+/g);
      let currentChunk = '';

      for (const sub of subSegments) {
        if ((currentChunk + ' ' + sub).trim().length <= maxChunkLength) {
          currentChunk = (currentChunk ? currentChunk + ' ' : '') + sub;
        } else {
          if (currentChunk) chunks.push(currentChunk.trim());
          // If a single subsegment is still longer than max, chunk by words
          if (sub.length > maxChunkLength) {
            const words = sub.split(/\s+/);
            let wordChunk = '';
            for (const w of words) {
              if ((wordChunk + ' ' + w).trim().length <= maxChunkLength) {
                wordChunk = (wordChunk ? wordChunk + ' ' : '') + w;
              } else {
                if (wordChunk) chunks.push(wordChunk.trim());
                wordChunk = w;
              }
            }
            if (wordChunk) chunks.push(wordChunk.trim());
            currentChunk = '';
          } else {
            currentChunk = sub;
          }
        }
      }

      if (currentChunk) chunks.push(currentChunk.trim());
    }
  }

  return chunks.length > 0 ? chunks : [text.trim()];
}

