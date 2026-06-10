import type { DB } from '../db';
import type { CreateThreadBody, ThreadListQuery } from '@forumkit/types';
import type { EmbedFn } from '@forumkit/ai';
import { embedOne } from '@forumkit/ai';
import * as threadRepo from '../repositories/thread';
import type { ThreadWithMetaData } from '../repositories/thread';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function listThreads(
  db: DB,
  forumId: string,
  query: ThreadListQuery,
): Promise<{ threads: ThreadWithMetaData[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, query.page ?? DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));

  const result = await threadRepo.listThreads(db, forumId, {
    tagId: query.tagId,
    sort: query.sort ?? 'latest',
    page,
    limit,
  });

  return { ...result, page, limit };
}

export async function createThread(
  db: DB,
  embedFn: EmbedFn,
  forumId: string,
  authorId: string,
  body: CreateThreadBody,
): Promise<ThreadWithMetaData> {
  const thread = await threadRepo.createThread(db, {
    forumId,
    authorId,
    title: body.title,
    body: body.body,
    tagIds: body.tagIds,
  });

  // Fire-and-forget: embed asynchronously, never block the response
  void embedThread(db, embedFn, thread.id, thread.title, thread.body);

  return thread;
}

async function embedThread(
  db: DB,
  embedFn: EmbedFn,
  threadId: string,
  title: string,
  body: string,
): Promise<void> {
  try {
    const vector = await embedOne(`${title} ${body}`, embedFn);
    if (vector) {
      await threadRepo.updateThreadEmbedding(db, threadId, vector);
    }
  } catch (err) {
    // Graceful degradation: embedding failure never surfaces to the caller
    console.error('[thread-service] embedding failed for thread %s: %o', threadId, err);
  }
}
