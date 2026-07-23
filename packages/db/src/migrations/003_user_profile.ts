import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS bio          TEXT,
      ADD COLUMN IF NOT EXISTS avatar_url   TEXT,
      ADD COLUMN IF NOT EXISTS banner_url   TEXT,
      ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '[]'
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE users
      DROP COLUMN IF EXISTS bio,
      DROP COLUMN IF EXISTS avatar_url,
      DROP COLUMN IF EXISTS banner_url,
      DROP COLUMN IF EXISTS social_links
  `);
}
