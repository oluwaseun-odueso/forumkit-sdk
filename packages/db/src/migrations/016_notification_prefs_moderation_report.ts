import type { MigrationBuilder } from 'node-pg-migrate';

// Adds the 4th notification type (reports, for admins/moderators) to the
// default notification_prefs JSON — 014_notifications.ts already shipped
// and ran with a 3-key default, so this only updates the column DEFAULT
// for future inserts. Existing rows keep their 3-key JSON; the API layer
// (repositories/notification.ts's getNotificationPrefs) treats a missing
// key as enabled by default, so this is purely cosmetic for new signups,
// not required for correctness.
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE users
      ALTER COLUMN notification_prefs
      SET DEFAULT '{"comment_reply":true,"share":true,"vote":true,"moderation_report":true}'
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE users
      ALTER COLUMN notification_prefs
      SET DEFAULT '{"comment_reply":true,"share":true,"vote":true}'
  `);
}
