import type { DB } from '../db';
import type { Tag } from '@forumkit/types';

type TagRow = {
  id: string;
  forum_id: string;
  name: string;
  description: string;
  color: string;
};

function toTag(row: TagRow): Tag {
  return {
    id: row.id,
    forumId: row.forum_id,
    name: row.name,
    description: row.description,
    color: row.color,
  };
}

export async function listTagsByForum(db: DB, forumId: string): Promise<Tag[]> {
  const rows = await db<TagRow[]>`
    SELECT id, forum_id, name, description, color
    FROM tags
    WHERE forum_id = ${forumId}
    ORDER BY name ASC
  `;
  return rows.map(toTag);
}

export async function getTagById(db: DB, tagId: string): Promise<Tag | null> {
  const rows = await db<TagRow[]>`
    SELECT id, forum_id, name, description, color
    FROM tags
    WHERE id = ${tagId}
  `;
  const row = rows[0];
  return row ? toTag(row) : null;
}

type CreateTagInput = {
  forumId: string;
  name: string;
  description?: string | undefined;
  color?: string | undefined;
};

export async function createTag(db: DB, input: CreateTagInput): Promise<Tag> {
  const rows = await db<TagRow[]>`
    INSERT INTO tags (forum_id, name, description, color)
    VALUES (
      ${input.forumId},
      ${input.name},
      ${input.description ?? ''},
      ${input.color ?? '#6200EE'}
    )
    RETURNING id, forum_id, name, description, color
  `;
  const row = rows[0];
  if (!row) throw new Error('Tag insert returned no row');
  return toTag(row);
}

type UpdateTagPatch = {
  name?: string | undefined;
  description?: string | undefined;
  color?: string | undefined;
};

export async function updateTag(db: DB, tagId: string, patch: UpdateTagPatch): Promise<Tag | null> {
  const existing = await getTagById(db, tagId);
  if (!existing) return null;

  const rows = await db<TagRow[]>`
    UPDATE tags
    SET
      name        = ${patch.name        ?? existing.name},
      description = ${patch.description ?? existing.description},
      color       = ${patch.color       ?? existing.color}
    WHERE id = ${tagId}
    RETURNING id, forum_id, name, description, color
  `;
  const row = rows[0];
  return row ? toTag(row) : null;
}

export async function deleteTag(db: DB, tagId: string): Promise<void> {
  await db`DELETE FROM tags WHERE id = ${tagId}`;
}

export async function upsertTagByName(db: DB, forumId: string, name: string): Promise<Tag> {
  const rows = await db<TagRow[]>`
    INSERT INTO tags (forum_id, name, description, color)
    VALUES (${forumId}, ${name}, '', '#6200EE')
    ON CONFLICT (forum_id, name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, forum_id, name, description, color
  `;
  const row = rows[0];
  if (!row) throw new Error('upsertTagByName returned no row');
  return toTag(row);
}
