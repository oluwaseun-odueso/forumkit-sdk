import type { DB } from '../db';
import type { LLMFn } from '@forumkit/ai';
import type { AISummary, AISuggestion } from '@forumkit/types';
import { summariseThread, suggestAnswer } from '@forumkit/ai';
import { getThread } from './thread';
import { ok, err, type Result } from '../lib/result';

export type AICommandError = 'thread_not_found' | 'ai_unavailable';

const MAX_POSTS = 20;
const MAX_POST_CHARS = 1_000;

function buildPostContext(posts: { body: string; status: string }[]): string[] {
  return posts
    .filter((p) => p.status === 'visible')
    .slice(0, MAX_POSTS)
    .map((p) => p.body.slice(0, MAX_POST_CHARS));
}

export async function summarise(
  db: DB,
  forumId: string,
  threadId: string,
  llmFn: LLMFn,
): Promise<Result<AISummary, AICommandError>> {
  const threadResult = await getThread(db, forumId, threadId);
  if (!threadResult.ok) return err('thread_not_found');

  const { thread, posts } = threadResult.value;
  const postBodies = buildPostContext(posts);
  const summary = await summariseThread(thread.title, postBodies, llmFn);
  if (!summary) return err('ai_unavailable');
  return ok(summary);
}

export async function suggest(
  db: DB,
  forumId: string,
  threadId: string,
  llmFn: LLMFn,
): Promise<Result<AISuggestion, AICommandError>> {
  const threadResult = await getThread(db, forumId, threadId);
  if (!threadResult.ok) return err('thread_not_found');

  const { thread, posts } = threadResult.value;
  const postBodies = buildPostContext(posts);
  const suggestion = await suggestAnswer(thread.title, postBodies, llmFn);
  if (!suggestion) return err('ai_unavailable');
  return ok(suggestion);
}
