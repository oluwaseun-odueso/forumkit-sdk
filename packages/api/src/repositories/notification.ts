import type { DB } from '../db';
import type { Notification, NotificationType, NotificationPrefs } from '@forumkit/types';
import * as attachmentRepo from './attachment';
import { rawAttachmentUrl } from '../lib/attachment-url';

type NotificationRow = {
  id: string;
  forum_id: string;
  user_id: string;
  actor_id: string | null;
  actor_display_name: string | null;
  actor_avatar_url: string | null;
  type: NotificationType;
  thread_id: string | null;
  comment_id: string | null;
  message: string | null;
  read_at: Date | null;
  created_at: Date;
  total_count: string;
};

// Everything except the thread-derived fields, which listNotifications fills
// in afterward via hydrateThreadInfo (a separate batch step, not a per-row
// SQL join — same "fetch rows, then batch-resolve extras" convention
// services/search.ts's hydrateImages already uses).
type BaseNotification = Omit<
  Notification,
  'threadTitle' | 'threadImageUrl' | 'threadAuthorId' | 'threadAuthorDisplayName' | 'threadAuthorAvatarUrl'
>;

function toBaseNotification(row: NotificationRow): BaseNotification {
  return {
    id: row.id,
    forumId: row.forum_id,
    userId: row.user_id,
    actorId: row.actor_id,
    actorDisplayName: row.actor_display_name,
    actorAvatarUrl: row.actor_avatar_url,
    type: row.type,
    threadId: row.thread_id,
    commentId: row.comment_id,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

type ThreadInfoRow = {
  id: string;
  title: string;
  author_id: string;
  author_display_name: string;
  author_avatar_url: string | null;
};

// Resolves each row's thread (comment-only 'report' rows only carry
// commentId, not threadId — see services/notification.ts's notifyReport,
// which doesn't pass threadId when reporting a comment — so those need
// comments.thread_id looked up first), then batch-fetches title+author
// (same join repositories/thread.ts's getThreadById uses) and the thread's
// first image attachment (same find-first-image pattern services/search.ts's
// hydrateImages uses) for every distinct thread involved.
async function hydrateThreadInfo(
  db: DB,
  forumId: string,
  publicApiUrl: string,
  rows: NotificationRow[],
): Promise<Notification[]> {
  if (rows.length === 0) return [];

  const commentIdsNeedingLookup = [...new Set(
    rows.filter(r => !r.thread_id && r.comment_id).map(r => r.comment_id!),
  )];
  const commentThreadRows = commentIdsNeedingLookup.length > 0
    ? await db<{ id: string; thread_id: string }[]>`
        SELECT id, thread_id FROM comments WHERE id = ANY(${commentIdsNeedingLookup}::uuid[])
      `
    : [];
  const threadIdByCommentId = new Map(commentThreadRows.map(c => [c.id, c.thread_id]));

  function effectiveThreadId(row: NotificationRow): string | null {
    if (row.thread_id) return row.thread_id;
    return row.comment_id ? threadIdByCommentId.get(row.comment_id) ?? null : null;
  }

  const threadIds = [...new Set(
    rows.map(effectiveThreadId).filter((id): id is string => id !== null),
  )];

  const threadRows = threadIds.length > 0
    ? await db<ThreadInfoRow[]>`
        SELECT t.id, t.title, t.author_id, u.display_name AS author_display_name, u.avatar_url AS author_avatar_url
        FROM threads t
        JOIN users u ON u.id = t.author_id
        WHERE t.id = ANY(${threadIds}::uuid[])
      `
    : [];
  const threadById = new Map(threadRows.map(t => [t.id, t]));

  const attachments = await attachmentRepo.listAttachmentsByThreadIds(db, threadIds);
  const firstImageByThread = new Map<string, string>();
  for (const a of attachments) {
    if (!a.threadId || !a.mimeType.startsWith('image/')) continue;
    if (!firstImageByThread.has(a.threadId)) {
      firstImageByThread.set(a.threadId, rawAttachmentUrl(publicApiUrl, forumId, a.id));
    }
  }

  return rows.map((row) => {
    const tid = effectiveThreadId(row);
    const thread = tid ? threadById.get(tid) : undefined;
    return {
      ...toBaseNotification(row),
      threadTitle: thread?.title ?? null,
      threadImageUrl: tid ? firstImageByThread.get(tid) ?? null : null,
      threadAuthorId: thread?.author_id ?? null,
      threadAuthorDisplayName: thread?.author_display_name ?? null,
      threadAuthorAvatarUrl: thread?.author_avatar_url ?? null,
    };
  });
}

type InsertNotificationInput = {
  forumId: string;
  userId: string;
  actorId: string | null;
  type: NotificationType;
  threadId?: string | null;
  commentId?: string | null;
  message?: string | null;
};

export async function insertNotification(db: DB, input: InsertNotificationInput): Promise<void> {
  await db`
    INSERT INTO notifications (forum_id, user_id, actor_id, type, thread_id, comment_id, message)
    VALUES (
      ${input.forumId},
      ${input.userId},
      ${input.actorId},
      ${input.type},
      ${input.threadId ?? null},
      ${input.commentId ?? null},
      ${input.message ?? null}
    )
  `;
}

export async function listNotifications(
  db: DB,
  forumId: string,
  userId: string,
  opts: { page: number; limit: number },
  publicApiUrl: string,
): Promise<{ results: Notification[]; total: number }> {
  const offset = (opts.page - 1) * opts.limit;

  // The role check is against the *recipient's current role* (recipient),
  // not the actor — a 'report' row only ever displays for whoever is
  // currently an admin/moderator, regardless of what their role was at
  // insert time (insert-time filtering alone can't handle a later demotion).
  const rows = await db<NotificationRow[]>`
    SELECT
      n.id, n.forum_id, n.user_id, n.actor_id,
      u.display_name AS actor_display_name, u.avatar_url AS actor_avatar_url,
      n.type, n.thread_id, n.comment_id, n.message, n.read_at, n.created_at,
      COUNT(*) OVER() AS total_count
    FROM notifications n
    LEFT JOIN users u ON u.id = n.actor_id
    JOIN users recipient ON recipient.id = n.user_id
    WHERE n.forum_id = ${forumId} AND n.user_id = ${userId}
      AND (n.type != 'report' OR recipient.role IN ('admin', 'moderator'))
    ORDER BY n.created_at DESC
    LIMIT ${opts.limit} OFFSET ${offset}
  `;

  const results = await hydrateThreadInfo(db, forumId, publicApiUrl, rows);
  return { results, total: Number(rows[0]?.total_count ?? 0) };
}

export async function countUnread(db: DB, forumId: string, userId: string): Promise<number> {
  const rows = await db<[{ count: string }]>`
    SELECT COUNT(*) AS count
    FROM notifications n
    JOIN users recipient ON recipient.id = n.user_id
    WHERE n.forum_id = ${forumId} AND n.user_id = ${userId} AND n.read_at IS NULL
      AND (n.type != 'report' OR recipient.role IN ('admin', 'moderator'))
  `;
  return Number(rows[0]?.count ?? 0);
}

// Scoped to userId in the WHERE clause (not just id) so one user can never
// mark another user's notification read via a guessed id.
export async function markRead(db: DB, id: string, userId: string): Promise<boolean> {
  const rows = await db<[{ id: string }] | []>`
    UPDATE notifications
    SET read_at = NOW()
    WHERE id = ${id} AND user_id = ${userId} AND read_at IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}

export async function markAllRead(db: DB, forumId: string, userId: string): Promise<void> {
  await db`
    UPDATE notifications
    SET read_at = NOW()
    WHERE forum_id = ${forumId} AND user_id = ${userId} AND read_at IS NULL
  `;
}

const DEFAULT_PREFS: NotificationPrefs = { commentReply: true, share: true, vote: true, moderationReport: true };

export async function getNotificationPrefs(db: DB, userId: string): Promise<NotificationPrefs> {
  const rows = await db<[{
    notification_prefs: {
      comment_reply?: boolean; share?: boolean; vote?: boolean; moderation_report?: boolean;
    };
  }]>`
    SELECT notification_prefs FROM users WHERE id = ${userId}
  `;
  const prefs = rows[0]?.notification_prefs;
  if (!prefs) return DEFAULT_PREFS;
  // Rows written before moderation_report existed (014_notifications.ts's
  // original 3-key default) just don't have that key — missing means "not
  // explicitly opted out," so it defaults to enabled, same as every other
  // key would if it were somehow absent.
  return {
    commentReply: prefs.comment_reply ?? true,
    share: prefs.share ?? true,
    vote: prefs.vote ?? true,
    moderationReport: prefs.moderation_report ?? true,
  };
}

export async function updateNotificationPrefs(
  db: DB,
  userId: string,
  prefs: NotificationPrefs,
): Promise<void> {
  const jsonPrefs = {
    comment_reply: prefs.commentReply,
    share: prefs.share,
    vote: prefs.vote,
    moderation_report: prefs.moderationReport,
  };
  await db`
    UPDATE users SET notification_prefs = ${db.json(jsonPrefs)} WHERE id = ${userId}
  `;
}
