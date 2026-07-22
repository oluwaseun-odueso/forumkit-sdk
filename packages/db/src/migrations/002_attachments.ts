import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`CREATE TYPE attachment_status AS ENUM ('pending', 'confirmed', 'deleted')`);

  // ── attachments ───────────────────────────────────────────────────
  // post_id is nullable: an attachment is uploaded and confirmed
  // BEFORE the post that references it exists (upload media, get back
  // confirmed attachment ids, then create the post with those ids).
  // forum_id is denormalized here (not derived via post_id) so
  // per-forum ownership/quota queries never need a join for
  // not-yet-attached rows. Soft delete only, consistent with
  // posts/threads — never a hard DELETE.
  pgm.sql(`
    CREATE TABLE attachments (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      forum_id     UUID NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
      post_id      UUID REFERENCES posts(id) ON DELETE SET NULL,
      uploader_id  UUID NOT NULL REFERENCES users(id),
      storage_key  TEXT NOT NULL UNIQUE,
      mime_type    TEXT NOT NULL,
      byte_size    BIGINT NOT NULL,
      width        INT,
      height       INT,
      status       attachment_status NOT NULL DEFAULT 'pending',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      confirmed_at TIMESTAMPTZ
    )
  `);
  pgm.sql(`CREATE INDEX idx_attachments_forum_id    ON attachments(forum_id)`);
  pgm.sql(`CREATE INDEX idx_attachments_post_id     ON attachments(post_id)`);
  pgm.sql(`CREATE INDEX idx_attachments_uploader_id ON attachments(uploader_id)`);
  pgm.sql(`CREATE INDEX idx_attachments_status      ON attachments(status)`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE IF EXISTS attachments`);
  pgm.sql(`DROP TYPE IF EXISTS attachment_status`);
}
