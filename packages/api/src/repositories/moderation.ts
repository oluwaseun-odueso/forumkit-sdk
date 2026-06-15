import type { DB } from '../db';
import type { ModerationQueueItem, ModerationStatus } from '@forumkit/types';

type ModerationRow = {
  id: string;
  post_id: string;
  reporter_id: string | null;
  reason: string;
  ai_score: number;
  ai_flags: string[];
  status: ModerationStatus;
  reviewer_id: string | null;
  created_at: Date;
  reviewed_at: Date | null;
  total_count: string;
};

function toModerationItem(row: ModerationRow): ModerationQueueItem {
  return {
    id: row.id,
    postId: row.post_id,
    reporterId: row.reporter_id,
    reason: row.reason,
    aiScore: row.ai_score,
    aiFlags: row.ai_flags,
    status: row.status,
    reviewerId: row.reviewer_id,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

export async function listPendingQueue(
  db: DB,
  opts: { page: number; limit: number },
): Promise<{ items: ModerationQueueItem[]; total: number }> {
  const offset = (opts.page - 1) * opts.limit;

  const rows = await db<ModerationRow[]>`
    SELECT
      id, post_id, reporter_id, reason, ai_score, ai_flags,
      status, reviewer_id, created_at, reviewed_at,
      COUNT(*) OVER() AS total_count
    FROM moderation_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
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
    SELECT
      id, post_id, reporter_id, reason, ai_score, ai_flags,
      status, reviewer_id, created_at, reviewed_at,
      0 AS total_count
    FROM moderation_queue
    WHERE id = ${itemId}
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
    const rows = await sql<ModerationRow[]>`
      UPDATE moderation_queue
      SET
        status      = ${action},
        reviewer_id = ${reviewerId},
        reviewed_at = NOW()
      WHERE id = ${itemId}
        AND status = 'pending'
      RETURNING
        id, post_id, reporter_id, reason, ai_score, ai_flags,
        status, reviewer_id, created_at, reviewed_at,
        0 AS total_count
    `;

    const row = rows[0];
    if (!row) return null;

    if (action === 'removed') {
      await sql`UPDATE posts SET status = 'hidden' WHERE id = ${row.post_id}`;
    }

    return toModerationItem(row);
  });
}
