type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX = 50;

/**
 * Checks and increments the AI command rate limit for a given key.
 * Returns true if the request is allowed, false if the limit is exceeded.
 * Key format: `ai:${externalUserId}:${forumId}`
 */
export function tryConsumeAiLimit(key: string): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX) return false;
  entry.count += 1;
  return true;
}
