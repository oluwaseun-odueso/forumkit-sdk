import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Dual-nullable-FK pattern mirrors attachments (003_attachments.ts /
  // 005_attachment_thread_id.ts) — exactly one of post_id/thread_id is set,
  // depending on whether the vote is on a reply or on the thread itself.
  pgm.sql(`
    CREATE TABLE votes (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id    UUID REFERENCES posts(id) ON DELETE CASCADE,
      thread_id  UUID REFERENCES threads(id) ON DELETE CASCADE,
      direction  SMALLINT NOT NULL CHECK (direction IN (-1, 1)),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT votes_exactly_one_target CHECK (
        (post_id IS NOT NULL AND thread_id IS NULL) OR
        (post_id IS NULL AND thread_id IS NOT NULL)
      )
    )
  `);

  // Partial unique indexes, not a single multi-column UNIQUE: NULL != NULL in
  // Postgres, so a plain UNIQUE(user_id, post_id, thread_id) would not stop
  // the same user voting on the same thread twice (thread_id always NULL on
  // post-vote rows and vice versa). ON CONFLICT against these must repeat
  // the WHERE predicate to match.
  pgm.sql(`CREATE UNIQUE INDEX idx_votes_user_post   ON votes(user_id, post_id)   WHERE post_id IS NOT NULL`);
  pgm.sql(`CREATE UNIQUE INDEX idx_votes_user_thread ON votes(user_id, thread_id) WHERE thread_id IS NOT NULL`);
  pgm.sql(`CREATE INDEX idx_votes_post_id   ON votes(post_id)   WHERE post_id IS NOT NULL`);
  pgm.sql(`CREATE INDEX idx_votes_thread_id ON votes(thread_id) WHERE thread_id IS NOT NULL`);

  // set_updated_at() already exists, created in 001_init.ts.
  pgm.sql(`
    CREATE TRIGGER votes_updated_at
      BEFORE UPDATE ON votes
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TRIGGER IF EXISTS votes_updated_at ON votes`);
  pgm.sql(`DROP TABLE IF EXISTS votes`);
}
