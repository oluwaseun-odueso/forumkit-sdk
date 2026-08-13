import type { DB } from '../db';
import type { Notification, NotificationType, NotificationPrefs } from '@forumkit/types';

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

function toNotification(row: NotificationRow): Notification {
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
): Promise<{ results: Notification[]; total: number }> {
  const offset = (opts.page - 1) * opts.limit;

  const rows = await db<NotificationRow[]>`
    SELECT
      n.id, n.forum_id, n.user_id, n.actor_id,
      u.display_name AS actor_display_name, u.avatar_url AS actor_avatar_url,
      n.type, n.thread_id, n.comment_id, n.message, n.read_at, n.created_at,
      COUNT(*) OVER() AS total_count
    FROM notifications n
    LEFT JOIN users u ON u.id = n.actor_id
    WHERE n.forum_id = ${forumId} AND n.user_id = ${userId}
    ORDER BY n.created_at DESC
    LIMIT ${opts.limit} OFFSET ${offset}
  `;

  return {
    results: rows.map(toNotification),
    total: Number(rows[0]?.total_count ?? 0),
  };
}

export async function countUnread(db: DB, forumId: string, userId: string): Promise<number> {
  const rows = await db<[{ count: string }]>`
    SELECT COUNT(*) AS count
    FROM notifications
    WHERE forum_id = ${forumId} AND user_id = ${userId} AND read_at IS NULL
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

const DEFAULT_PREFS: NotificationPrefs = { commentReply: true, share: true, vote: true };

export async function getNotificationPrefs(db: DB, userId: string): Promise<NotificationPrefs> {
  const rows = await db<[{ notification_prefs: { comment_reply: boolean; share: boolean; vote: boolean } }]>`
    SELECT notification_prefs FROM users WHERE id = ${userId}
  `;
  const prefs = rows[0]?.notification_prefs;
  if (!prefs) return DEFAULT_PREFS;
  return { commentReply: prefs.comment_reply, share: prefs.share, vote: prefs.vote };
}

export async function updateNotificationPrefs(
  db: DB,
  userId: string,
  prefs: NotificationPrefs,
): Promise<void> {
  const jsonPrefs = { comment_reply: prefs.commentReply, share: prefs.share, vote: prefs.vote };
  await db`
    UPDATE users SET notification_prefs = ${db.json(jsonPrefs)} WHERE id = ${userId}
  `;
}
