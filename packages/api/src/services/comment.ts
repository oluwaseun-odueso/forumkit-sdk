import type { DB } from '../db';
import type { Comment, ReactionType, UserRole } from '@forumkit/types';
import type { EmbedFn, ModerateFn } from '@forumkit/ai';
import { embedOne, safeModerate } from '@forumkit/ai';
import { ok, err } from '../lib/result';
import type { Result } from '../lib/result';
import * as repo from '../repositories/comment';
import * as threadRepo from '../repositories/thread';
import { attachToExistingComment } from './storage';
import { notifyReport, notifyCommentReply } from './notification';

export type CommentError = 'comment_not_found' | 'thread_not_found' | 'thread_locked' | 'forbidden';

type CreateCommentOptions = {
  threadId: string;
  authorId: string;
  body: string;
  parentCommentId?: string | undefined;
  attachmentIds?: string[] | undefined;
};

export async function createComment(
  db: DB,
  embedFn: EmbedFn,
  moderateFn: ModerateFn,
  opts: CreateCommentOptions,
): Promise<Result<Comment, CommentError>> {
  const thread = await repo.getThreadInfo(db, opts.threadId);
  if (!thread) return err('thread_not_found');
  if (thread.status === 'locked') return err('thread_locked');
  if (thread.status === 'deleted') return err('thread_not_found');

  const comment = await repo.createComment(db, opts);

  // Best-effort: a bad/foreign attachment id shouldn't fail the whole
  // comment creation, since the comment itself was already created successfully.
  for (const attachmentId of opts.attachmentIds ?? []) {
    await attachToExistingComment(db, attachmentId, comment.id, opts.authorId);
  }

  void embedComment(db, embedFn, comment.id, comment.body);
  void moderateComment(db, moderateFn, comment.id, opts.threadId, comment.body);

  if (opts.parentCommentId) {
    void notifyParentCommentAuthor(db, thread.forumId, opts.threadId, opts.parentCommentId, opts.authorId, comment.id);
  }

  return ok(comment);
}

export async function updateComment(
  db: DB,
  commentId: string,
  requesterId: string,
  requesterRole: UserRole,
  body: string,
): Promise<Result<Comment, CommentError>> {
  const existing = await repo.getCommentById(db, commentId);
  if (!existing) return err('comment_not_found');

  const canEdit =
    existing.authorId === requesterId ||
    requesterRole === 'moderator' ||
    requesterRole === 'admin';

  if (!canEdit) return err('forbidden');

  const comment = await repo.updateComment(db, commentId, body);
  if (!comment) return err('comment_not_found');
  return ok(comment);
}

export async function deleteComment(
  db: DB,
  commentId: string,
  requesterId: string,
  requesterRole: UserRole,
): Promise<Result<void, CommentError>> {
  const comment = await repo.getCommentById(db, commentId);
  if (!comment) return err('comment_not_found');

  const canDelete =
    comment.authorId === requesterId ||
    requesterRole === 'moderator' ||
    requesterRole === 'admin';

  if (!canDelete) return err('forbidden');

  await repo.softDeleteComment(db, commentId);
  return ok(undefined);
}

export async function reactToComment(
  db: DB,
  commentId: string,
  userId: string,
  type: ReactionType,
): Promise<Result<Partial<Record<ReactionType, number>>, CommentError>> {
  const comment = await repo.getCommentById(db, commentId);
  if (!comment) return err('comment_not_found');
  await repo.upsertReaction(db, commentId, userId, type);
  const counts = await repo.getReactionCounts(db, commentId);
  return ok(counts);
}

export async function removeReaction(
  db: DB,
  commentId: string,
  userId: string,
  type: ReactionType,
): Promise<Result<Partial<Record<ReactionType, number>>, CommentError>> {
  const comment = await repo.getCommentById(db, commentId);
  if (!comment) return err('comment_not_found');
  await repo.deleteReaction(db, commentId, userId, type);
  const counts = await repo.getReactionCounts(db, commentId);
  return ok(counts);
}

export async function reportComment(
  db: DB,
  commentId: string,
  reporterId: string,
  reason: string,
): Promise<Result<void, CommentError>> {
  const comment = await repo.getCommentById(db, commentId);
  if (!comment) return err('comment_not_found');
  await repo.insertReport(db, commentId, reporterId, reason);
  // forumId isn't on hand from the comment lookup alone — thread's own
  // record has it (comments don't carry forum_id directly, only threads do).
  const thread = await threadRepo.getThreadById(db, comment.threadId);
  if (thread) void notifyReport(db, { forumId: thread.forumId, reporterId, reason, commentId });
  return ok(undefined);
}

type AcceptAnswerOptions = {
  commentId: string;
  threadId: string;
  requesterId: string;
  requesterRole: UserRole;
};

export async function acceptAnswer(
  db: DB,
  opts: AcceptAnswerOptions,
): Promise<Result<Comment, CommentError>> {
  const [comment, thread] = await Promise.all([
    repo.getCommentById(db, opts.commentId),
    repo.getThreadInfo(db, opts.threadId),
  ]);

  if (!comment) return err('comment_not_found');
  if (!thread) return err('thread_not_found');
  if (comment.threadId !== opts.threadId) return err('comment_not_found');

  const canAccept =
    thread.authorId === opts.requesterId ||
    opts.requesterRole === 'moderator' ||
    opts.requesterRole === 'admin';

  if (!canAccept) return err('forbidden');

  const updated = await repo.setAcceptedAnswer(db, opts.commentId, opts.threadId);
  return ok(updated);
}

async function notifyParentCommentAuthor(
  db: DB,
  forumId: string,
  threadId: string,
  parentCommentId: string,
  replierId: string,
  replyCommentId: string,
): Promise<void> {
  const parent = await repo.getCommentById(db, parentCommentId);
  if (!parent) return;
  await notifyCommentReply(db, {
    forumId,
    threadId,
    replyCommentId,
    replierId,
    parentCommentAuthorId: parent.authorId,
  });
}

async function embedComment(
  db: DB,
  embedFn: EmbedFn,
  commentId: string,
  body: string,
): Promise<void> {
  try {
    const vector = await embedOne(body, embedFn);
    if (vector) await repo.updateCommentEmbedding(db, commentId, vector);
  } catch (e) {
    console.error('[comment-service] embedding failed for comment %s: %o', commentId, e);
  }
}

async function moderateComment(
  db: DB,
  moderateFn: ModerateFn,
  commentId: string,
  threadId: string,
  body: string,
): Promise<void> {
  try {
    const [result, config] = await Promise.all([
      safeModerate(body, moderateFn),
      repo.getForumConfigByThreadId(db, threadId),
    ]);
    if (!config) return;
    const hide = result.score >= config.moderationThreshold;
    await repo.updateCommentToxicity(db, commentId, result.score, hide);
    if (result.score >= config.moderationReviewThreshold) {
      await repo.insertModerationQueueItem(db, commentId, result.score, result.flags);
    }
  } catch (e) {
    console.error('[comment-service] moderation failed for comment %s: %o', commentId, e);
  }
}
