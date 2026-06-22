import { describe, it, expect, jest } from '@jest/globals';
import type { ModerateFn } from '../../src/index';
import { safeModerate } from '../../src/adapters/moderation';

describe('safeModerate', () => {
  it('returns provider result with degraded=false on success', async () => {
    const fn = jest.fn<ModerateFn>().mockResolvedValue({
      score: 0.12,
      flags: ['TOXICITY'],
      provider: 'test-provider',
    });
    const result = await safeModerate('some text', fn);
    expect(result).toEqual({ score: 0.12, flags: ['TOXICITY'], provider: 'test-provider', degraded: false });
  });

  it('returns neutral result with degraded=true when provider throws', async () => {
    const fn = jest.fn<ModerateFn>().mockRejectedValue(new Error('service down'));
    const result = await safeModerate('some text', fn);
    expect(result.score).toBe(0);
    expect(result.flags).toEqual([]);
    expect(result.degraded).toBe(true);
  });

  it('score=0 in neutral fallback means the post is not blocked', async () => {
    const fn = jest.fn<ModerateFn>().mockRejectedValue(new Error('timeout'));
    const result = await safeModerate('bad content', fn);
    expect(result.score).toBe(0);
  });

  it('passes the original text to the provider', async () => {
    const fn = jest.fn<ModerateFn>().mockResolvedValue({ score: 0, flags: [], provider: 'p' });
    await safeModerate('hello world', fn);
    expect(fn).toHaveBeenCalledWith('hello world');
  });
});
