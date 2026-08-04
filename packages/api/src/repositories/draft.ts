import type { DB } from '../db';
import type { Draft, DraftContent } from '@forumkit/types';

type DraftRow = {
  id: string;
  user_id: string;
  forum_id: string;
  title: string;
  content: DraftContent;
  created_at: Date;
  updated_at: Date;
};

function toDraft(row: DraftRow): Draft {
  return {
    id: row.id,
    userId: row.user_id,
    forumId: row.forum_id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createDraft(
  db: DB,
  forumId: string,
  userId: string,
  title: string,
  content: DraftContent,
): Promise<Draft> {
  const rows = await db<DraftRow[]>`
    INSERT INTO drafts (user_id, forum_id, title, content)
    VALUES (${userId}, ${forumId}, ${title}, ${db.json(content)})
    RETURNING id, user_id, forum_id, title, content, created_at, updated_at
  `;
  return toDraft(rows[0]!);
}

export async function getDraftById(db: DB, draftId: string): Promise<Draft | null> {
  const rows = await db<DraftRow[]>`
    SELECT id, user_id, forum_id, title, content, created_at, updated_at
    FROM drafts
    WHERE id = ${draftId}
  `;
  return rows[0] ? toDraft(rows[0]) : null;
}

export async function listDraftsByUser(db: DB, forumId: string, userId: string): Promise<Draft[]> {
  const rows = await db<DraftRow[]>`
    SELECT id, user_id, forum_id, title, content, created_at, updated_at
    FROM drafts
    WHERE user_id = ${userId} AND forum_id = ${forumId}
    ORDER BY updated_at DESC
  `;
  return rows.map(toDraft);
}

// Fetches-then-writes rather than a SQL-side COALESCE — mixing a json-typed
// parameter with the jsonb column in one COALESCE call trips a type
// mismatch in postgres, and the extra round trip is irrelevant here.
export async function updateDraft(
  db: DB,
  draftId: string,
  fields: { title?: string | undefined; content?: DraftContent | undefined },
): Promise<Draft | null> {
  const existing = await getDraftById(db, draftId);
  if (!existing) return null;

  const title = fields.title ?? existing.title;
  const content = fields.content ?? existing.content;

  const rows = await db<DraftRow[]>`
    UPDATE drafts
    SET title = ${title}, content = ${db.json(content)}
    WHERE id = ${draftId}
    RETURNING id, user_id, forum_id, title, content, created_at, updated_at
  `;
  return rows[0] ? toDraft(rows[0]) : null;
}

export async function deleteDraft(db: DB, draftId: string): Promise<void> {
  await db`DELETE FROM drafts WHERE id = ${draftId}`;
}

// Guards attachment cleanup: an attachment removed from one draft (or from
// a deleted draft) must stay alive if another draft still references it —
// e.g. a future "duplicate draft" feature, or two drafts built from the
// same uploaded image. jsonb_array_elements unnests each draft's stored
// attachment list so the check works across all drafts, not just one row.
export async function isAttachmentReferencedByAnyDraft(db: DB, attachmentId: string): Promise<boolean> {
  const rows = await db<{ referenced: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM drafts d, jsonb_array_elements(d.content->'attachments') elem
      WHERE elem->>'attachmentId' = ${attachmentId}
    ) AS referenced
  `;
  return rows[0]?.referenced ?? false;
}
