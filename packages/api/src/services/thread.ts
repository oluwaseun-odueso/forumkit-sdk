import type { DB } from '../db';
import type { CreateThreadBody, ThreadListQuery, SimilarThread, Post, UserRole, AttachmentSummary } from '@forumkit/types';
import type { EmbedFn, LLMFn } from '@forumkit/ai';
import type { StorageAdapter } from '@forumkit/storage';
import { embedOne, suggestTags as aiSuggestTags } from '@forumkit/ai';
import * as threadRepo from '../repositories/thread';
import type { ThreadWithMetaData } from '../repositories/thread';
import * as postRepo from '../repositories/post';
import * as tagsRepo from '../repositories/tags';
import * as attachmentRepo from '../repositories/attachment';
import type { Attachment } from '@forumkit/types';
import { attachToExistingThread } from './storage';
import { ok, err, type Result } from '../lib/result';

export type ThreadError = 'thread_not_found' | 'forbidden';
export type ThreadWithAttachments = ThreadWithMetaData & { attachments: AttachmentSummary[] };

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

async function toAttachmentSummaries(
  storage: StorageAdapter,
  attachments: Attachment[],
): Promise<AttachmentSummary[]> {
  return Promise.all(
    attachments.map(async (a) => ({
      id: a.id,
      mimeType: a.mimeType,
      width: a.width,
      height: a.height,
      downloadUrl: await storage.getDownloadUrl(a.storageKey),
    })),
  );
}

export async function listThreads(
  db: DB,
  storage: StorageAdapter,
  forumId: string,
  query: ThreadListQuery,
  requesterId?: string | undefined,
): Promise<{ threads: ThreadWithAttachments[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, query.page ?? DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));

  const result = await threadRepo.listThreads(db, forumId, {
    tagId: query.tagId,
    tagName: query.tagName,
    pinned: query.pinned,
    sort: query.sort ?? 'best',
    topWindow: query.topWindow,
    page,
    limit,
    requesterId,
  });

  const allAttachments = await attachmentRepo.listAttachmentsByThreadIds(
    db,
    result.threads.map((t) => t.id),
  );
  const attachmentsByThread = new Map<string, Attachment[]>();
  for (const a of allAttachments) {
    if (!a.threadId) continue;
    const list = attachmentsByThread.get(a.threadId) ?? [];
    list.push(a);
    attachmentsByThread.set(a.threadId, list);
  }

  const threads = await Promise.all(
    result.threads.map(async (t) => ({
      ...t,
      attachments: await toAttachmentSummaries(storage, attachmentsByThread.get(t.id) ?? []),
    })),
  );

  return { threads, total: result.total, page, limit };
}

// Plain thread + posts, no attachment resolution — used by services/ai.ts,
// which only reads title/body/posts and shouldn't need a storage adapter.
export async function getThread(
  db: DB,
  forumId: string,
  threadId: string,
  requesterId?: string | undefined,
): Promise<Result<{ thread: ThreadWithMetaData; posts: Post[] }, 'thread_not_found'>> {
  const thread = await threadRepo.getThreadById(db, threadId, requesterId);
  if (!thread || thread.forumId !== forumId) return err('thread_not_found');

  const posts = await postRepo.listPostsByThread(db, threadId, requesterId);

  // Fire-and-forget: view count increment never blocks the response
  void threadRepo.incrementViewCount(db, threadId);

  return ok({ thread, posts });
}

// Same as getThread, enriched with resolved attachment download URLs —
// used by the route that serves the full thread page to a client.
export async function getThreadWithAttachments(
  db: DB,
  storage: StorageAdapter,
  forumId: string,
  threadId: string,
  requesterId?: string | undefined,
): Promise<Result<{ thread: ThreadWithAttachments; posts: Post[] }, 'thread_not_found'>> {
  const result = await getThread(db, forumId, threadId, requesterId);
  if (!result.ok) return result;

  const { thread, posts } = result.value;
  const threadAttachments = await attachmentRepo.listAttachmentsByThread(db, threadId);

  return ok({
    thread: { ...thread, attachments: await toAttachmentSummaries(storage, threadAttachments) },
    posts,
  });
}

export async function updateThread(
  db: DB,
  forumId: string,
  threadId: string,
  userId: string,
  role: UserRole,
  patch: { title?: string | undefined; body?: string | undefined; tagIds?: string[] | undefined },
): Promise<Result<ThreadWithMetaData, ThreadError>> {
  const thread = await threadRepo.getThreadById(db, threadId);
  if (!thread || thread.forumId !== forumId) return err('thread_not_found');

  if (role !== 'admin' && role !== 'moderator' && thread.authorId !== userId) {
    return err('forbidden');
  }

  const updated = await threadRepo.updateThread(db, threadId, patch);
  if (!updated) return err('thread_not_found');
  return ok(updated);
}

export async function deleteThread(
  db: DB,
  forumId: string,
  threadId: string,
  userId: string,
  role: UserRole,
): Promise<Result<void, ThreadError>> {
  const thread = await threadRepo.getThreadById(db, threadId);
  if (!thread || thread.forumId !== forumId) return err('thread_not_found');

  if (role !== 'admin' && role !== 'moderator' && thread.authorId !== userId) {
    return err('forbidden');
  }

  await threadRepo.softDeleteThread(db, threadId);
  return ok(undefined);
}

export async function lockThread(
  db: DB,
  forumId: string,
  threadId: string,
  lock: boolean,
): Promise<Result<ThreadWithMetaData, 'thread_not_found'>> {
  const thread = await threadRepo.getThreadById(db, threadId);
  if (!thread || thread.forumId !== forumId) return err('thread_not_found');

  const updated = await threadRepo.setThreadLocked(db, threadId, lock);
  if (!updated) return err('thread_not_found');
  return ok(updated);
}

export async function pinThread(
  db: DB,
  forumId: string,
  threadId: string,
  pin: boolean,
): Promise<Result<ThreadWithMetaData, 'thread_not_found'>> {
  const thread = await threadRepo.getThreadById(db, threadId);
  if (!thread || thread.forumId !== forumId) return err('thread_not_found');

  const updated = await threadRepo.setThreadPinned(db, threadId, pin);
  if (!updated) return err('thread_not_found');
  return ok(updated);
}

export async function findDuplicates(
  db: DB,
  embedFn: EmbedFn,
  forumId: string,
  title: string,
  body: string,
  excludeId?: string | undefined,
): Promise<SimilarThread[]> {
  const vector = await embedOne(`${title} ${body}`, embedFn);
  if (!vector) return [];
  return threadRepo.findSimilarThreads(db, forumId, vector, excludeId);
}

export async function createThread(
  db: DB,
  embedFn: EmbedFn,
  llmFn: LLMFn,
  storage: StorageAdapter,
  forumId: string,
  authorId: string,
  body: CreateThreadBody,
): Promise<ThreadWithAttachments> {
  const thread = await threadRepo.createThread(db, {
    forumId,
    authorId,
    title: body.title,
    body: body.body,
    tagIds: body.tagIds,
  });

  // Best-effort: a bad/foreign attachment id shouldn't fail thread
  // creation, since the thread itself was already created successfully.
  for (const attachmentId of body.attachmentIds ?? []) {
    await attachToExistingThread(db, attachmentId, thread.id, authorId);
  }

  // Fire-and-forget async jobs — never block the response
  void embedThread(db, embedFn, thread.id, thread.title, thread.body);
  void suggestAndApplyTags(db, llmFn, forumId, thread.id, body.title, body.body);

  const attachments = await attachmentRepo.listAttachmentsByThread(db, thread.id);
  return { ...thread, attachments: await toAttachmentSummaries(storage, attachments) };
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
  } catch (e) {
    console.error('[thread-service] embedding failed for thread %s: %o', threadId, e);
  }
}

async function suggestAndApplyTags(
  db: DB,
  llmFn: LLMFn,
  forumId: string,
  threadId: string,
  title: string,
  body: string,
): Promise<void> {
  try {
    const existingTags = await tagsRepo.listTagsByForum(db, forumId);
    const existingNames = existingTags.map((t) => t.name);

    const suggestedNames = await aiSuggestTags(title, body, existingNames, llmFn);
    if (suggestedNames.length === 0) return;

    const tags = await Promise.all(
      suggestedNames.map((name) => tagsRepo.upsertTagByName(db, forumId, name)),
    );

    const tagIds = tags.map((t) => t.id);
    await db`
      INSERT INTO thread_tags (thread_id, tag_id)
      SELECT ${threadId}, UNNEST(${tagIds}::uuid[])
      ON CONFLICT DO NOTHING
    `;
  } catch (e) {
    console.error('[thread-service] suggestAndApplyTags failed for thread %s: %o', threadId, e);
  }
}
