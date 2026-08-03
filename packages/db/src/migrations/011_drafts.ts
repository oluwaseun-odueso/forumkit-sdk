import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // A draft is a loose scratch copy of composer state, not a structured
  // domain entity — content is JSONB rather than a wide column set for that
  // reason. title stays its own column since the drafts list displays and
  // could plausibly order by it, which would be awkward reaching into JSONB.
  pgm.sql(`
    CREATE TABLE drafts (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      forum_id   UUID NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      content    JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql(`CREATE INDEX idx_drafts_user ON drafts(user_id, forum_id)`);

  // set_updated_at() already exists, created in 001_init.ts.
  pgm.sql(`
    CREATE TRIGGER drafts_updated_at
      BEFORE UPDATE ON drafts
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TRIGGER IF EXISTS drafts_updated_at ON drafts`);
  pgm.sql(`DROP TABLE IF EXISTS drafts`);
}
