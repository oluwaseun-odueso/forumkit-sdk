import type { MigrationBuilder } from 'node-pg-migrate';

// moderation_queue currently only supports reporting a comment (comment_id
// NOT NULL, per 012_rename_post_to_comment.ts). Extends it to also support
// reporting a thread — one row can target either a comment or a thread,
// never both/neither, enforced by the CHECK constraint below.
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE moderation_queue ALTER COLUMN comment_id DROP NOT NULL`);
  pgm.sql(`ALTER TABLE moderation_queue ADD COLUMN thread_id UUID REFERENCES threads(id) ON DELETE CASCADE`);
  pgm.sql(`
    ALTER TABLE moderation_queue
      ADD CONSTRAINT moderation_queue_target_check
      CHECK (
        (comment_id IS NOT NULL AND thread_id IS NULL) OR
        (comment_id IS NULL AND thread_id IS NOT NULL)
      )
  `);
  pgm.sql(`CREATE INDEX idx_moderation_queue_thread_id ON moderation_queue (thread_id)`);
}

// Reversing SET NOT NULL back on comment_id would fail if any thread-only
// reports exist by then — acceptable for a dev-reversible migration, not
// meant to be run down against data created after this migration shipped.
export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP INDEX IF EXISTS idx_moderation_queue_thread_id`);
  pgm.sql(`ALTER TABLE moderation_queue DROP CONSTRAINT IF EXISTS moderation_queue_target_check`);
  pgm.sql(`ALTER TABLE moderation_queue DROP COLUMN IF EXISTS thread_id`);
  pgm.sql(`ALTER TABLE moderation_queue ALTER COLUMN comment_id SET NOT NULL`);
}
