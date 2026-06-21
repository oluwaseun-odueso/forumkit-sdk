import type { DB } from '../db';
import type { Forum, ForumConfig } from '@forumkit/types';

type ForumRow = {
  id: string;
  name: string;
  owner_id: string | null;
  config: ForumConfig;
  created_at: Date;
};

function toForum(row: ForumRow): Forum {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id ?? '',
    config: row.config,
    createdAt: row.created_at,
  };
}

export async function getForumById(db: DB, forumId: string): Promise<Forum | null> {
  const rows = await db<ForumRow[]>`
    SELECT id, name, owner_id, config, created_at
    FROM forums
    WHERE id = ${forumId}
  `;
  const row = rows[0];
  return row ? toForum(row) : null;
}

export async function createForum(
  db: DB,
  input: { name: string; isPublic: boolean },
): Promise<Forum> {
  const rows = await db<ForumRow[]>`
    INSERT INTO forums (name, config)
    VALUES (${input.name}, ${db.json({ isPublic: input.isPublic })}::jsonb)
    RETURNING id, name, owner_id, config, created_at
  `;
  const row = rows[0];
  if (!row) throw new Error('Forum insert returned no row');
  return toForum(row);
}

export async function updateForumConfig(
  db: DB,
  forumId: string,
  patch: Partial<ForumConfig>,
): Promise<Forum | null> {
  const existing = await getForumById(db, forumId);
  if (!existing) return null;

  const merged: ForumConfig = { ...existing.config, ...patch };

  const rows = await db<ForumRow[]>`
    UPDATE forums
    SET config = ${db.json(merged)}
    WHERE id = ${forumId}
    RETURNING id, name, owner_id, config, created_at
  `;
  const row = rows[0];
  return row ? toForum(row) : null;
}
