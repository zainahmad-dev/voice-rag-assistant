export interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

const DEFAULT_CHUNK_SIZE = 1500;
const DEFAULT_OVERLAP = 200;

const SENTENCE_END_CHARS = new Set([".", "!", "?"]);

/**
 * Finds the best index at or before `idealEnd` to end the current chunk,
 * preferring a sentence boundary, then a word boundary, over a mid-word cut.
 * Only searches the back half of the [start, idealEnd] range so a boundary
 * near `start` can't force an undersized chunk.
 */
function findChunkEnd(text: string, start: number, idealEnd: number): number {
  if (idealEnd >= text.length) return text.length;

  const windowStart = start + Math.floor((idealEnd - start) / 2);
  const window = text.slice(windowStart, idealEnd + 1);

  for (let i = window.length - 1; i >= 0; i--) {
    const char = window[i];
    const nextChar = window[i + 1];
    const followedByWhitespaceOrEnd = nextChar === undefined || /\s/.test(nextChar);
    if (SENTENCE_END_CHARS.has(char) && followedByWhitespaceOrEnd) {
      return windowStart + i + 1;
    }
  }

  for (let i = window.length - 1; i >= 0; i--) {
    if (/\s/.test(window[i])) {
      return windowStart + i;
    }
  }

  // No sentence or word boundary in range (e.g. one very long token) — cut mid-word.
  return idealEnd;
}

/**
 * Nudges `index` to the nearest word boundary (a point where the preceding
 * character is whitespace), searching both directions within [minIndex,
 * maxIndex] and picking whichever is closer so the configured overlap is
 * preserved as closely as possible. Falls back to `index` unchanged (a
 * mid-word cut) if no boundary exists in range.
 */
function snapToWordBoundary(text: string, index: number, minIndex: number, maxIndex: number): number {
  if (index <= minIndex || index >= maxIndex) return index;
  if (/\s/.test(text[index - 1])) return index;

  let back = -1;
  for (let i = index - 1; i >= minIndex; i--) {
    if (/\s/.test(text[i])) {
      back = i + 1;
      break;
    }
  }

  let forward = -1;
  for (let i = index; i < maxIndex; i++) {
    if (/\s/.test(text[i])) {
      forward = i + 1;
      break;
    }
  }

  const backDistance = back === -1 ? Infinity : index - back;
  const forwardDistance = forward === -1 ? Infinity : forward - index;

  if (backDistance === Infinity && forwardDistance === Infinity) return index;
  return backDistance <= forwardDistance ? back : forward;
}

/**
 * Splits `text` into overlapping chunks suitable for embedding, breaking on
 * sentence or word boundaries where possible instead of mid-word.
 */
export function chunkText(
  text: string,
  { chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_OVERLAP }: ChunkOptions = {}
): string[] {
  const normalized = text.trim();
  if (!normalized) return [];
  if (normalized.length <= chunkSize) return [normalized];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const idealEnd = start + chunkSize;
    const end = findChunkEnd(normalized, start, idealEnd);

    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);

    if (end >= normalized.length) break;

    const rawNextStart = end - overlap;
    start =
      rawNextStart > start
        ? snapToWordBoundary(normalized, rawNextStart, start, end)
        : end;
  }

  return chunks;
}
