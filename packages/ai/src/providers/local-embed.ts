import type { EmbedFn } from '../index.js';

/**
 * Local embedding provider using all-MiniLM-L6-v2 (384 dimensions).
 * TODO: integrate @xenova/transformers for in-process inference.
 * For now returns zero vectors so the rest of the system can be tested.
 */
export function localEmbed(): EmbedFn {
  return async (texts: string[]): Promise<number[][]> => {
    // Stub: returns zero vectors of the correct dimension
    return texts.map(() => new Array(384).fill(0) as number[]);
  };
}
