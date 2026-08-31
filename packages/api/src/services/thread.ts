import type { DB } from '../db';
import type { CreateThreadBody, ThreadListQuery, SimilarThread, RelatedThreadForRail, Comment, UserRole, AttachmentSummary } from '@forumkit/types';
import type { EmbedFn, LLMFn } from '@forumkit/ai';
import { embedOne, suggestTags as aiSuggestTags } from '@forumkit/ai';
import * as threadRepo from '../repositories/thread';
import type { ThreadWithMetaData } from '../repositories/thread';
import * as commentRepo from '../repositories/comment';
import * as tagsRepo from '../repositories/tags';
import * as attachmentRepo from '../repositories/attachment';
import * as searchRepo from '../repositories/search';
import type { Attachment } from '@forumkit/types';
import { attachToExistingThread } from './storage';
import { rawAttachmentUrl } from '../lib/attachment-url';
import { ok, err, type Result } from '../lib/result';
import { notifyReport, notifyShare } from './notification';

export type ThreadError = 'thread_not_found' | 'forbidden';
export type ThreadWithAttachments = ThreadWithMetaData & { attachments: AttachmentSummary[] };

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export function toAttachmentSummaries(
  publicApiUrl: string,
  forumId: string,
  attachments: Attachment[],
): AttachmentSummary[] {
  return attachments.map((a) => ({
    id: a.id,
    mimeType: a.mimeType,
    width: a.width,
    height: a.height,
    downloadUrl: rawAttachmentUrl(publicApiUrl, forumId, a.id),
  }));
}

export async function listThreads(
  db: DB,
  publicApiUrl: string,
  forumId: string,
  query: ThreadListQuery,
  requesterId?: string | undefined,
): Promise<{ threads: ThreadWithAttachments[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, query.page ?? DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));

  const result = await threadRepo.listThreads(db, publicApiUrl, forumId, {
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

  const threads = result.threads.map((t) => ({
    ...t,
    attachments: toAttachmentSummaries(publicApiUrl, forumId, attachmentsByThread.get(t.id) ?? []),
  }));

  return { threads, total: result.total, page, limit };
}

// Plain thread + comments, no attachment resolution — used by services/ai.ts,
// which only reads title/body/comments and shouldn't need a storage adapter.
export async function getThread(
  db: DB,
  publicApiUrl: string,
  forumId: string,
  threadId: string,
  requesterId?: string | undefined,
): Promise<Result<{ thread: ThreadWithMetaData; comments: Comment[] }, 'thread_not_found'>> {
  const thread = await threadRepo.getThreadById(db, publicApiUrl, threadId, requesterId);
  if (!thread || thread.forumId !== forumId) return err('thread_not_found');

  const comments = await commentRepo.listCommentsByThread(db, publicApiUrl, threadId, requesterId);

  // Fire-and-forget: view count increment never blocks the response
  void threadRepo.incrementViewCount(db, threadId);

  return ok({ thread, comments });
}

// Same as getThread, enriched with resolved attachment download URLs —
// used by the route that serves the full thread page to a client.
export async function getThreadWithAttachments(
  db: DB,
  publicApiUrl: string,
  forumId: string,
  threadId: string,
  requesterId?: string | undefined,
): Promise<Result<{ thread: ThreadWithAttachments; comments: Comment[] }, 'thread_not_found'>> {
  const result = await getThread(db, publicApiUrl, forumId, threadId, requesterId);
  if (!result.ok) return result;

  const { thread, comments } = result.value;
  const threadAttachments = await attachmentRepo.listAttachmentsByThread(db, threadId);

  return ok({
    thread: { ...thread, attachments: toAttachmentSummaries(publicApiUrl, forumId, threadAttachments) },
    comments,
  });
}

export async function updateThread(
  db: DB,
  publicApiUrl: string,
  forumId: string,
  threadId: string,
  userId: string,
  role: UserRole,
  patch: { title?: string | undefined; body?: string | undefined; tagIds?: string[] | undefined },
): Promise<Result<ThreadWithMetaData, ThreadError>> {
  const thread = await commentRepo.getThreadInfo(db, threadId);
  if (!thread || thread.forumId !== forumId) return err('thread_not_found');

  if (role !== 'admin' && role !== 'moderator' && thread.authorId !== userId) {
    return err('forbidden');
  }

  const updated = await threadRepo.updateThread(db, publicApiUrl, threadId, patch);
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
  const thread = await commentRepo.getThreadInfo(db, threadId);
  if (!thread || thread.forumId !== forumId) return err('thread_not_found');

  if (role !== 'admin' && role !== 'moderator' && thread.authorId !== userId) {
    return err('forbidden');
  }

  await threadRepo.softDeleteThread(db, threadId);
  return ok(undefined);
}

// Mirrors services/comment.ts's reportComment, plus notifying the forum's
// moderators/admins (services/comment.ts's reportComment gets the same
// addition below).
export async function reportThread(
  db: DB,
  forumId: string,
  threadId: string,
  reporterId: string,
  reason: string,
): Promise<Result<void, 'thread_not_found'>> {
  const thread = await commentRepo.getThreadInfo(db, threadId);
  if (!thread) return err('thread_not_found');
  await threadRepo.insertReport(db, threadId, reporterId, reason);
  void notifyReport(db, { forumId, reporterId, reason, threadId });
  return ok(undefined);
}

export async function shareThread(
  db: DB,
  forumId: string,
  threadId: string,
  sharerId: string,
  recipientUserIds: string[],
  message: string | null,
): Promise<Result<void, 'thread_not_found'>> {
  const thread = await commentRepo.getThreadInfo(db, threadId);
  if (!thread) return err('thread_not_found');
  // Unlike notifyReport/notifyCommentReply/notifyVote (side effects of some
  // other primary write that must never fail because of them), the
  // notification rows here ARE the share — there's no other record of it,
  // so this is awaited rather than fire-and-forget.
  await notifyShare(db, { forumId, threadId, sharerId, recipientUserIds, message });
  return ok(undefined);
}

export async function lockThread(
  db: DB,
  publicApiUrl: string,
  forumId: string,
  threadId: string,
  lock: boolean,
): Promise<Result<ThreadWithMetaData, 'thread_not_found'>> {
  const thread = await commentRepo.getThreadInfo(db, threadId);
  if (!thread || thread.forumId !== forumId) return err('thread_not_found');

  const updated = await threadRepo.setThreadLocked(db, publicApiUrl, threadId, lock);
  if (!updated) return err('thread_not_found');
  return ok(updated);
}

export async function pinThread(
  db: DB,
  publicApiUrl: string,
  forumId: string,
  threadId: string,
  pin: boolean,
): Promise<Result<ThreadWithMetaData, 'thread_not_found'>> {
  const thread = await commentRepo.getThreadInfo(db, threadId);
  if (!thread || thread.forumId !== forumId) return err('thread_not_found');

  const updated = await threadRepo.setThreadPinned(db, publicApiUrl, threadId, pin);
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
  if (!vector || vector.length === 0) return [];
  return threadRepo.findSimilarThreads(db, forumId, vector, excludeId);
}

// Backs the right rail's "Similar Posts" section — unlike surfaceRelated
// (the manual AI assistant action), this must be cheap enough to call
// automatically every time a thread is opened, so it never calls the
// embedding model live: if the thread's fire-and-forget embed job hasn't
// finished yet, it returns an empty list rather than blocking on one.
export async function getSimilarThreadsForRail(
  db: DB,
  publicApiUrl: string,
  forumId: string,
  threadId: string,
  limit: number,
): Promise<Result<RelatedThreadForRail[], 'thread_not_found'>> {
  type ThreadRow = { embedding: string | null; forum_id: string };
  const rows = await db<ThreadRow[]>`
    SELECT embedding, forum_id FROM threads
    WHERE id = ${threadId} AND status != 'deleted'
    LIMIT 1
  `;
  const thread = rows[0];
  if (!thread || thread.forum_id !== forumId) return err('thread_not_found');
  if (!thread.embedding) return ok([]);

  const vector = JSON.parse(thread.embedding) as number[];
  const related = await searchRepo.findRelatedThreadsForRail(db, publicApiUrl, forumId, vector, threadId, limit);

  // Real media only — never a decorative placeholder. First image
  // attachment per related thread, resolved to a real download URL.
  const allAttachments = await attachmentRepo.listAttachmentsByThreadIds(db, related.map((r) => r.id));
  const firstImageByThread = new Map<string, Attachment>();
  for (const a of allAttachments) {
    if (!a.threadId || !a.mimeType.startsWith('image/')) continue;
    if (!firstImageByThread.has(a.threadId)) firstImageByThread.set(a.threadId, a);
  }

  const withImages = related.map((r) => {
    const image = firstImageByThread.get(r.id);
    return { ...r, imageUrl: image ? rawAttachmentUrl(publicApiUrl, forumId, image.id) : null };
  });

  return ok(withImages);
}

export async function createThread(
  db: DB,
  embedFn: EmbedFn,
  llmFn: LLMFn | null,
  publicApiUrl: string,
  forumId: string,
  authorId: string,
  body: CreateThreadBody,
): Promise<ThreadWithAttachments> {
  const created = await threadRepo.createThread(db, publicApiUrl, {
    forumId,
    authorId,
    title: body.title,
    body: body.body,
    tagIds: body.tagIds,
  });

  // Best-effort: a bad/foreign attachment id shouldn't fail thread
  // creation, since the thread itself was already created successfully.
  for (const attachmentId of body.attachmentIds ?? []) {
    await attachToExistingThread(db, attachmentId, created.id, authorId);
  }

  // A direct user action, unlike suggestAndApplyTags below — resolved
  // synchronously so the tag is guaranteed present in the response. `created`
  // was read before this insert, so its own `tags` field would come back
  // stale (empty) even though the tag is correctly linked — re-fetch after
  // inserting so the response reflects it.
  let thread = created;
  if (body.tagNames && body.tagNames.length > 0) {
    const tags = await Promise.all(body.tagNames.map((name) => tagsRepo.upsertTagByName(db, forumId, name)));
    const tagIds = tags.map((t) => t.id);
    await db`
      INSERT INTO thread_tags (thread_id, tag_id)
      SELECT ${created.id}, UNNEST(${tagIds}::uuid[])
      ON CONFLICT DO NOTHING
    `;
    const refreshed = await threadRepo.getThreadById(db, publicApiUrl, created.id);
    if (refreshed) thread = refreshed;
  }

  // Fire-and-forget async jobs — never block the response
  void embedThread(db, embedFn, thread.id, thread.title, thread.body);
  if (llmFn) void suggestAndApplyTags(db, llmFn, forumId, thread.id, body.title, body.body);

  const attachments = await attachmentRepo.listAttachmentsByThread(db, thread.id);
  return { ...thread, attachments: toAttachmentSummaries(publicApiUrl, forumId, attachments) };
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
    if (vector && vector.length > 0) {
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
