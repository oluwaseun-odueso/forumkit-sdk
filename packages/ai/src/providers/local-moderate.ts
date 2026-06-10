import type { ModerateFn } from '../index.js';

/**
 * Local moderation provider using unitary/toxic-bert.
 * TODO: integrate @xenova/transformers for in-process inference.
 * For now returns a neutral score so posts publish without moderation blocking.
 */
export function localModerate(): ModerateFn {
  return async (_text: string) => ({
    score: 0,
    flags: [],
    provider: 'local-stub',
  });
}
