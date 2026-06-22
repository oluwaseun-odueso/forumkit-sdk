import { describe, it, expect, jest } from '@jest/globals';
import type { EmbedFn } from '../../src/index';
import { safeEmbed, embedOne } from '../../src/adapters/embedding';

describe('safeEmbed', () => {
  it('returns vectors from embedFn on success', async () => {
    const fn = jest.fn<EmbedFn>().mockResolvedValue([[0.1, 0.2, 0.3]]);
    const result = await safeEmbed(['hello'], fn);
    expect(result).toEqual([[0.1, 0.2, 0.3]]);
    expect(fn).toHaveBeenCalledWith(['hello']);
  });

  it('returns nulls for each text when embedFn throws', async () => {
    const fn = jest.fn<EmbedFn>().mockRejectedValue(new Error('model unavailable'));
    const result = await safeEmbed(['a', 'b', 'c'], fn);
    expect(result).toEqual([null, null, null]);
  });

  it('passes all texts in a single call', async () => {
    const fn = jest.fn<EmbedFn>().mockResolvedValue([[0.1], [0.2]]);
    await safeEmbed(['first', 'second'], fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(['first', 'second']);
  });

  it('handles an empty input array', async () => {
    const fn = jest.fn<EmbedFn>().mockResolvedValue([]);
    const result = await safeEmbed([], fn);
    expect(result).toEqual([]);
  });
});

describe('embedOne', () => {
  it('returns the first vector on success', async () => {
    const fn = jest.fn<EmbedFn>().mockResolvedValue([[0.5, 0.6]]);
    const result = await embedOne('hello', fn);
    expect(result).toEqual([0.5, 0.6]);
  });

  it('returns null when embedFn throws', async () => {
    const fn = jest.fn<EmbedFn>().mockRejectedValue(new Error('fail'));
    const result = await embedOne('hello', fn);
    expect(result).toBeNull();
  });
});
