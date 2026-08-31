import type { MigrationBuilder } from 'node-pg-migrate';

// Backs the Notifications page: one row per event a user should see (a
// share, a reply to their comment, a vote on their thread/comment). `type`
// is plain TEXT rather than a Postgres enum specifically so a future
// trigger is just another INSERT with a new string, not a migration.
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE notifications (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      forum_id   UUID NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      actor_id   UUID REFERENCES users(id) ON DELETE SET NULL,
      type       TEXT NOT NULL,
      thread_id  UUID REFERENCES threads(id) ON DELETE CASCADE,
      comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
      message    TEXT,
      read_at    TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Newest-first list pagination, and the unread-count query, are the only
  // two query shapes this table serves — one index per shape.
  pgm.sql(`CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC)`);
  pgm.sql(`CREATE INDEX idx_notifications_user_read ON notifications (user_id, read_at)`);

  // Per-user opt-out for each notification type — a JSON blob rather than
  // one column per type, so adding a future trigger type is a default-value
  // change, not another migration. Every existing user gets all three
  // known types enabled by default.
  pgm.sql(`
    ALTER TABLE users
      ADD COLUMN notification_prefs JSONB NOT NULL
        DEFAULT '{"comment_reply":true,"share":true,"vote":true}'
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS notification_prefs`);
  pgm.sql(`DROP INDEX IF EXISTS idx_notifications_user_read`);
  pgm.sql(`DROP INDEX IF EXISTS idx_notifications_user_created`);
  pgm.sql(`DROP TABLE IF EXISTS notifications`);
}
