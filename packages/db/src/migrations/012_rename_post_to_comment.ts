import type { MigrationBuilder } from 'node-pg-migrate';

// "Post" was always the wrong name for this entity — it's a reply within a
// thread (what the frontend already correctly calls a "comment"), not the
// top-level submission (which the frontend calls a "post"). This migration
// only renames identifiers via ALTER ... RENAME; no data is touched, and
// Postgres automatically keeps CHECK constraints/partial index predicates
// pointing at the renamed columns without needing them rewritten.

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER TABLE posts RENAME TO comments`);
  pgm.sql(`ALTER TABLE comments RENAME COLUMN parent_post_id TO parent_comment_id`);
  pgm.sql(`ALTER TYPE post_status RENAME TO comment_status`);
  pgm.sql(`ALTER TRIGGER posts_updated_at ON comments RENAME TO comments_updated_at`);

  pgm.sql(`ALTER INDEX idx_posts_thread_id RENAME TO idx_comments_thread_id`);
  pgm.sql(`ALTER INDEX idx_posts_author_id RENAME TO idx_comments_author_id`);
  pgm.sql(`ALTER INDEX idx_posts_parent_post_id RENAME TO idx_comments_parent_comment_id`);
  pgm.sql(`ALTER INDEX idx_posts_status RENAME TO idx_comments_status`);
  pgm.sql(`ALTER INDEX idx_posts_created_at RENAME TO idx_comments_created_at`);
  pgm.sql(`ALTER INDEX idx_posts_embedding RENAME TO idx_comments_embedding`);

  pgm.sql(`ALTER TABLE reactions RENAME COLUMN post_id TO comment_id`);
  pgm.sql(`ALTER INDEX idx_reactions_post_id RENAME TO idx_reactions_comment_id`);

  pgm.sql(`ALTER TABLE moderation_queue RENAME COLUMN post_id TO comment_id`);
  pgm.sql(`ALTER INDEX idx_moderation_queue_post_id RENAME TO idx_moderation_queue_comment_id`);

  pgm.sql(`ALTER TABLE attachments RENAME COLUMN post_id TO comment_id`);
  pgm.sql(`ALTER INDEX idx_attachments_post_id RENAME TO idx_attachments_comment_id`);

  pgm.sql(`ALTER TABLE votes RENAME COLUMN post_id TO comment_id`);
  pgm.sql(`ALTER INDEX idx_votes_post_id RENAME TO idx_votes_comment_id`);
  pgm.sql(`ALTER INDEX idx_votes_user_post RENAME TO idx_votes_user_comment`);

  pgm.sql(`ALTER TABLE saves RENAME COLUMN post_id TO comment_id`);
  pgm.sql(`ALTER INDEX idx_saves_post_id RENAME TO idx_saves_comment_id`);
  pgm.sql(`ALTER INDEX idx_saves_user_post RENAME TO idx_saves_user_comment`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`ALTER INDEX idx_saves_user_comment RENAME TO idx_saves_user_post`);
  pgm.sql(`ALTER INDEX idx_saves_comment_id RENAME TO idx_saves_post_id`);
  pgm.sql(`ALTER TABLE saves RENAME COLUMN comment_id TO post_id`);

  pgm.sql(`ALTER INDEX idx_votes_user_comment RENAME TO idx_votes_user_post`);
  pgm.sql(`ALTER INDEX idx_votes_comment_id RENAME TO idx_votes_post_id`);
  pgm.sql(`ALTER TABLE votes RENAME COLUMN comment_id TO post_id`);

  pgm.sql(`ALTER INDEX idx_attachments_comment_id RENAME TO idx_attachments_post_id`);
  pgm.sql(`ALTER TABLE attachments RENAME COLUMN comment_id TO post_id`);

  pgm.sql(`ALTER INDEX idx_moderation_queue_comment_id RENAME TO idx_moderation_queue_post_id`);
  pgm.sql(`ALTER TABLE moderation_queue RENAME COLUMN comment_id TO post_id`);

  pgm.sql(`ALTER INDEX idx_reactions_comment_id RENAME TO idx_reactions_post_id`);
  pgm.sql(`ALTER TABLE reactions RENAME COLUMN comment_id TO post_id`);

  pgm.sql(`ALTER INDEX idx_comments_embedding RENAME TO idx_posts_embedding`);
  pgm.sql(`ALTER INDEX idx_comments_created_at RENAME TO idx_posts_created_at`);
  pgm.sql(`ALTER INDEX idx_comments_status RENAME TO idx_posts_status`);
  pgm.sql(`ALTER INDEX idx_comments_parent_comment_id RENAME TO idx_posts_parent_post_id`);
  pgm.sql(`ALTER INDEX idx_comments_author_id RENAME TO idx_posts_author_id`);
  pgm.sql(`ALTER INDEX idx_comments_thread_id RENAME TO idx_posts_thread_id`);

  pgm.sql(`ALTER TRIGGER comments_updated_at ON comments RENAME TO posts_updated_at`);
  pgm.sql(`ALTER TYPE comment_status RENAME TO post_status`);
  pgm.sql(`ALTER TABLE comments RENAME COLUMN parent_comment_id TO parent_post_id`);
  pgm.sql(`ALTER TABLE comments RENAME TO posts`);
}
