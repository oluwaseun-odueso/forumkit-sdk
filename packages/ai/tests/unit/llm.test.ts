import { describe, it, expect, jest } from '@jest/globals';
import type { LLMFn } from '../../src/index';
import { suggestTags, summariseThread, suggestAnswer } from '../../src/adapters/llm';

describe('suggestTags', () => {
  it('parses a valid JSON array from the LLM response', async () => {
    const fn = jest.fn<LLMFn>().mockResolvedValue('["javascript","performance","async"]');
    const result = await suggestTags('Async JS patterns', 'How does Promise.all work?', [], fn);
    expect(result).toEqual(['javascript', 'performance', 'async']);
  });

  it('returns [] when the LLM throws', async () => {
    const fn = jest.fn<LLMFn>().mockRejectedValue(new Error('timeout'));
    const result = await suggestTags('title', 'body', [], fn);
    expect(result).toEqual([]);
  });

  it('returns [] when the LLM response is not valid JSON', async () => {
    const fn = jest.fn<LLMFn>().mockResolvedValue('here are some tags: javascript, react');
    const result = await suggestTags('title', 'body', [], fn);
    expect(result).toEqual([]);
  });

  it('returns [] when the LLM response is a JSON object rather than an array', async () => {
    const fn = jest.fn<LLMFn>().mockResolvedValue('{"tags":["a","b"]}');
    const result = await suggestTags('title', 'body', [], fn);
    expect(result).toEqual([]);
  });

  it('caps the result at 3 tags even when LLM returns more', async () => {
    const fn = jest.fn<LLMFn>().mockResolvedValue('["a","b","c","d","e"]');
    const result = await suggestTags('title', 'body', [], fn);
    expect(result).toHaveLength(3);
  });

  it('filters out non-string items from the array', async () => {
    const fn = jest.fn<LLMFn>().mockResolvedValue('["js",42,null,"react"]');
    const result = await suggestTags('title', 'body', [], fn);
    expect(result).toEqual(['js', 'react']);
  });

  it('includes existing tag names in the prompt', async () => {
    const fn = jest.fn<LLMFn>().mockResolvedValue('["existing-tag"]');
    await suggestTags('title', 'body', ['existing-tag', 'other-tag'], fn);
    const [, userPrompt] = fn.mock.calls[0] as [string, string];
    expect(userPrompt).toContain('existing-tag');
    expect(userPrompt).toContain('other-tag');
  });
});

describe('summariseThread', () => {
  it('parses and returns an AISummary on success', async () => {
    const summary = {
      keyPoints: ['Point 1', 'Point 2'],
      conclusion: 'Use Promise.all for parallelism.',
      openQuestions: ['What about error handling?'],
    };
    const fn = jest.fn<LLMFn>().mockResolvedValue(JSON.stringify(summary));
    const result = await summariseThread('Async JS', ['post 1', 'post 2'], fn);
    expect(result).toEqual(summary);
  });

  it('returns null when the LLM throws', async () => {
    const fn = jest.fn<LLMFn>().mockRejectedValue(new Error('service down'));
    const result = await summariseThread('title', ['p1'], fn);
    expect(result).toBeNull();
  });

  it('returns null when the LLM response is not valid JSON', async () => {
    const fn = jest.fn<LLMFn>().mockResolvedValue('Here is a summary: ...');
    const result = await summariseThread('title', ['p1'], fn);
    expect(result).toBeNull();
  });

  it('includes all post bodies in the prompt', async () => {
    const fn = jest.fn<LLMFn>().mockResolvedValue('{}');
    await summariseThread('title', ['first post', 'second post'], fn);
    const [, userPrompt] = fn.mock.calls[0] as [string, string];
    expect(userPrompt).toContain('first post');
    expect(userPrompt).toContain('second post');
  });
});

describe('suggestAnswer', () => {
  it('parses and returns an AISuggestion on success', async () => {
    const suggestion = {
      suggestion: 'Use `arr.slice().reverse()` for immutable reversal.',
      confidence: 'high' as const,
      caveats: ['Only works on arrays, not strings directly.'],
    };
    const fn = jest.fn<LLMFn>().mockResolvedValue(JSON.stringify(suggestion));
    const result = await suggestAnswer('How to reverse an array?', ['post 1'], fn);
    expect(result).toEqual(suggestion);
  });

  it('returns null when the LLM throws', async () => {
    const fn = jest.fn<LLMFn>().mockRejectedValue(new Error('rate limit'));
    const result = await suggestAnswer('title', ['p1'], fn);
    expect(result).toBeNull();
  });

  it('returns null when the LLM response is not valid JSON', async () => {
    const fn = jest.fn<LLMFn>().mockResolvedValue('I suggest using slice()');
    const result = await suggestAnswer('title', ['p1'], fn);
    expect(result).toBeNull();
  });

  it('includes all post bodies in the prompt', async () => {
    const fn = jest.fn<LLMFn>().mockResolvedValue('{}');
    await suggestAnswer('title', ['reply one', 'reply two'], fn);
    const [, userPrompt] = fn.mock.calls[0] as [string, string];
    expect(userPrompt).toContain('reply one');
    expect(userPrompt).toContain('reply two');
  });
});
