import type { DB } from '../db';
import type { ForumConfig, Comment, ReactionType, Thread, VoteCounts, VoteDirection } from '@forumkit/types';
import { COMMENT_VOTE_COUNTS_SUBQUERY } from './vote';

type CommentRow = {
  id: string;
  thread_id: string;
  author_id: string;
  author_display_name: string;
  author_avatar_url: string | null;
  parent_comment_id: string | null;
  body: string;
  status: Comment['status'];
  toxicity_score: number | null;
  is_accepted_answer: boolean;
  reaction_counts: Partial<Record<ReactionType, number>> | null;
  vote_counts: VoteCounts;
  my_vote: VoteDirection | null;
  is_saved: boolean;
  created_at: Date;
  updated_at: Date;
};

type CreateCommentInput = {
  threadId: string;
  authorId: string;
  parentCommentId?: string | undefined;
  body: string;
};

// Correlated subquery for reaction counts — avoids GROUP BY fan-out on outer joins
const REACTION_COUNTS_SUBQUERY = `
  COALESCE(
    (SELECT JSON_OBJECT_AGG(r.type, r.cnt)
     FROM (
       SELECT type, COUNT(*) AS cnt
       FROM reactions
       WHERE comment_id = p.id
       GROUP BY type
     ) r),
    '{}'
  )::json AS reaction_counts
`;

function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    threadId: row.thread_id,
    authorId: row.author_id,
    authorDisplayName: row.author_display_name,
    authorAvatarUrl: row.author_avatar_url,
    parentCommentId: row.parent_comment_id,
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

export async function getCommentById(
  db: DB,
  commentId: string,
  requesterId?: string | undefined,
): Promise<Comment | null> {
  const rows = await db<CommentRow[]>`
    SELECT
      p.id, p.thread_id, p.author_id, u.display_name AS author_display_name, u.avatar_url AS author_avatar_url,
      p.parent_comment_id, p.body,
      p.status, p.toxicity_score, p.is_accepted_answer,
      p.created_at, p.updated_at,
      ${db.unsafe(REACTION_COUNTS_SUBQUERY)},
      ${db.unsafe(COMMENT_VOTE_COUNTS_SUBQUERY)},
      (SELECT direction FROM votes WHERE comment_id = p.id AND user_id = ${requesterId ?? null}) AS my_vote,
      EXISTS(SELECT 1 FROM saves WHERE comment_id = p.id AND user_id = ${requesterId ?? null}) AS is_saved
    FROM comments p
    JOIN users u ON u.id = p.author_id
    WHERE p.id = ${commentId}
      AND p.status != 'deleted'
  `;
  const row = rows[0];
  return row ? toComment(row) : null;
}

export async function createComment(db: DB, input: CreateCommentInput): Promise<Comment> {
  const [row] = await db<[{ id: string }]>`
    INSERT INTO comments (thread_id, author_id, parent_comment_id, body)
    VALUES (
      ${input.threadId},
      ${input.authorId},
      ${input.parentCommentId ?? null},
      ${input.body}
    )
    RETURNING id
  `;
  if (!row) throw new Error('Comment insert returned no row');
  const comment = await getCommentById(db, row.id);
  if (!comment) throw new Error('Comment not found after create');
  return comment;
}

export async function updateComment(db: DB, commentId: string, body: string): Promise<Comment | null> {
  await db`UPDATE comments SET body = ${body} WHERE id = ${commentId}`;
  return getCommentById(db, commentId);
}

export async function softDeleteComment(db: DB, commentId: string): Promise<void> {
  await db`UPDATE comments SET status = 'deleted' WHERE id = ${commentId}`;
}

export async function upsertReaction(
  db: DB,
  commentId: string,
  userId: string,
  type: ReactionType,
): Promise<void> {
  await db`
    INSERT INTO reactions (comment_id, user_id, type)
    VALUES (${commentId}, ${userId}, ${type})
    ON CONFLICT (comment_id, user_id, type) DO NOTHING
  `;
}

export async function deleteReaction(
  db: DB,
  commentId: string,
  userId: string,
  type: ReactionType,
): Promise<void> {
  await db`
    DELETE FROM reactions
    WHERE comment_id = ${commentId} AND user_id = ${userId} AND type = ${type}
  `;
}

export async function getReactionCounts(
  db: DB,
  commentId: string,
): Promise<Partial<Record<ReactionType, number>>> {
  const [row] = await db<[{ counts: Partial<Record<ReactionType, number>> | null }]>`
    SELECT COALESCE(
      (SELECT JSON_OBJECT_AGG(type, cnt)
       FROM (
         SELECT type, COUNT(*) AS cnt
         FROM reactions
         WHERE comment_id = ${commentId}
         GROUP BY type
       ) sub),
      '{}'
    )::json AS counts
  `;
  return row?.counts ?? {};
}

export async function insertReport(
  db: DB,
  commentId: string,
  reporterId: string,
  reason: string,
): Promise<void> {
  await db`
    INSERT INTO moderation_queue (comment_id, reporter_id, reason)
    VALUES (${commentId}, ${reporterId}, ${reason})
  `;
}

export async function setAcceptedAnswer(
  db: DB,
  commentId: string,
  threadId: string,
): Promise<Comment> {
  const comment = await db.begin(async (sql) => {
    await sql`
      UPDATE comments SET is_accepted_answer = FALSE
      WHERE thread_id = ${threadId} AND is_accepted_answer = TRUE
    `;
    await sql`
      UPDATE comments SET is_accepted_answer = TRUE
      WHERE id = ${commentId}
    `;
    return getCommentById(sql as unknown as DB, commentId);
  });
  if (!comment) throw new Error('Comment not found after setAcceptedAnswer');
  return comment;
}

export async function updateCommentEmbedding(
  db: DB,
  commentId: string,
  embedding: number[],
): Promise<void> {
  await db`
    UPDATE comments
    SET embedding = ${'[' + embedding.join(',') + ']'}::vector
    WHERE id = ${commentId}
  `;
}

export async function updateCommentToxicity(
  db: DB,
  commentId: string,
  score: number,
  hide: boolean,
): Promise<void> {
  if (hide) {
    await db`
      UPDATE comments SET toxicity_score = ${score}, status = 'hidden'
      WHERE id = ${commentId}
    `;
  } else {
    await db`UPDATE comments SET toxicity_score = ${score} WHERE id = ${commentId}`;
  }
}

export async function insertModerationQueueItem(
  db: DB,
  commentId: string,
  aiScore: number,
  aiFlags: string[],
): Promise<void> {
  await db`
    INSERT INTO moderation_queue (comment_id, ai_score, ai_flags)
    VALUES (${commentId}, ${aiScore}, ${aiFlags})
  `;
}

export async function listCommentsByThread(
  db: DB,
  threadId: string,
  requesterId?: string | undefined,
): Promise<Comment[]> {
  const rows = await db<CommentRow[]>`
    SELECT
      p.id, p.thread_id, p.author_id, u.display_name AS author_display_name, u.avatar_url AS author_avatar_url,
      p.parent_comment_id, p.body,
      p.status, p.toxicity_score, p.is_accepted_answer,
      p.created_at, p.updated_at,
      ${db.unsafe(REACTION_COUNTS_SUBQUERY)},
      ${db.unsafe(COMMENT_VOTE_COUNTS_SUBQUERY)},
      (SELECT direction FROM votes WHERE comment_id = p.id AND user_id = ${requesterId ?? null}) AS my_vote,
      EXISTS(SELECT 1 FROM saves WHERE comment_id = p.id AND user_id = ${requesterId ?? null}) AS is_saved
    FROM comments p
    JOIN users u ON u.id = p.author_id
    WHERE p.thread_id = ${threadId}
      AND p.status != 'deleted'
    ORDER BY p.created_at ASC
  `;
  return rows.map(toComment);
}

// Extra context a bare Comment doesn't carry, needed for the profile's Comments
// tab (and for hydrating comment-kind ProfileActivityItems generally): which
// thread it's in, and — if it's a reply to another reply rather than a
// top-level reply to the thread — a minimal quoted snippet of what it's
// replying to, so a comment like "Yeah, I agree!" isn't shown with zero context.
export type CommentWithThreadContext = Comment & {
  threadId: string;
  threadTitle: string;
  replyingTo: { author: string; snippet: string } | null;
};

type CommentContextRow = CommentRow & {
  thread_title: string;
  parent_author_display_name: string | null;
  parent_body_snippet: string | null;
};

function toCommentWithThreadContext(row: CommentContextRow): CommentWithThreadContext {
  return {
    ...toComment(row),
    threadId: row.thread_id,
    threadTitle: row.thread_title,
    replyingTo: row.parent_author_display_name && row.parent_body_snippet
      ? { author: row.parent_author_display_name, snippet: row.parent_body_snippet }
      : null,
  };
}

const COMMENT_CONTEXT_SELECT = `
  p.id, p.thread_id, p.author_id, u.display_name AS author_display_name, u.avatar_url AS author_avatar_url,
  p.parent_comment_id, p.body,
  p.status, p.toxicity_score, p.is_accepted_answer,
  p.created_at, p.updated_at,
  t.title AS thread_title,
  pu.display_name AS parent_author_display_name,
  LEFT(parent.body, 140) AS parent_body_snippet,
  ${REACTION_COUNTS_SUBQUERY},
  ${COMMENT_VOTE_COUNTS_SUBQUERY}
`;

const COMMENT_CONTEXT_JOINS = `
  FROM comments p
  JOIN users u ON u.id = p.author_id
  JOIN threads t ON t.id = p.thread_id
  LEFT JOIN comments parent ON parent.id = p.parent_comment_id
  LEFT JOIN users pu ON pu.id = parent.author_id
`;

// Backs the profile's Comments tab — replies authored by a specific user,
// newest first.
export async function listCommentsByAuthor(
  db: DB,
  forumId: string,
  authorId: string,
  page: number,
  limit: number,
  requesterId?: string | undefined,
): Promise<{ comments: CommentWithThreadContext[]; total: number }> {
  const offset = (page - 1) * limit;

  const [rows, countRows] = await Promise.all([
    db<CommentContextRow[]>`
      SELECT
        ${db.unsafe(COMMENT_CONTEXT_SELECT)},
        (SELECT direction FROM votes WHERE comment_id = p.id AND user_id = ${requesterId ?? null}) AS my_vote,
        EXISTS(SELECT 1 FROM saves WHERE comment_id = p.id AND user_id = ${requesterId ?? null}) AS is_saved
      ${db.unsafe(COMMENT_CONTEXT_JOINS)}
      WHERE t.forum_id = ${forumId}
        AND p.author_id = ${authorId}
        AND p.status != 'deleted'
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    db<[{ total: string }]>`
      SELECT COUNT(*) AS total
      FROM comments p
      JOIN threads t ON t.id = p.thread_id
      WHERE t.forum_id = ${forumId} AND p.author_id = ${authorId} AND p.status != 'deleted'
    `,
  ]);

  return { comments: rows.map(toCommentWithThreadContext), total: Number(countRows[0]?.total ?? 0) };
}

// Batch fetch by id, same shape as listCommentsByAuthor — used to hydrate
// Upvoted/Downvoted/Saved results, which start from a list of ids (from
// votes/saves) rather than an author-scoped query.
export async function getCommentsByIds(
  db: DB,
  ids: string[],
  requesterId?: string | undefined,
): Promise<CommentWithThreadContext[]> {
  if (ids.length === 0) return [];

  const rows = await db<CommentContextRow[]>`
    SELECT
      ${db.unsafe(COMMENT_CONTEXT_SELECT)},
      (SELECT direction FROM votes WHERE comment_id = p.id AND user_id = ${requesterId ?? null}) AS my_vote,
      EXISTS(SELECT 1 FROM saves WHERE comment_id = p.id AND user_id = ${requesterId ?? null}) AS is_saved
    ${db.unsafe(COMMENT_CONTEXT_JOINS)}
    WHERE p.id = ANY(${ids}::uuid[])
      AND p.status != 'deleted'
  `;

  return rows.map(toCommentWithThreadContext);
}

// Comment karma: sum(upvotes) - sum(downvotes) across every reply the user
// authored — same convention as getThreadKarma, the other half of the pair.
export async function getCommentKarma(db: DB, forumId: string, authorId: string): Promise<number> {
  const rows = await db<{ karma: string }[]>`
    SELECT
      COALESCE(SUM(CASE WHEN v.direction = 1 THEN 1 WHEN v.direction = -1 THEN -1 ELSE 0 END), 0) AS karma
    FROM comments p
    JOIN threads t ON t.id = p.thread_id
    LEFT JOIN votes v ON v.comment_id = p.id
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
): Promise<{ status: Thread['status']; authorId: string; forumId: string } | null> {
  const rows = await db<[{ status: Thread['status']; author_id: string; forum_id: string }]>`
    SELECT status, author_id, forum_id FROM threads WHERE id = ${threadId}
  `;
  const row = rows[0];
  return row ? { status: row.status, authorId: row.author_id, forumId: row.forum_id } : null;
}
