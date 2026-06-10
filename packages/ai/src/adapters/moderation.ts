import type { ModerateFn, ModerateResult } from '../index.js';

const NEUTRAL_RESULT: ModerateResult = {
  score: 0,
  flags: [],
  provider: 'fallback',
};

/**
 * Safely moderates a piece of text.
 * Returns a neutral result on failure so the post is not blocked
 * by a moderation service outage. The post is flagged for delayed review.
 */
export async function safeModerate(
  text: string,
  moderateFn: ModerateFn,
): Promise<ModerateResult & { degraded: boolean }> {
  try {
    const result = await moderateFn(text);
    return { ...result, degraded: false };
  } catch (err) {
    console.error('[ai/moderate] Moderation failed, using neutral result:', err);
    return { ...NEUTRAL_RESULT, degraded: true };
  }
}
