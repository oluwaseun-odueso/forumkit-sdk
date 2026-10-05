import { describe, it, expect, jest } from '@jest/globals';
import type { LLMFn, LLMStreamFn } from '../../src/index';
import { suggestTags, summariseThread, suggestAnswer, suggestAnswerStream, extractJSONObjects } from '../../src/adapters/llm';

describe('extractJSONObjects', () => {
  it('extracts objects separated by newlines (the documented format)', () => {
    const objs: unknown[] = [];
    const remainder = extractJSONObjects('{"a":1}\n{"a":2}\n', (o) => objs.push(o));
    expect(objs).toEqual([{ a: 1 }, { a: 2 }]);
    expect(remainder).toBe('');
  });

  it('extracts objects separated only by a space — the actual failure mode', () => {
    // Confirmed directly against a real model response: it follows the
    // one-object-per-line instruction for a while, then drifts to gluing
    // several objects together with a plain space partway through a longer
    // reply. buffer.split('\n') treated that whole run as one unparseable
    // "line" and silently dropped it entirely — this is the regression test
    // for that.
    const objs: unknown[] = [];
    extractJSONObjects('{"type":"chunk","text":"a"} {"type":"chunk","text":"b"} {"type":"meta","confidence":"high"}', (o) => objs.push(o));
    expect(objs).toEqual([
      { type: 'chunk', text: 'a' },
      { type: 'chunk', text: 'b' },
      { type: 'meta', confidence: 'high' },
    ]);
  });

  it('extracts objects with no separator at all', () => {
    const objs: unknown[] = [];
    extractJSONObjects('{"a":1}{"a":2}', (o) => objs.push(o));
    expect(objs).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it('does not miscount braces inside string values', () => {
    const objs: unknown[] = [];
    extractJSONObjects('{"text":"has a { brace } inside"} {"text":"second"}', (o) => objs.push(o));
    expect(objs).toEqual([{ text: 'has a { brace } inside' }, { text: 'second' }]);
  });

  it('holds back an incomplete trailing object as the remainder', () => {
    const objs: unknown[] = [];
    const remainder = extractJSONObjects('{"a":1} {"a":2', (o) => objs.push(o));
    expect(objs).toEqual([{ a: 1 }]);
    expect(remainder).toBe('{"a":2');
  });

  it('completes a held-back remainder once the rest arrives in a later chunk', () => {
    const objs: unknown[] = [];
    let buffer = extractJSONObjects('{"a":1} {"a":2', (o) => objs.push(o));
    buffer += '}';
    extractJSONObjects(buffer, (o) => objs.push(o));
    expect(objs).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it('skips a malformed object without losing the ones around it', () => {
    const objs: unknown[] = [];
    extractJSONObjects('{"a":1} {not valid json} {"a":2}', (o) => objs.push(o));
    expect(objs).toEqual([{ a: 1 }, { a: 2 }]);
  });
});

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

describe('suggestAnswerStream', () => {
  // Regression test for the reported bug: Suggest Reply always failed with
  // "AI service unavailable" while Summarise worked, because the model's
  // real streamed output doesn't reliably keep to one-JSON-object-per-line
  // even when explicitly instructed to — confirmed directly against a real
  // response, where several chunk objects ended up glued together with a
  // plain space instead of a newline partway through a longer reply.
  // fetchSuggest in AiRow.tsx only shows "done" if at least one chunk event
  // arrived, so losing every chunk (the old buffer.split('\n') behaviour on
  // input shaped like this) is exactly what produced the always-broken panel.
  function makeStreamFn(rawResponse: string, chunkBoundaries: number[]): LLMStreamFn {
    return jest.fn<LLMStreamFn>().mockImplementation(async (_sys, _user, onChunk) => {
      let start = 0;
      for (const end of [...chunkBoundaries, rawResponse.length]) {
        onChunk(rawResponse.slice(start, end));
        start = end;
      }
    });
  }

  it('still delivers every chunk when the model glues several objects together with a space', async () => {
    const raw = '{"type":"chunk","text":"first"} {"type":"chunk","text":"second"} {"type":"meta","confidence":"high","caveats":[]}';
    const streamFn = makeStreamFn(raw, [40]); // split mid-stream, same as real network chunking
    const events: unknown[] = [];
    await suggestAnswerStream('title', ['post'], streamFn, (e) => events.push(e));
    expect(events).toEqual([
      { type: 'chunk', text: 'first' },
      { type: 'chunk', text: 'second' },
      { type: 'meta', confidence: 'high', caveats: [] },
    ]);
  });

  it('still works for the well-formed newline-separated case', async () => {
    const raw = '{"type":"chunk","text":"first"}\n{"type":"meta","confidence":"low","caveats":["a"]}\n';
    const streamFn = makeStreamFn(raw, [20]);
    const events: unknown[] = [];
    await suggestAnswerStream('title', ['post'], streamFn, (e) => events.push(e));
    expect(events).toEqual([
      { type: 'chunk', text: 'first' },
      { type: 'meta', confidence: 'low', caveats: ['a'] },
    ]);
  });

  it('strips em/en dashes and double hyphens from chunk text', async () => {
    const raw = '{"type":"chunk","text":"a -- b – c — d"}';
    const streamFn = makeStreamFn(raw, []);
    const events: { type: string; text?: string }[] = [];
    await suggestAnswerStream('title', ['post'], streamFn, (e) => events.push(e as { type: string; text?: string }));
    expect(events[0]?.text).toBe('a, b , c , d');
  });
});
