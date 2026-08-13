import type { DB } from '../db';
import type { Notification, NotificationPrefs } from '@forumkit/types';
import { ok, err, type Result } from '../lib/result';
import * as repo from '../repositories/notification';

export type NotificationError = 'not_found';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function listNotifications(
  db: DB,
  forumId: string,
  userId: string,
  page: number | undefined,
  limit: number | undefined,
): Promise<{ results: Notification[]; total: number; page: number; limit: number }> {
  const p = Math.max(1, page ?? DEFAULT_PAGE);
  const l = Math.min(MAX_LIMIT, Math.max(1, limit ?? DEFAULT_LIMIT));
  const { results, total } = await repo.listNotifications(db, forumId, userId, { page: p, limit: l });
  return { results, total, page: p, limit: l };
}

export async function getUnreadCount(db: DB, forumId: string, userId: string): Promise<number> {
  return repo.countUnread(db, forumId, userId);
}

export async function markRead(db: DB, id: string, userId: string): Promise<Result<void, NotificationError>> {
  const updated = await repo.markRead(db, id, userId);
  if (!updated) return err('not_found');
  return ok(undefined);
}

export async function markAllRead(db: DB, forumId: string, userId: string): Promise<void> {
  await repo.markAllRead(db, forumId, userId);
}

export async function getNotificationPrefs(db: DB, userId: string): Promise<NotificationPrefs> {
  return repo.getNotificationPrefs(db, userId);
}

export async function updateNotificationPrefs(
  db: DB,
  userId: string,
  prefs: NotificationPrefs,
): Promise<void> {
  await repo.updateNotificationPrefs(db, userId, prefs);
}

// ── Trigger helpers ──────────────────────────────────────────────────
// Called fire-and-forget (`void notifyX(...)`) from the services that own
// each event (comment.ts's createComment, vote.ts's voteOnThread/
// voteOnComment) — a notification failing to insert must never fail the
// action that triggered it. Each helper owns its own "don't notify
// yourself" and "respect the recipient's prefs" checks, so callers don't
// have to duplicate that logic per trigger site.

type NotifyCommentReplyInput = {
  forumId: string;
  threadId: string;
  replyCommentId: string;
  replierId: string;
  parentCommentAuthorId: string;
};

export async function notifyCommentReply(db: DB, input: NotifyCommentReplyInput): Promise<void> {
  if (input.replierId === input.parentCommentAuthorId) return;
  const prefs = await repo.getNotificationPrefs(db, input.parentCommentAuthorId);
  if (!prefs.commentReply) return;
  await repo.insertNotification(db, {
    forumId: input.forumId,
    userId: input.parentCommentAuthorId,
    actorId: input.replierId,
    type: 'comment_reply',
    threadId: input.threadId,
    commentId: input.replyCommentId,
  });
}

type NotifyVoteInput = {
  forumId: string;
  kind: 'thread' | 'comment';
  threadId: string;
  commentId?: string | null;
  voterId: string;
  authorId: string;
  direction: 'up' | 'down';
};

export async function notifyVote(db: DB, input: NotifyVoteInput): Promise<void> {
  if (input.voterId === input.authorId) return;
  const prefs = await repo.getNotificationPrefs(db, input.authorId);
  if (!prefs.vote) return;
  await repo.insertNotification(db, {
    forumId: input.forumId,
    userId: input.authorId,
    actorId: input.voterId,
    type: 'vote',
    threadId: input.threadId,
    commentId: input.kind === 'comment' ? input.commentId ?? null : null,
    message: input.direction,
  });
}
