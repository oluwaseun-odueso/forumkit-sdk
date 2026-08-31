import type { AskAnswer } from '@forumkit/ai';
import type { SearchResult } from '@forumkit/types';

type Entry = { answer: AskAnswer; sources: SearchResult[]; suggestions: string[]; expiresAt: number };

const cache = new Map<string, Entry>();
const TTL_MS = 5 * 60 * 1000;   // 5 min
const MAX_ENTRIES = 500;         // evict oldest when full

// Sweep expired entries every TTL so the map doesn't hold stale data indefinitely.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cache) {
    if (now >= v.expiresAt) cache.delete(k);
  }
}, TTL_MS).unref();

function cacheKey(forumId: string, q: string): string {
  return `${forumId}:${q.toLowerCase().trim().replace(/\s+/g, ' ')}`;
}

export function getCachedAsk(
  forumId: string,
  q: string,
): { answer: AskAnswer; sources: SearchResult[]; suggestions: string[] } | null {
  const k = cacheKey(forumId, q);
  const entry = cache.get(k);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    cache.delete(k);
    return null;
  }
  // Refresh position in insertion order (makes the map behave like an LRU on access).
  cache.delete(k);
  cache.set(k, entry);
  return { answer: entry.answer, sources: entry.sources, suggestions: entry.suggestions };
}

export function setCachedAsk(
  forumId: string,
  q: string,
  value: { answer: AskAnswer; sources: SearchResult[]; suggestions: string[] },
): void {
  // Evict the oldest entry when we're at the size limit.
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(cacheKey(forumId, q), { answer: value.answer, sources: value.sources, suggestions: value.suggestions, expiresAt: Date.now() + TTL_MS });
}
