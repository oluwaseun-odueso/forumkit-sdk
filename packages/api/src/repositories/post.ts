import type { DB } from '../db';
import type { ForumConfig, Post, ReactionType, Thread, VoteCounts, VoteDirection } from '@forumkit/types';
import { POST_VOTE_COUNTS_SUBQUERY } from './vote';

type PostRow = {
  id: string;
  thread_id: string;
  author_id: string;
  author_display_name: string;
  author_avatar_url: string | null;
  parent_post_id: string | null;
  body: string;
  status: Post['status'];
  toxicity_score: number | null;
  is_accepted_answer: boolean;
  reaction_counts: Partial<Record<ReactionType, number>> | null;
  vote_counts: VoteCounts;
  my_vote: VoteDirection | null;
  is_saved: boolean;
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
    authorDisplayName: row.author_display_name,
    authorAvatarUrl: row.author_avatar_url,
    parentPostId: row.parent_post_id,
    body: row.body,
    status: row.status,
    toxicityScore: row.toxicity_score,
    isAcceptedAnswer: row.is_accepted_answer,
    reactionCounts: row.reaction_counts ?? {},
    voteCounts: row.vote_counts,
    myVote: row.my_vote,
    isSaved: row.is_saved,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPostById(
  db: DB,
  postId: string,
  requesterId?: string | undefined,
): Promise<Post | null> {
  const rows = await db<PostRow[]>`
    SELECT
      p.id, p.thread_id, p.author_id, u.display_name AS author_display_name, u.avatar_url AS author_avatar_url,
      p.parent_post_id, p.body,
      p.status, p.toxicity_score, p.is_accepted_answer,
      p.created_at, p.updated_at,
      ${db.unsafe(REACTION_COUNTS_SUBQUERY)},
      ${db.unsafe(POST_VOTE_COUNTS_SUBQUERY)},
      (SELECT direction FROM votes WHERE post_id = p.id AND user_id = ${requesterId ?? null}) AS my_vote,
      EXISTS(SELECT 1 FROM saves WHERE post_id = p.id AND user_id = ${requesterId ?? null}) AS is_saved
    FROM posts p
    JOIN users u ON u.id = p.author_id
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

export async function listPostsByThread(
  db: DB,
  threadId: string,
  requesterId?: string | undefined,
): Promise<Post[]> {
  const rows = await db<PostRow[]>`
    SELECT
      p.id, p.thread_id, p.author_id, u.display_name AS author_display_name, u.avatar_url AS author_avatar_url,
      p.parent_post_id, p.body,
      p.status, p.toxicity_score, p.is_accepted_answer,
      p.created_at, p.updated_at,
      ${db.unsafe(REACTION_COUNTS_SUBQUERY)},
      ${db.unsafe(POST_VOTE_COUNTS_SUBQUERY)},
      (SELECT direction FROM votes WHERE post_id = p.id AND user_id = ${requesterId ?? null}) AS my_vote,
      EXISTS(SELECT 1 FROM saves WHERE post_id = p.id AND user_id = ${requesterId ?? null}) AS is_saved
    FROM posts p
    JOIN users u ON u.id = p.author_id
    WHERE p.thread_id = ${threadId}
      AND p.status != 'deleted'
    ORDER BY p.created_at ASC
  `;
  return rows.map(toPost);
}

// Extra context a bare Post doesn't carry, needed for the profile's Comments
// tab (and for hydrating comment-kind ProfileActivityItems generally): which
// thread it's in, and — if it's a reply to another reply rather than a
// top-level reply to the thread — a minimal quoted snippet of what it's
// replying to, so a comment like "Yeah, I agree!" isn't shown with zero context.
export type PostWithThreadContext = Post & {
  threadId: string;
  threadTitle: string;
  replyingTo: { author: string; snippet: string } | null;
};

type PostContextRow = PostRow & {
  thread_title: string;
  parent_author_display_name: string | null;
  parent_body_snippet: string | null;
};

function toPostWithThreadContext(row: PostContextRow): PostWithThreadContext {
  return {
    ...toPost(row),
    threadId: row.thread_id,
    threadTitle: row.thread_title,
    replyingTo: row.parent_author_display_name && row.parent_body_snippet
      ? { author: row.parent_author_display_name, snippet: row.parent_body_snippet }
      : null,
  };
}

const POST_CONTEXT_SELECT = `
  p.id, p.thread_id, p.author_id, u.display_name AS author_display_name, u.avatar_url AS author_avatar_url,
  p.parent_post_id, p.body,
  p.status, p.toxicity_score, p.is_accepted_answer,
  p.created_at, p.updated_at,
  t.title AS thread_title,
  pu.display_name AS parent_author_display_name,
  LEFT(parent.body, 140) AS parent_body_snippet,
  ${REACTION_COUNTS_SUBQUERY},
  ${POST_VOTE_COUNTS_SUBQUERY}
`;

const POST_CONTEXT_JOINS = `
  FROM posts p
  JOIN users u ON u.id = p.author_id
  JOIN threads t ON t.id = p.thread_id
  LEFT JOIN posts parent ON parent.id = p.parent_post_id
  LEFT JOIN users pu ON pu.id = parent.author_id
`;

// Backs the profile's Comments tab — replies authored by a specific user,
// newest first.
export async function listPostsByAuthor(
  db: DB,
  forumId: string,
  authorId: string,
  page: number,
  limit: number,
  requesterId?: string | undefined,
): Promise<{ posts: PostWithThreadContext[]; total: number }> {
  const offset = (page - 1) * limit;

  const [rows, countRows] = await Promise.all([
    db<PostContextRow[]>`
      SELECT
        ${db.unsafe(POST_CONTEXT_SELECT)},
        (SELECT direction FROM votes WHERE post_id = p.id AND user_id = ${requesterId ?? null}) AS my_vote,
        EXISTS(SELECT 1 FROM saves WHERE post_id = p.id AND user_id = ${requesterId ?? null}) AS is_saved
      ${db.unsafe(POST_CONTEXT_JOINS)}
      WHERE t.forum_id = ${forumId}
        AND p.author_id = ${authorId}
        AND p.status != 'deleted'
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    db<[{ total: string }]>`
      SELECT COUNT(*) AS total
      FROM posts p
      JOIN threads t ON t.id = p.thread_id
      WHERE t.forum_id = ${forumId} AND p.author_id = ${authorId} AND p.status != 'deleted'
    `,
  ]);

  return { posts: rows.map(toPostWithThreadContext), total: Number(countRows[0]?.total ?? 0) };
}

// Batch fetch by id, same shape as listPostsByAuthor — used to hydrate
// Upvoted/Downvoted/Saved results, which start from a list of ids (from
// votes/saves) rather than an author-scoped query.
export async function getPostsByIds(
  db: DB,
  ids: string[],
  requesterId?: string | undefined,
): Promise<PostWithThreadContext[]> {
  if (ids.length === 0) return [];

  const rows = await db<PostContextRow[]>`
    SELECT
      ${db.unsafe(POST_CONTEXT_SELECT)},
      (SELECT direction FROM votes WHERE post_id = p.id AND user_id = ${requesterId ?? null}) AS my_vote,
      EXISTS(SELECT 1 FROM saves WHERE post_id = p.id AND user_id = ${requesterId ?? null}) AS is_saved
    ${db.unsafe(POST_CONTEXT_JOINS)}
    WHERE p.id = ANY(${ids}::uuid[])
      AND p.status != 'deleted'
  `;

  return rows.map(toPostWithThreadContext);
}

// Comment karma: sum(upvotes) - sum(downvotes) across every reply the user
// authored — same convention as getThreadKarma, the other half of the pair.
export async function getPostKarma(db: DB, forumId: string, authorId: string): Promise<number> {
  const rows = await db<{ karma: string }[]>`
    SELECT
      COALESCE(SUM(CASE WHEN v.direction = 1 THEN 1 WHEN v.direction = -1 THEN -1 ELSE 0 END), 0) AS karma
    FROM posts p
    JOIN threads t ON t.id = p.thread_id
    LEFT JOIN votes v ON v.post_id = p.id
    WHERE t.forum_id = ${forumId} AND p.author_id = ${authorId} AND p.status != 'deleted'
  `;
  return Number(rows[0]?.karma ?? 0);
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
