import type { LLMFn } from '../index';
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
    return await llmFn(systemPrompt, userPrompt);
  } catch (err) {
    console.error('[ai/llm] LLM call failed:', err);
    return null;
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
    'You are a helpful assistant that suggests answers in forum threads.',
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
    return JSON.parse(raw) as AISuggestion;
  } catch {
    console.error('[ai/llm] Failed to parse suggestion JSON:', raw);
    return null;
  }
}
