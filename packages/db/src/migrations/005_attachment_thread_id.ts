import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Attachments could already only link to a post (a reply). Threads carry
  // their own body directly (no post row required), so media attached at
  // thread-creation time had nowhere to link — this closes that gap.
  pgm.sql(`ALTER TABLE attachments ADD COLUMN thread_id UUID REFERENCES threads(id) ON DELETE SET NULL`);
  pgm.sql(`CREATE INDEX idx_attachments_thread_id ON attachments(thread_id)`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP INDEX IF EXISTS idx_attachments_thread_id`);
  pgm.sql(`ALTER TABLE attachments DROP COLUMN IF EXISTS thread_id`);
}
