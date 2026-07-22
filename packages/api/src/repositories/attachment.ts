import type { DB } from '../db';
import type { Attachment } from '@forumkit/types';

type AttachmentRow = {
  id: string;
  forum_id: string;
  post_id: string | null;
  uploader_id: string;
  storage_key: string;
  mime_type: string;
  byte_size: string; // BIGINT comes back as a string from the postgres driver
  width: number | null;
  height: number | null;
  status: Attachment['status'];
  created_at: Date;
};

const SELECT_COLUMNS = `
  id, forum_id, post_id, uploader_id, storage_key, mime_type,
  byte_size, width, height, status, created_at
`;

function toAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    forumId: row.forum_id,
    postId: row.post_id,
    uploaderId: row.uploader_id,
    storageKey: row.storage_key,
    mimeType: row.mime_type,
    byteSize: Number(row.byte_size),
    width: row.width,
    height: row.height,
    status: row.status,
    createdAt: row.created_at,
  };
}

// Records a requested upload before any bytes exist in storage —
// status defaults to 'pending' at the DB level.
export async function insertPendingAttachment(
  db: DB,
  input: { forumId: string; uploaderId: string; storageKey: string; mimeType: string; byteSize: number },
): Promise<Attachment> {
  const rows = await db<AttachmentRow[]>`
    INSERT INTO attachments (forum_id, uploader_id, storage_key, mime_type, byte_size)
    VALUES (${input.forumId}, ${input.uploaderId}, ${input.storageKey}, ${input.mimeType}, ${input.byteSize})
    RETURNING ${db.unsafe(SELECT_COLUMNS)}
  `;
  const row = rows[0];
  if (!row) throw new Error('Attachment insert returned no row');
  return toAttachment(row);
}

export async function getAttachmentById(db: DB, id: string): Promise<Attachment | null> {
  const rows = await db<AttachmentRow[]>`
    SELECT ${db.unsafe(SELECT_COLUMNS)}
    FROM attachments
    WHERE id = ${id}
  `;
  const row = rows[0];
  return row ? toAttachment(row) : null;
}

// Flips a pending row to confirmed once the service layer has verified
// the object actually exists in storage. Only confirmed attachments
// can be linked to a post or listed against one.
export async function markConfirmed(
  db: DB,
  id: string,
  input: { byteSize: number; width: number | null; height: number | null },
): Promise<Attachment | null> {
  const rows = await db<AttachmentRow[]>`
    UPDATE attachments
    SET status = 'confirmed', byte_size = ${input.byteSize}, width = ${input.width}, height = ${input.height}, confirmed_at = NOW()
    WHERE id = ${id}
    RETURNING ${db.unsafe(SELECT_COLUMNS)}
  `;
  const row = rows[0];
  return row ? toAttachment(row) : null;
}

// A single post can have many attachments (e.g. several images plus a
// video) — this links one attachment at a time; the service layer
// calls it once per id in the post's attachmentIds.
export async function attachToPost(db: DB, attachmentId: string, postId: string): Promise<void> {
  await db`
    UPDATE attachments
    SET post_id = ${postId}
    WHERE id = ${attachmentId}
  `;
}

export async function softDeleteAttachment(db: DB, id: string): Promise<void> {
  await db`
    UPDATE attachments
    SET status = 'deleted'
    WHERE id = ${id}
  `;
}

export async function listAttachmentsByPost(db: DB, postId: string): Promise<Attachment[]> {
  const rows = await db<AttachmentRow[]>`
    SELECT ${db.unsafe(SELECT_COLUMNS)}
    FROM attachments
    WHERE post_id = ${postId} AND status = 'confirmed'
  `;
  return rows.map(toAttachment);
}
