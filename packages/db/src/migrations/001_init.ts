import type { MigrationBuilder } from 'node-pg-migrate';

const DIMENSION = parseInt(process.env['EMBEDDING_DIMENSION'] ?? '384', 10);

export async function up(pgm: MigrationBuilder): Promise<void> {
  // ── Extensions ────────────────────────────────────────────────────
  // uuid-ossp is intentionally omitted — gen_random_uuid() is built into
  // PostgreSQL 13+ and works without any extension. On Supabase, uuid-ossp
  // lives in the extensions schema and is not on the default search path.
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS vector`);

  // ── Enums ─────────────────────────────────────────────────────────
  pgm.sql(`CREATE TYPE user_role         AS ENUM ('guest', 'member', 'moderator', 'admin')`);
  pgm.sql(`CREATE TYPE thread_status     AS ENUM ('open', 'locked', 'deleted')`);
  pgm.sql(`CREATE TYPE post_status       AS ENUM ('visible', 'hidden', 'deleted')`);
  pgm.sql(`CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'removed')`);
  pgm.sql(`CREATE TYPE reaction_type     AS ENUM ('like', 'helpful', 'insightful', 'funny')`);

  // ── forums ────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE forums (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name       TEXT NOT NULL,
      owner_id   UUID,
      config     JSONB NOT NULL DEFAULT '{
        "moderationThreshold": 0.80,
        "moderationReviewThreshold": 0.50,
        "aiEnabled": true,
        "maxPostLength": 10000,
        "requireApproval": false
      }',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ── users ─────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_id   TEXT NOT NULL,
      forum_id      UUID NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
      display_name  TEXT NOT NULL,
      email         TEXT NOT NULL,
      role          user_role NOT NULL DEFAULT 'member',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      banned_at     TIMESTAMPTZ,
      banned_reason TEXT,
      UNIQUE (external_id, forum_id)
    )
  `);
  pgm.sql(`CREATE INDEX idx_users_forum_id    ON users(forum_id)`);
  pgm.sql(`CREATE INDEX idx_users_external_id ON users(external_id)`);

  // ── tags ──────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE tags (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      forum_id    UUID NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      color       TEXT NOT NULL DEFAULT '#6200EE',
      UNIQUE (forum_id, name)
    )
  `);
  pgm.sql(`CREATE INDEX idx_tags_forum_id ON tags(forum_id)`);

  // ── threads ───────────────────────────────────────────────────────
  // Embedding dimension is read from EMBEDDING_DIMENSION env var.
  // Default 384 (local all-MiniLM-L6-v2). Use 1536 for OpenAI text-embedding-3-small.
  // Do NOT change this value after table creation without re-embedding all content.
  pgm.sql(`
    CREATE TABLE threads (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      forum_id    UUID NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
      author_id   UUID NOT NULL REFERENCES users(id),
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      status      thread_status NOT NULL DEFAULT 'open',
      pinned      BOOLEAN NOT NULL DEFAULT FALSE,
      view_count  INT NOT NULL DEFAULT 0,
      embedding   vector(${DIMENSION}),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  pgm.sql(`CREATE INDEX idx_threads_forum_id   ON threads(forum_id)`);
  pgm.sql(`CREATE INDEX idx_threads_author_id  ON threads(author_id)`);
  pgm.sql(`CREATE INDEX idx_threads_status     ON threads(status)`);
  pgm.sql(`CREATE INDEX idx_threads_pinned     ON threads(pinned)`);
  pgm.sql(`CREATE INDEX idx_threads_created_at ON threads(created_at DESC)`);

  // HNSW index for vector similarity search.
  // Create this AFTER any bulk data loads to avoid slow incremental indexing.
  pgm.sql(`
    CREATE INDEX idx_threads_embedding ON threads
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
  `);

  // ── thread_tags (many-to-many) ────────────────────────────────────
  pgm.sql(`
    CREATE TABLE thread_tags (
      thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      tag_id    UUID NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
      PRIMARY KEY (thread_id, tag_id)
    )
  `);
  pgm.sql(`CREATE INDEX idx_thread_tags_tag_id ON thread_tags(tag_id)`);

  // ── posts ─────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE posts (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      thread_id          UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      author_id          UUID NOT NULL REFERENCES users(id),
      parent_post_id     UUID REFERENCES posts(id),
      body               TEXT NOT NULL,
      status             post_status NOT NULL DEFAULT 'visible',
      toxicity_score     FLOAT,
      is_accepted_answer BOOLEAN NOT NULL DEFAULT FALSE,
      embedding          vector(${DIMENSION}),
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  pgm.sql(`CREATE INDEX idx_posts_thread_id      ON posts(thread_id)`);
  pgm.sql(`CREATE INDEX idx_posts_author_id      ON posts(author_id)`);
  pgm.sql(`CREATE INDEX idx_posts_parent_post_id ON posts(parent_post_id)`);
  pgm.sql(`CREATE INDEX idx_posts_status         ON posts(status)`);
  pgm.sql(`CREATE INDEX idx_posts_created_at     ON posts(created_at ASC)`);
  pgm.sql(`
    CREATE INDEX idx_posts_embedding ON posts
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
  `);

  // ── reactions ─────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE reactions (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type       reaction_type NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (post_id, user_id, type)
    )
  `);
  pgm.sql(`CREATE INDEX idx_reactions_post_id ON reactions(post_id)`);

  // ── moderation_queue ──────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE moderation_queue (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      reporter_id UUID REFERENCES users(id),
      reason      TEXT NOT NULL DEFAULT '',
      ai_score    FLOAT NOT NULL DEFAULT 0,
      ai_flags    TEXT[] NOT NULL DEFAULT '{}',
      status      moderation_status NOT NULL DEFAULT 'pending',
      reviewer_id UUID REFERENCES users(id),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    )
  `);
  pgm.sql(`CREATE INDEX idx_moderation_queue_status  ON moderation_queue(status)`);
  pgm.sql(`CREATE INDEX idx_moderation_queue_post_id ON moderation_queue(post_id)`);

  // ── api_keys ──────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE api_keys (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      forum_id     UUID NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
      key_hash     TEXT NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ,
      revoked_at   TIMESTAMPTZ
    )
  `);
  pgm.sql(`CREATE INDEX idx_api_keys_forum_id ON api_keys(forum_id)`);

  // ── updated_at trigger ────────────────────────────────────────────
  pgm.sql(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  pgm.sql(`
    CREATE TRIGGER threads_updated_at
      BEFORE UPDATE ON threads
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()
  `);
  pgm.sql(`
    CREATE TRIGGER posts_updated_at
      BEFORE UPDATE ON posts
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP TRIGGER IF EXISTS posts_updated_at   ON posts`);
  pgm.sql(`DROP TRIGGER IF EXISTS threads_updated_at ON threads`);
  pgm.sql(`DROP FUNCTION IF EXISTS set_updated_at`);

  pgm.sql(`DROP TABLE IF EXISTS api_keys`);
  pgm.sql(`DROP TABLE IF EXISTS moderation_queue`);
  pgm.sql(`DROP TABLE IF EXISTS reactions`);
  pgm.sql(`DROP TABLE IF EXISTS posts`);
  pgm.sql(`DROP TABLE IF EXISTS thread_tags`);
  pgm.sql(`DROP TABLE IF EXISTS threads`);
  pgm.sql(`DROP TABLE IF EXISTS tags`);
  pgm.sql(`DROP TABLE IF EXISTS users`);
  pgm.sql(`DROP TABLE IF EXISTS forums`);

  pgm.sql(`DROP TYPE IF EXISTS reaction_type`);
  pgm.sql(`DROP TYPE IF EXISTS moderation_status`);
  pgm.sql(`DROP TYPE IF EXISTS post_status`);
  pgm.sql(`DROP TYPE IF EXISTS thread_status`);
  pgm.sql(`DROP TYPE IF EXISTS user_role`);
}
