import type { LLMFn, LLMStreamFn } from '../index';
import type { AISummary, AISuggestion } from '@forumkit/types';

/**
 * Calls the LLM and parses the response as JSON.
 * Returns null on failure so the UI can show a friendly error
 * rather than an unhandled exception.
 */
async function safeLLMCall(
  systemPrompt: string,
  userPrompt: string,
  llmFn: LLMFn,
): Promise<string | null> {
  try {
    const raw = await llmFn(systemPrompt, userPrompt);
    return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  } catch (err) {
    console.error('[ai/llm] LLM call failed:', err);
    return null;
  }
}

export type AskBullet   = { fact: string; quote: string; sourceIndex: number };
export type AskCategory = { title: string; bullets: AskBullet[] };
export type AskAnswer   = { intro: string; categories: AskCategory[] };

export type AskStreamEvent =
  | { type: 'intro'; text: string }
  | { type: 'category'; title: string; bullets: AskBullet[] }
  | { type: 'error'; message: string };

/**
 * Summarises search results into categorised bullet points, each attributed
 * to a specific source thread by 0-based index. Returns null on LLM failure.
 */
export async function askSearchQuestion(
  question: string,
  context: Array<{ title: string; bodySnippet: string }>,
  llmFn: LLMFn,
): Promise<AskAnswer | null> {
  const systemPrompt = [
    'You are a helpful assistant that summarises forum discussions.',
    'Return ONLY valid JSON matching this exact schema:',
    '{"intro":string,"categories":[{"title":string,"bullets":[{"fact":string,"quote":string,"sourceIndex":number}]}]}.',
    '"intro" is a one-sentence general summary.',
    '"categories" are 2-4 thematic groupings you derive from the content',
    '(e.g. "What people say about X today", "Why users think Y", "Signs that Z").',
    '"fact" is the key insight for that bullet (1 sentence).',
    '"quote" is a short direct quote or paraphrase from that thread.',
    '"sourceIndex" is the 0-based index of the thread the bullet came from.',
    'Each category should have 1-3 bullets. No markdown outside the JSON.',
  ].join(' ');
  const contextText = context
    .map((c, i) => `[${i}] "${c.title}": ${c.bodySnippet}`)
    .join('\n\n');
  const userPrompt = `Search query: "${question}"\n\nThreads (0-indexed):\n${contextText}`;
  const raw = await safeLLMCall(systemPrompt, userPrompt, llmFn);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AskAnswer;
  } catch {
    console.error('[ai/llm] Failed to parse askSearchQuestion JSON:', raw);
    return null;
  }
}

/**
 * Streams a categorised answer from the LLM as NDJSON events.
 * Calls onEvent once per parsed line; ignores malformed lines.
 */
export async function askSearchQuestionStream(
  question: string,
  context: Array<{ title: string; bodySnippet: string }>,
  llmStreamFn: LLMStreamFn,
  onEvent: (event: AskStreamEvent) => void,
): Promise<void> {
  const systemPrompt = [
    'You are a helpful assistant that summarises forum discussions.',
    'Output ONLY newline-delimited JSON. Each line must be a complete JSON object. No other text.',
    'Line 1: {"type":"intro","text":"<one-sentence summary of the overall discussion>"}',
    'Lines 2-N (2 to 4 lines): {"type":"category","title":"<thematic heading>","bullets":[{"fact":"<key insight>","quote":"<short direct quote or paraphrase>","sourceIndex":<0-based thread index>}]}',
    'Each category should have 1-3 bullets. sourceIndex is the 0-based index of the source thread.',
    'Output exactly 2-4 category lines. No markdown, no explanation, no prose outside the JSON.',
  ].join(' ');

  const contextText = context
    .map((c, i) => `[${i}] "${c.title}": ${c.bodySnippet}`)
    .join('\n\n');
  const userPrompt = `Search query: "${question}"\n\nThreads (0-indexed):\n${contextText}`;

  let buffer = '';
  await llmStreamFn(systemPrompt, userPrompt, (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        onEvent(JSON.parse(trimmed) as AskStreamEvent);
      } catch { /* malformed line — skip */ }
    }
  });
  // Flush anything remaining in the buffer after the stream ends.
  if (buffer.trim()) {
    try {
      onEvent(JSON.parse(buffer.trim()) as AskStreamEvent);
    } catch { /* ignore */ }
  }
}

/**
 * Suggests 1–3 tags for a thread. Prefers existing tag names; invents new
 * ones only when nothing fits. Returns [] on failure (graceful degradation).
 */
export async function suggestTags(
  title: string,
  body: string,
  existingTagNames: string[],
  llmFn: LLMFn,
): Promise<string[]> {
  const systemPrompt = [
    'You are a helpful assistant that categorises forum threads with short, relevant tags.',
    'Respond ONLY with a JSON array of 1 to 3 tag name strings — no markdown, no explanation.',
    'Example: ["javascript","performance"]',
    'Prefer names from the existing tags list when they fit.',
    'Only invent a new tag name if none of the existing tags are appropriate.',
    'Tag names must be lowercase, max 30 characters, use hyphens instead of spaces.',
  ].join(' ');

  const existingSection =
    existingTagNames.length > 0
      ? `Existing tags: ${existingTagNames.join(', ')}`
      : 'No existing tags — create appropriate ones.';

  const userPrompt = [
    `Thread title: ${title}`,
    `Thread body: ${body.slice(0, 500)}`,
    existingSection,
    'Return 1-3 tag names as a JSON array.',
  ].join('\n');

  const raw = await safeLLMCall(systemPrompt, userPrompt, llmFn);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t): t is string => typeof t === 'string' && t.length > 0)
      .slice(0, 3);
  } catch {
    console.error('[ai/llm] Failed to parse suggestTags JSON:', raw);
    return [];
  }
}

/**
 * Suggests a concise title for a new thread based on its body text.
 * Returns null on failure (graceful degradation).
 */
export async function suggestTitle(
  body: string,
  llmFn: LLMFn,
): Promise<string | null> {
  const systemPrompt = [
    'You are a helpful assistant that writes concise, engaging forum thread titles.',
    'Respond ONLY with the title string — no quotes, no markdown, no explanation.',
    'The title must be under 120 characters and be a complete sentence or noun phrase.',
  ].join(' ');

  const userPrompt = `Write a clear, engaging title for a forum thread with this description:\n${body.slice(0, 500)}`;

  return safeLLMCall(systemPrompt, userPrompt, llmFn);
}

/**
 * Summarises a forum thread.
 * Returns null if the LLM is unavailable.
 */
export async function summariseThread(
  threadTitle: string,
  posts: string[],
  llmFn: LLMFn,
): Promise<AISummary | null> {
  const systemPrompt = [
    'You are a helpful assistant that summarises forum thread discussions.',
    'Respond ONLY with a JSON object matching this exact shape, no markdown:',
    '{"keyPoints":["..."],"conclusion":"...","openQuestions":["..."]}',
  ].join(' ');

  const userPrompt = [
    `Thread title: ${threadTitle}`,
    `Posts:\n${posts.map((p, i) => `[${i + 1}] ${p}`).join('\n')}`,
    'Summarise the key points, overall conclusion, and any open questions.',
  ].join('\n');

  const raw = await safeLLMCall(systemPrompt, userPrompt, llmFn);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AISummary;
  } catch {
    console.error('[ai/llm] Failed to parse summary JSON:', raw);
    return null;
  }
}

/**
 * Suggests an answer for a forum thread.
 * Returns null if the LLM is unavailable.
 */
export async function suggestAnswer(
  threadTitle: string,
  posts: string[],
  llmFn: LLMFn,
): Promise<AISuggestion | null> {
  const systemPrompt = [
    'You are a knowledgeable forum member writing a genuine reply to a discussion.',
    'Write in a natural, conversational tone — the way a real person would write, not an AI assistant.',
    'Be direct and specific. Avoid filler phrases like "Great question!", "Certainly!", or "I hope this helps".',
    'Do not use em dashes (—) or double hyphens (--); use commas, conjunctions, or separate sentences instead.',
    'Respond ONLY with a JSON object matching this exact shape, no markdown:',
    '{"suggestion":"...","confidence":"high"|"medium"|"low","caveats":["..."]}',
  ].join(' ');

  const userPrompt = [
    `Thread title: ${threadTitle}`,
    `Posts:\n${posts.map((p, i) => `[${i + 1}] ${p}`).join('\n')}`,
    'Suggest a helpful answer based on the discussion.',
  ].join('\n');

  const raw = await safeLLMCall(systemPrompt, userPrompt, llmFn);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AISuggestion;
    parsed.suggestion = parsed.suggestion
      .replace(/\s*--\s*/g, ', ')
      .replace(/—/g, ',');
    return parsed;
  } catch {
    console.error('[ai/llm] Failed to parse suggestion JSON:', raw);
    return null;
  }
}
