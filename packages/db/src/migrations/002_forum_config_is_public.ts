import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Backfill any existing rows that don't have isPublic yet
  pgm.sql(`
    UPDATE forums
    SET config = config || '{"isPublic": false}'::jsonb
    WHERE config->>'isPublic' IS NULL
  `);

  // Update the column default so new rows created outside the API also get it
  pgm.sql(`
    ALTER TABLE forums
    ALTER COLUMN config SET DEFAULT '{
      "isPublic": false,
      "moderationThreshold": 0.80,
      "moderationReviewThreshold": 0.50,
      "aiEnabled": true,
      "maxPostLength": 10000,
      "requireApproval": false
    }'
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE forums
    ALTER COLUMN config SET DEFAULT '{
      "moderationThreshold": 0.80,
      "moderationReviewThreshold": 0.50,
      "aiEnabled": true,
      "maxPostLength": 10000,
      "requireApproval": false
    }'
  `);

  pgm.sql(`
    UPDATE forums
    SET config = config - 'isPublic'
  `);
}
