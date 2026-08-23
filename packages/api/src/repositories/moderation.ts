import type { DB } from '../db';
import type { ModerationQueueItem, ModerationStatus } from '@forumkit/types';

type ModerationRow = {
  id: string;
  comment_id: string | null;
  thread_id: string | null;
  reporter_id: string | null;
  reason: string;
  ai_score: number;
  ai_flags: string[];
  status: ModerationStatus;
  reviewer_id: string | null;
  created_at: Date;
  reviewed_at: Date | null;
  thread_title: string | null;
  comment_body: string | null;
  total_count: string;
};

function toModerationItem(row: ModerationRow): ModerationQueueItem {
  return {
    id: row.id,
    commentId: row.comment_id,
    threadId: row.thread_id,
    reporterId: row.reporter_id,
    reason: row.reason,
    aiScore: row.ai_score,
    aiFlags: row.ai_flags,
    status: row.status,
    reviewerId: row.reviewer_id,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    threadTitle: row.thread_title,
    commentBody: row.comment_body,
  };
}

// Shared static SQL fragments (no user input, so db.unsafe() is the correct
// pattern here — see thread.ts's SORT_CLAUSES for the established
// precedent). Joins in the flagged comment's own text (when the item
// targets a comment) and the resolved thread's title, so a moderator can
// see what's actually being reviewed without a second fetch. thread_id
// resolves to the row's own thread for a thread-level report, or the
// flagged comment's parent thread for a comment-level one.
const QUEUE_SELECT = `
  mq.id, mq.comment_id, COALESCE(mq.thread_id, c.thread_id) AS thread_id,
  mq.reporter_id, mq.reason, mq.ai_score, mq.ai_flags,
  mq.status, mq.reviewer_id, mq.created_at, mq.reviewed_at,
  t.title AS thread_title, c.body AS comment_body
`;
const QUEUE_JOINS = `
  LEFT JOIN comments c ON c.id = mq.comment_id
  LEFT JOIN threads t ON t.id = COALESCE(mq.thread_id, c.thread_id)
`;

export async function listPendingQueue(
  db: DB,
  opts: { page: number; limit: number },
): Promise<{ items: ModerationQueueItem[]; total: number }> {
  const offset = (opts.page - 1) * opts.limit;

  const rows = await db<ModerationRow[]>`
    SELECT ${db.unsafe(QUEUE_SELECT)}, COUNT(*) OVER() AS total_count
    FROM moderation_queue mq
    ${db.unsafe(QUEUE_JOINS)}
    WHERE mq.status = 'pending'
    ORDER BY mq.created_at ASC
    LIMIT ${opts.limit} OFFSET ${offset}
  `;

  return {
    items: rows.map(toModerationItem),
    total: Number(rows[0]?.total_count ?? 0),
  };
}

export async function getModerationItem(
  db: DB,
  itemId: string,
): Promise<ModerationQueueItem | null> {
  const rows = await db<ModerationRow[]>`
    SELECT ${db.unsafe(QUEUE_SELECT)}, 0 AS total_count
    FROM moderation_queue mq
    ${db.unsafe(QUEUE_JOINS)}
    WHERE mq.id = ${itemId}
  `;
  const row = rows[0];
  return row ? toModerationItem(row) : null;
}

export async function resolveItem(
  db: DB,
  itemId: string,
  reviewerId: string,
  action: 'approved' | 'removed',
): Promise<ModerationQueueItem | null> {
  return db.begin(async (sql) => {
    const updated = await sql<{ id: string; comment_id: string | null; thread_id: string | null }[]>`
      UPDATE moderation_queue
      SET
        status      = ${action},
        reviewer_id = ${reviewerId},
        reviewed_at = NOW()
      WHERE id = ${itemId}
        AND status = 'pending'
      RETURNING id, comment_id, thread_id
    `;

    const row = updated[0];
    if (!row) return null;

    if (action === 'removed') {
      if (row.comment_id) {
        await sql`UPDATE comments SET status = 'hidden' WHERE id = ${row.comment_id}`;
      } else if (row.thread_id) {
        // Threads use the 'deleted' status (open | locked | deleted), not
        // comments' 'hidden' — the two entities don't share a status enum.
        await sql`UPDATE threads SET status = 'deleted' WHERE id = ${row.thread_id}`;
      }
    }

    const rows = await sql<ModerationRow[]>`
      SELECT ${sql.unsafe(QUEUE_SELECT)}, 0 AS total_count
      FROM moderation_queue mq
      ${sql.unsafe(QUEUE_JOINS)}
      WHERE mq.id = ${itemId}
    `;
    // Guaranteed to exist — we just updated this exact row above, in the
    // same transaction; the guard is purely to satisfy the type checker.
    const enriched = rows[0];
    return enriched ? toModerationItem(enriched) : null;
  });
}
