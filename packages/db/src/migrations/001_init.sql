-- Migration: 001_init
-- ForumKit initial schema
-- Run: npm run migrate --workspace=packages/db

-- ── Extensions ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Enums ─────────────────────────────────────────────────────────
CREATE TYPE user_role       AS ENUM ('guest', 'member', 'moderator', 'admin');
CREATE TYPE thread_status   AS ENUM ('open', 'locked', 'deleted');
CREATE TYPE post_status     AS ENUM ('visible', 'hidden', 'deleted');
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'removed');
CREATE TYPE reaction_type   AS ENUM ('like', 'helpful', 'insightful', 'funny');

-- ── forums ────────────────────────────────────────────────────────
CREATE TABLE forums (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  owner_id   UUID,                        -- set after users table exists
  config     JSONB NOT NULL DEFAULT '{
    "moderationThreshold": 0.80,
    "moderationReviewThreshold": 0.50,
    "aiEnabled": true,
    "maxPostLength": 10000,
    "requireApproval": false
  }',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── users ─────────────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id   TEXT NOT NULL,            -- ID from host application JWT
  forum_id      UUID NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  email         TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'member',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  banned_at     TIMESTAMPTZ,
  banned_reason TEXT,
  UNIQUE (external_id, forum_id)
);

CREATE INDEX idx_users_forum_id   ON users(forum_id);
CREATE INDEX idx_users_external_id ON users(external_id);

-- ── tags ──────────────────────────────────────────────────────────
CREATE TABLE tags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forum_id    UUID NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT '#6200EE',
  UNIQUE (forum_id, name)
);

CREATE INDEX idx_tags_forum_id ON tags(forum_id);

-- ── threads ───────────────────────────────────────────────────────
-- EMBEDDING_DIMENSION env var must be set before running this migration.
-- Default 384 (local all-MiniLM). Use 1536 for OpenAI text-embedding-3-small.
-- This value cannot be changed after table creation without re-embedding all content.
CREATE TABLE threads (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forum_id    UUID NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  status      thread_status NOT NULL DEFAULT 'open',
  pinned      BOOLEAN NOT NULL DEFAULT FALSE,
  view_count  INT NOT NULL DEFAULT 0,
  embedding   vector(384),             -- nullable: populated asynchronously
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_threads_forum_id   ON threads(forum_id);
CREATE INDEX idx_threads_author_id  ON threads(author_id);
CREATE INDEX idx_threads_status     ON threads(status);
CREATE INDEX idx_threads_pinned     ON threads(pinned);
CREATE INDEX idx_threads_created_at ON threads(created_at DESC);

-- HNSW index for vector similarity search.
-- Create this AFTER any bulk data loads, not before.
-- m=16 and ef_construction=64 are safe defaults for most deployments.
CREATE INDEX idx_threads_embedding ON threads
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ── thread_tags (many-to-many) ────────────────────────────────────
CREATE TABLE thread_tags (
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  tag_id    UUID NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
  PRIMARY KEY (thread_id, tag_id)
);

CREATE INDEX idx_thread_tags_tag_id ON thread_tags(tag_id);

-- ── posts ─────────────────────────────────────────────────────────
CREATE TABLE posts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id         UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  author_id         UUID NOT NULL REFERENCES users(id),
  parent_post_id    UUID REFERENCES posts(id),   -- null = top-level reply
  body              TEXT NOT NULL,
  status            post_status NOT NULL DEFAULT 'visible',
  toxicity_score    FLOAT,                        -- nullable: populated asynchronously
  is_accepted_answer BOOLEAN NOT NULL DEFAULT FALSE,
  embedding         vector(384),                 -- nullable: populated asynchronously
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_thread_id       ON posts(thread_id);
CREATE INDEX idx_posts_author_id       ON posts(author_id);
CREATE INDEX idx_posts_parent_post_id  ON posts(parent_post_id);
CREATE INDEX idx_posts_status          ON posts(status);
CREATE INDEX idx_posts_created_at      ON posts(created_at ASC);

CREATE INDEX idx_posts_embedding ON posts
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ── reactions ─────────────────────────────────────────────────────
CREATE TABLE reactions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       reaction_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id, type)
);

CREATE INDEX idx_reactions_post_id ON reactions(post_id);

-- ── moderation_queue ──────────────────────────────────────────────
CREATE TABLE moderation_queue (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES users(id),         -- null = AI-triggered
  reason      TEXT NOT NULL DEFAULT '',
  ai_score    FLOAT NOT NULL DEFAULT 0,
  ai_flags    TEXT[] NOT NULL DEFAULT '{}',
  status      moderation_status NOT NULL DEFAULT 'pending',
  reviewer_id UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_moderation_queue_status  ON moderation_queue(status);
CREATE INDEX idx_moderation_queue_post_id ON moderation_queue(post_id);

-- ── api_keys ──────────────────────────────────────────────────────
CREATE TABLE api_keys (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forum_id    UUID NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
  key_hash    TEXT NOT NULL,                     -- bcrypt hash of the actual key
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_forum_id ON api_keys(forum_id);

-- ── updated_at trigger ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER threads_updated_at
  BEFORE UPDATE ON threads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
