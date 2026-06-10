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
