import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Dual-nullable-FK pattern mirrors votes (006_votes.ts) — exactly one of
  // post_id/thread_id is set, depending on whether the save is on a reply
  // or on the thread itself.
  pgm.sql(`
    CREATE TABLE saves (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id    UUID REFERENCES posts(id) ON DELETE CASCADE,
      thread_id  UUID REFERENCES threads(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT saves_exactly_one_target CHECK (
        (post_id IS NOT NULL AND thread_id IS NULL) OR
        (post_id IS NULL AND thread_id IS NOT NULL)
      )
    )
  `);

  pgm.sql(`CREATE UNIQUE INDEX idx_saves_user_post   ON saves(user_id, post_id)   WHERE post_id IS NOT NULL`);
  pgm.sql(`CREATE UNIQUE INDEX idx_saves_user_thread ON saves(user_id, thread_id) WHERE thread_id IS NOT NULL`);
  pgm.sql(`CREATE INDEX idx_saves_post_id   ON saves(post_id)   WHERE post_id IS NOT NULL`);
  pgm.sql(`CREATE INDEX idx_saves_thread_id ON saves(thread_id) WHERE thread_id IS NOT NULL`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TABLE IF EXISTS saves`);
}
