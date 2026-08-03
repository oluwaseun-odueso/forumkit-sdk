import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // NULL means "no override — follow the host app's initial theme setting."
  pgm.sql(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS theme_preference TEXT
        CHECK (theme_preference IN ('light', 'dark'))
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE users DROP COLUMN IF EXISTS theme_preference`);
}
