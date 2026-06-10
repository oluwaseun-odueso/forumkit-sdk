import type { EmbedFn } from '../index.js';

/**
 * Safely embeds an array of texts.
 * Returns null for each text that fails rather than throwing.
 * The API layer stores null embeddings and retries asynchronously.
 */
export async function safeEmbed(
  texts: string[],
  embedFn: EmbedFn,
): Promise<(number[] | null)[]> {
  try {
    const vectors = await embedFn(texts);
    return vectors;
  } catch (err) {
    console.error('[ai/embed] Embedding failed, returning nulls:', err);
    return texts.map(() => null);
  }
}

/**
 * Embeds a single text. Returns null on failure.
 */
export async function embedOne(
  text: string,
  embedFn: EmbedFn,
): Promise<number[] | null> {
  const results = await safeEmbed([text], embedFn);
  return results[0] ?? null;
}
