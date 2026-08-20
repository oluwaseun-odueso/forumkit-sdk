import type { DB } from '../db';
import type { LLMFn, EmbedFn } from '@forumkit/ai';
import type { AISummary, AISuggestion, SimilarThread } from '@forumkit/types';
import { summariseThread, suggestAnswer, suggestTitle, suggestTags, embedOne } from '@forumkit/ai';
import { getThread } from './thread';
import { findRelatedThreads } from '../repositories/search';
import { ok, err, type Result } from '../lib/result';

export type AICommandError = 'thread_not_found' | 'ai_unavailable';

const MAX_COMMENTS = 20;
const MAX_COMMENT_CHARS = 1_000;

function buildCommentContext(comments: { body: string; status: string }[]): string[] {
  return comments
    .filter((p) => p.status === 'visible')
    .slice(0, MAX_COMMENTS)
    .map((p) => p.body.slice(0, MAX_COMMENT_CHARS));
}

export async function summarise(
  db: DB,
  publicApiUrl: string,
  forumId: string,
  threadId: string,
  llmFn: LLMFn,
): Promise<Result<AISummary, AICommandError>> {
  const threadResult = await getThread(db, publicApiUrl, forumId, threadId);
  if (!threadResult.ok) return err('thread_not_found');

  const { thread, comments } = threadResult.value;
  const commentBodies = buildCommentContext(comments);
  const summary = await summariseThread(thread.title, commentBodies, llmFn);
  if (!summary) return err('ai_unavailable');
  return ok(summary);
}

export async function suggest(
  db: DB,
  publicApiUrl: string,
  forumId: string,
  threadId: string,
  llmFn: LLMFn,
): Promise<Result<AISuggestion, AICommandError>> {
  const threadResult = await getThread(db, publicApiUrl, forumId, threadId);
  if (!threadResult.ok) return err('thread_not_found');

  const { thread, comments } = threadResult.value;
  const commentBodies = buildCommentContext(comments);
  const suggestion = await suggestAnswer(thread.title, commentBodies, llmFn);
  if (!suggestion) return err('ai_unavailable');
  return ok(suggestion);
}

export async function surfaceRelated(
  db: DB,
  forumId: string,
  threadId: string,
  embedFn: EmbedFn,
): Promise<Result<SimilarThread[], AICommandError>> {
  type ThreadRow = { id: string; title: string; body: string; embedding: string | null; forum_id: string };
  const rows = await db<ThreadRow[]>`
    SELECT id, title, body, embedding, forum_id
    FROM threads
    WHERE id = ${threadId} AND status != 'deleted'
    LIMIT 1
  `;
  const thread = rows[0];
  if (!thread || thread.forum_id !== forumId) return err('thread_not_found');

  let vector: number[] | null = null;
  if (thread.embedding) {
    vector = JSON.parse(thread.embedding) as number[];
  } else {
    vector = await embedOne(`${thread.title} ${thread.body}`, embedFn);
  }

  if (!vector) return err('ai_unavailable');

  const related = await findRelatedThreads(db, thread.forum_id, vector, threadId, 5);
  return ok(related);
}

export type SuggestMetadataInput = {
  title: string;
  body: string;
  existingTagNames: string[];
};

export type SuggestMetadataResult = {
  title: string | null;
  tags: string[];
};

export async function suggestMetadata(
  input: SuggestMetadataInput,
  llmFn: LLMFn,
): Promise<SuggestMetadataResult> {
  const [title, tags] = await Promise.all([
    suggestTitle(input.body, llmFn),
    suggestTags(input.title, input.body, input.existingTagNames, llmFn),
  ]);
  return { title, tags };
}
