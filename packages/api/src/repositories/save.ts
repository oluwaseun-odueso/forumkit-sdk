import type { DB } from '../db';

export type SaveTarget = { kind: 'post'; id: string } | { kind: 'thread'; id: string };

export async function isSaved(db: DB, target: SaveTarget, userId: string): Promise<boolean> {
  const rows = target.kind === 'post'
    ? await db<{ id: string }[]>`SELECT id FROM saves WHERE post_id = ${target.id} AND user_id = ${userId}`
    : await db<{ id: string }[]>`SELECT id FROM saves WHERE thread_id = ${target.id} AND user_id = ${userId}`;
  return rows.length > 0;
}

export async function save(db: DB, target: SaveTarget, userId: string): Promise<void> {
  if (target.kind === 'post') {
    await db`
      INSERT INTO saves (post_id, user_id)
      VALUES (${target.id}, ${userId})
      ON CONFLICT (user_id, post_id) WHERE post_id IS NOT NULL
      DO NOTHING
    `;
  } else {
    await db`
      INSERT INTO saves (thread_id, user_id)
      VALUES (${target.id}, ${userId})
      ON CONFLICT (user_id, thread_id) WHERE thread_id IS NOT NULL
      DO NOTHING
    `;
  }
}

export async function unsave(db: DB, target: SaveTarget, userId: string): Promise<void> {
  if (target.kind === 'post') {
    await db`DELETE FROM saves WHERE post_id = ${target.id} AND user_id = ${userId}`;
  } else {
    await db`DELETE FROM saves WHERE thread_id = ${target.id} AND user_id = ${userId}`;
  }
}

export type SavedIdRow = { id: string; savedAt: Date };

// Returns saved-thread ids alongside when they were saved, so the profile
// activity service can merge/sort threads and posts by save time.
export async function listSavedThreadIds(db: DB, userId: string, forumId: string): Promise<SavedIdRow[]> {
  const rows = await db<{ thread_id: string; created_at: Date }[]>`
    SELECT s.thread_id, s.created_at
    FROM saves s
    JOIN threads t ON t.id = s.thread_id
    WHERE s.user_id = ${userId} AND t.forum_id = ${forumId} AND t.status != 'deleted'
    ORDER BY s.created_at DESC
  `;
  return rows.map((r) => ({ id: r.thread_id, savedAt: r.created_at }));
}

export async function listSavedPostIds(db: DB, userId: string, forumId: string): Promise<SavedIdRow[]> {
  const rows = await db<{ post_id: string; created_at: Date }[]>`
    SELECT s.post_id, s.created_at
    FROM saves s
    JOIN posts p ON p.id = s.post_id
    JOIN threads t ON t.id = p.thread_id
    WHERE s.user_id = ${userId} AND t.forum_id = ${forumId} AND p.status != 'deleted'
    ORDER BY s.created_at DESC
  `;
  return rows.map((r) => ({ id: r.post_id, savedAt: r.created_at }));
}
