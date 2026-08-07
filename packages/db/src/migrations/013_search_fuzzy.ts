import type { MigrationBuilder } from 'node-pg-migrate';

// Backs typo-tolerant search across threads, comments, and user display
// names — pg_trgm's similarity()/gin_trgm_ops let a misspelled query still
// match nearby text, unlike to_tsvector/plainto_tsquery (exact stems only).
export async function up(pgm: MigrationBuilder): Promise<void> {
  // pg_trgm is the Postgres extension that provides trigram matching
  // (similarity(), the % operator, and gin_trgm_ops for indexing) — it's
  // not enabled by default, so every trigram index below depends on this.
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  // GIN index over the trigrams of threads.title. Thread body is already
  // covered by the existing to_tsvector full-text-search path, so only the
  // (short) title needs trigram indexing for fuzzy matching here.
  pgm.sql(`CREATE INDEX idx_threads_title_trgm ON threads USING GIN (title gin_trgm_ops)`);

  // Same idea for comments — they have no separate title field, and bodies
  // are typically short (unlike thread bodies), so indexing body directly
  // is cheap and gives fuzzy matching for in-thread/forum-wide comment search.
  pgm.sql(`CREATE INDEX idx_comments_body_trgm ON comments USING GIN (body gin_trgm_ops)`);

  // Lets the new people-search feature fuzzy-match a misspelled display name.
  pgm.sql(`CREATE INDEX idx_users_display_name_trgm ON users USING GIN (display_name gin_trgm_ops)`);
}

// Reverses the up() migration in exact opposite order: drop the three
// indexes first (they depend on the extension), then the extension itself.
export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP INDEX IF EXISTS idx_users_display_name_trgm`);
  pgm.sql(`DROP INDEX IF EXISTS idx_comments_body_trgm`);
  pgm.sql(`DROP INDEX IF EXISTS idx_threads_title_trgm`);
  pgm.sql(`DROP EXTENSION IF EXISTS pg_trgm`);
}
