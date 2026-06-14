import type { DB } from '../db';
import type { ForumConfig, Post, ReactionType, Thread } from '@forumkit/types';

type PostRow = {
  id: string;
  thread_id: string;
  author_id: string;
  parent_post_id: string | null;
  body: string;
  status: Post['status'];
  toxicity_score: number | null;
  is_accepted_answer: boolean;
  reaction_counts: Partial<Record<ReactionType, number>> | null;
  created_at: Date;
  updated_at: Date;
};

type CreatePostInput = {
  threadId: string;
  authorId: string;
  parentPostId?: string | undefined;
  body: string;
};

// Correlated subquery for reaction counts — avoids GROUP BY fan-out on outer joins
const REACTION_COUNTS_SUBQUERY = `
  COALESCE(
    (SELECT JSON_OBJECT_AGG(r.type, r.cnt)
     FROM (
       SELECT type, COUNT(*) AS cnt
       FROM reactions
       WHERE post_id = p.id
       GROUP BY type
     ) r),
    '{}'
  )::json AS reaction_counts
`;

function toPost(row: PostRow): Post {
  return {
    id: row.id,
    threadId: row.thread_id,
    authorId: row.author_id,
    parentPostId: row.parent_post_id,
    body: row.body,
    status: row.status,
    toxicityScore: row.toxicity_score,
    isAcceptedAnswer: row.is_accepted_answer,
    reactionCounts: row.reaction_counts ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPostById(db: DB, postId: string): Promise<Post | null> {
  const rows = await db<PostRow[]>`
    SELECT
      p.id, p.thread_id, p.author_id, p.parent_post_id, p.body,
      p.status, p.toxicity_score, p.is_accepted_answer,
      p.created_at, p.updated_at,
      ${db.unsafe(REACTION_COUNTS_SUBQUERY)}
    FROM posts p
    WHERE p.id = ${postId}
      AND p.status != 'deleted'
  `;
  const row = rows[0];
  return row ? toPost(row) : null;
}

export async function createPost(db: DB, input: CreatePostInput): Promise<Post> {
  const [row] = await db<[{ id: string }]>`
    INSERT INTO posts (thread_id, author_id, parent_post_id, body)
    VALUES (
      ${input.threadId},
      ${input.authorId},
      ${input.parentPostId ?? null},
      ${input.body}
    )
    RETURNING id
  `;
  if (!row) throw new Error('Post insert returned no row');
  const post = await getPostById(db, row.id);
  if (!post) throw new Error('Post not found after create');
  return post;
}

export async function updatePost(db: DB, postId: string, body: string): Promise<Post | null> {
  await db`UPDATE posts SET body = ${body} WHERE id = ${postId}`;
  return getPostById(db, postId);
}

export async function softDeletePost(db: DB, postId: string): Promise<void> {
  await db`UPDATE posts SET status = 'deleted' WHERE id = ${postId}`;
}

export async function upsertReaction(
  db: DB,
  postId: string,
  userId: string,
  type: ReactionType,
): Promise<void> {
  await db`
    INSERT INTO reactions (post_id, user_id, type)
    VALUES (${postId}, ${userId}, ${type})
    ON CONFLICT (post_id, user_id, type) DO NOTHING
  `;
}

export async function deleteReaction(
  db: DB,
  postId: string,
  userId: string,
  type: ReactionType,
): Promise<void> {
  await db`
    DELETE FROM reactions
    WHERE post_id = ${postId} AND user_id = ${userId} AND type = ${type}
  `;
}

export async function getReactionCounts(
  db: DB,
  postId: string,
): Promise<Partial<Record<ReactionType, number>>> {
  const [row] = await db<[{ counts: Partial<Record<ReactionType, number>> | null }]>`
    SELECT COALESCE(
      (SELECT JSON_OBJECT_AGG(type, cnt)
       FROM (
         SELECT type, COUNT(*) AS cnt
         FROM reactions
         WHERE post_id = ${postId}
         GROUP BY type
       ) sub),
      '{}'
    )::json AS counts
  `;
  return row?.counts ?? {};
}

export async function insertReport(
  db: DB,
  postId: string,
  reporterId: string,
  reason: string,
): Promise<void> {
  await db`
    INSERT INTO moderation_queue (post_id, reporter_id, reason)
    VALUES (${postId}, ${reporterId}, ${reason})
  `;
}

export async function setAcceptedAnswer(
  db: DB,
  postId: string,
  threadId: string,
): Promise<Post> {
  const post = await db.begin(async (sql) => {
    await sql`
      UPDATE posts SET is_accepted_answer = FALSE
      WHERE thread_id = ${threadId} AND is_accepted_answer = TRUE
    `;
    await sql`
      UPDATE posts SET is_accepted_answer = TRUE
      WHERE id = ${postId}
    `;
    return getPostById(sql as unknown as DB, postId);
  });
  if (!post) throw new Error('Post not found after setAcceptedAnswer');
  return post;
}

export async function updatePostEmbedding(
  db: DB,
  postId: string,
  embedding: number[],
): Promise<void> {
  await db`
    UPDATE posts
    SET embedding = ${'[' + embedding.join(',') + ']'}::vector
    WHERE id = ${postId}
  `;
}

export async function updatePostToxicity(
  db: DB,
  postId: string,
  score: number,
  hide: boolean,
): Promise<void> {
  if (hide) {
    await db`
      UPDATE posts SET toxicity_score = ${score}, status = 'hidden'
      WHERE id = ${postId}
    `;
  } else {
    await db`UPDATE posts SET toxicity_score = ${score} WHERE id = ${postId}`;
  }
}

export async function insertModerationQueueItem(
  db: DB,
  postId: string,
  aiScore: number,
  aiFlags: string[],
): Promise<void> {
  await db`
    INSERT INTO moderation_queue (post_id, ai_score, ai_flags)
    VALUES (${postId}, ${aiScore}, ${aiFlags})
  `;
}

export async function listPostsByThread(db: DB, threadId: string): Promise<Post[]> {
  const rows = await db<PostRow[]>`
    SELECT
      p.id, p.thread_id, p.author_id, p.parent_post_id, p.body,
      p.status, p.toxicity_score, p.is_accepted_answer,
      p.created_at, p.updated_at,
      ${db.unsafe(REACTION_COUNTS_SUBQUERY)}
    FROM posts p
    WHERE p.thread_id = ${threadId}
      AND p.status != 'deleted'
    ORDER BY p.created_at ASC
  `;
  return rows.map(toPost);
}

export async function getForumConfigByThreadId(
  db: DB,
  threadId: string,
): Promise<ForumConfig | null> {
  const rows = await db<[{ config: ForumConfig }]>`
    SELECT f.config
    FROM forums f
    JOIN threads t ON t.forum_id = f.id
    WHERE t.id = ${threadId}
  `;
  return rows[0]?.config ?? null;
}

export async function getThreadInfo(
  db: DB,
  threadId: string,
): Promise<{ status: Thread['status']; authorId: string } | null> {
  const rows = await db<[{ status: Thread['status']; author_id: string }]>`
    SELECT status, author_id FROM threads WHERE id = ${threadId}
  `;
  const row = rows[0];
  return row ? { status: row.status, authorId: row.author_id } : null;
}
