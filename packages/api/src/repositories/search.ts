import type { DB } from '../db';
import type { SimilarThread, RelatedThreadForRail, SearchResult, CommentSearchResult } from '@forumkit/types';
import { THREAD_VOTE_COUNTS_SUBQUERY } from './vote';
import { resolveMediaUrl } from '../lib/attachment-url';

type SearchRow = {
  thread_id: string;
  title: string;
  body_snippet: string;
  rank: number;
  created_at: Date;
  total_count: string;
  vote_counts: SearchResult['voteCounts'];
  comment_count: string;
  author_id: string;
  author_display_name: string;
  author_avatar_url: string | null;
};

type SearchOpts = { page: number; limit: number };

// imageUrl always starts null here — these queries don't join attachments
// (a thread can have several; picking "the first image" is a decision the
// service layer makes once, on just the current page of results, via the
// same listAttachmentsByThreadIds + first-image-per-thread pattern already
// used by services/thread.ts's surfaceRelated). Repositories/search.ts's
// job is ranking and matching, not attachment resolution.
function toSearchResult(row: SearchRow, publicApiUrl: string): SearchResult {
  return {
    threadId: row.thread_id,
    title: row.title,
    bodySnippet: row.body_snippet,
    imageUrl: null,
    mediaCount: 0,
    voteCounts: row.vote_counts,
    commentCount: Number(row.comment_count),
    authorId: row.author_id,
    authorDisplayName: row.author_display_name,
    authorAvatarUrl: resolveMediaUrl(publicApiUrl, row.author_avatar_url),
    rank: Number(row.rank),
    createdAt: row.created_at,
  };
}

type CommentSearchRow = {
  comment_id: string;
  thread_id: string;
  thread_title: string;
  body_snippet: string;
  rank: number;
  created_at: Date;
  total_count: string;
  author_id: string;
  author_display_name: string;
  author_avatar_url: string | null;
  comment_vote_counts: CommentSearchResult['commentVoteCounts'];
  thread_author_id: string;
  thread_author_display_name: string;
  thread_author_avatar_url: string | null;
  // Named to match THREAD_VOTE_COUNTS_SUBQUERY's own hardcoded `AS
  // vote_counts` (see vote.ts) — it isn't parameterized, so the column it
  // produces is always literally called this regardless of which query
  // embeds it.
  vote_counts: CommentSearchResult['threadVoteCounts'];
  thread_comment_count: string;
};

function toCommentSearchResult(row: CommentSearchRow, publicApiUrl: string): CommentSearchResult {
  return {
    commentId: row.comment_id,
    threadId: row.thread_id,
    threadTitle: row.thread_title,
    bodySnippet: row.body_snippet,
    imageUrl: null,
    mediaCount: 0,
    authorId: row.author_id,
    authorDisplayName: row.author_display_name,
    authorAvatarUrl: resolveMediaUrl(publicApiUrl, row.author_avatar_url),
    commentVoteCounts: row.comment_vote_counts,
    threadAuthorId: row.thread_author_id,
    threadAuthorDisplayName: row.thread_author_display_name,
    threadAuthorAvatarUrl: resolveMediaUrl(publicApiUrl, row.thread_author_avatar_url),
    threadVoteCounts: row.vote_counts,
    threadCommentCount: Number(row.thread_comment_count),
    rank: Number(row.rank),
    createdAt: row.created_at,
  };
}

// Correlated subquery for a comment's own vote tally — same JSON_BUILD_OBJECT
// shape as vote.ts's THREAD_VOTE_COUNTS_SUBQUERY/COMMENT_VOTE_COUNTS_SUBQUERY,
// but written out here instead of reusing COMMENT_VOTE_COUNTS_SUBQUERY since
// that constant hardcodes the comments-table alias as `p` (comment.ts's
// convention) while these queries alias it `c`.
const COMMENT_SEARCH_VOTE_COUNTS_SUBQUERY = `
  (SELECT JSON_BUILD_OBJECT(
     'up',   COUNT(*) FILTER (WHERE direction = 1),
     'down', COUNT(*) FILTER (WHERE direction = -1)
   )
   FROM votes WHERE comment_id = c.id)::json AS comment_vote_counts
`;

// FUZZY_SIMILARITY_THRESHOLD is pg_trgm's similarity() score, from 0 to 1,
// measuring how many 3-letter chunks ("trigrams") two strings have in
// common. 0.25 is a permissive-but-not-noisy cutoff: loose enough to catch
// a typical typo (one or two letters off), tight enough to not match
// unrelated short words. Shared by every fuzzy query below (threads,
// comments, users) so all three search types behave consistently.
const FUZZY_SIMILARITY_THRESHOLD = 0.25;

export async function keywordSearch(
  db: DB,
  publicApiUrl: string,
  forumId: string,
  query: string,
  opts: SearchOpts,
): Promise<{ results: SearchResult[]; total: number }> {
  const offset = (opts.page - 1) * opts.limit;

  // rank picks the higher of two scores per row: ts_rank (Postgres's
  // built-in full-text search relevance score — it word-stems the text via
  // to_tsvector and matches the query via plainto_tsquery, but requires
  // correct spelling), or similarity() against just the title (pg_trgm's
  // trigram-overlap score — tolerates typos, since it doesn't care about
  // whole-word spelling, just character-sequence overlap). Using GREATEST
  // means a row that matches well on either method ranks highly.
  // The WHERE clause ORs the two match conditions: a row is returned if it
  // satisfies the full-text search OR is a close-enough fuzzy title match,
  // even when the other condition alone would have excluded it.
  const rows = await db<SearchRow[]>`
    SELECT
      t.id                                                       AS thread_id,
      t.title,
      LEFT(t.body, 200)                                          AS body_snippet,
      GREATEST(
        ts_rank(
          to_tsvector('english', t.title || ' ' || t.body),
          plainto_tsquery('english', ${query})
        ),
        similarity(t.title, ${query})
      )                                                          AS rank,
      t.created_at,
      t.author_id,
      u.display_name                                             AS author_display_name,
      u.avatar_url                                               AS author_avatar_url,
      ${db.unsafe(THREAD_VOTE_COUNTS_SUBQUERY)},
      (SELECT COUNT(*) FROM comments WHERE thread_id = t.id AND status = 'visible')::int AS comment_count,
      COUNT(*) OVER()                                            AS total_count
    FROM threads t
    JOIN users u ON u.id = t.author_id
    WHERE t.forum_id = ${forumId}
      AND t.status != 'deleted'
      AND (
        to_tsvector('english', t.title || ' ' || t.body)
            @@ plainto_tsquery('english', ${query})
        OR similarity(t.title, ${query}) > ${FUZZY_SIMILARITY_THRESHOLD}
      )
    ORDER BY rank DESC, t.created_at DESC
    LIMIT ${opts.limit} OFFSET ${offset}
  `;

  return {
    results: rows.map(r => toSearchResult(r, publicApiUrl)),
    total: Number(rows[0]?.total_count ?? 0),
  };
}

export async function findRelatedThreads(
  db: DB,
  forumId: string,
  embedding: number[],
  excludeThreadId: string,
  limit: number,
): Promise<SimilarThread[]> {
  const vec = '[' + embedding.join(',') + ']';

  type Row = { id: string; title: string; similarity: number };

  const rows = await db<Row[]>`
    SELECT
      t.id,
      t.title,
      (1 - (t.embedding <=> ${vec}::vector))::float AS similarity
    FROM threads t
    WHERE t.forum_id = ${forumId}
      AND t.status != 'deleted'
      AND t.embedding IS NOT NULL
      AND t.id != ${excludeThreadId}
    ORDER BY t.embedding <=> ${vec}::vector
    LIMIT ${limit}
  `;

  return rows.map(r => ({ id: r.id, title: r.title, similarity: Number(r.similarity) }));
}

// Same cosine-similarity query as findRelatedThreads, but enriched with the
// vote-counts/comment-count fields needed to build a full right-rail RailItem
// (votes/comment-count/time) rather than just a bare title.
export async function findRelatedThreadsForRail(
  db: DB,
  publicApiUrl: string,
  forumId: string,
  embedding: number[],
  excludeThreadId: string,
  limit: number,
): Promise<RelatedThreadForRail[]> {
  const vec = '[' + embedding.join(',') + ']';

  type Row = {
    id: string;
    title: string;
    created_at: Date;
    comment_count: string;
    vote_counts: RelatedThreadForRail['voteCounts'];
    similarity: number;
    author_id: string;
    author_display_name: string;
    author_avatar_url: string | null;
  };

  const rows = await db<Row[]>`
    SELECT
      t.id,
      t.title,
      t.created_at,
      t.author_id,
      u.display_name AS author_display_name,
      u.avatar_url AS author_avatar_url,
      COALESCE(cc.comment_count, 0) AS comment_count,
      ${db.unsafe(THREAD_VOTE_COUNTS_SUBQUERY)},
      (1 - (t.embedding <=> ${vec}::vector))::float AS similarity
    FROM threads t
    JOIN users u ON u.id = t.author_id
    LEFT JOIN (
      SELECT thread_id, COUNT(*) AS comment_count
      FROM comments
      WHERE status = 'visible'
      GROUP BY thread_id
    ) cc ON cc.thread_id = t.id
    WHERE t.forum_id = ${forumId}
      AND t.status != 'deleted'
      AND t.embedding IS NOT NULL
      AND t.id != ${excludeThreadId}
    ORDER BY t.embedding <=> ${vec}::vector
    LIMIT ${limit}
  `;

  return rows.map(r => ({
    id: r.id,
    title: r.title,
    createdAt: r.created_at,
    commentCount: Number(r.comment_count),
    voteCounts: r.vote_counts,
    similarity: Number(r.similarity),
    imageUrl: null, // resolved by the service layer, which has the storage adapter
    authorId: r.author_id,
    authorDisplayName: r.author_display_name,
    authorAvatarUrl: resolveMediaUrl(publicApiUrl, r.author_avatar_url),
  }));
}

export async function semanticSearch(
  db: DB,
  publicApiUrl: string,
  forumId: string,
  embedding: number[],
  opts: SearchOpts,
): Promise<{ results: SearchResult[]; total: number }> {
  const offset = (opts.page - 1) * opts.limit;
  const vec = '[' + embedding.join(',') + ']';

  const rows = await db<SearchRow[]>`
    SELECT
      t.id                                                              AS thread_id,
      t.title,
      LEFT(t.body, 200)                                                 AS body_snippet,
      (1 - (t.embedding <=> ${vec}::vector))::float          AS rank,
      t.created_at,
      t.author_id,
      u.display_name                                                    AS author_display_name,
      u.avatar_url                                                      AS author_avatar_url,
      ${db.unsafe(THREAD_VOTE_COUNTS_SUBQUERY)},
      (SELECT COUNT(*) FROM comments WHERE thread_id = t.id AND status = 'visible')::int AS comment_count,
      COUNT(*) OVER()                                                   AS total_count
    FROM threads t
    JOIN users u ON u.id = t.author_id
    WHERE t.forum_id = ${forumId}
      AND t.status != 'deleted'
      AND t.embedding IS NOT NULL
    ORDER BY t.embedding <=> ${vec}::vector
    LIMIT ${opts.limit} OFFSET ${offset}
  `;

  return {
    results: rows.map(r => toSearchResult(r, publicApiUrl)),
    total: Number(rows[0]?.total_count ?? 0),
  };
}

// Searches comments by keyword (word-stemmed full-text search) plus fuzzy
// title-style trigram matching on the comment body, same combined strategy
// as keywordSearch above. threadId is optional: pass it to scope the search
// to one thread (the in-thread "Search Comments" pill), omit it to search
// every comment in the forum (the top-nav search results page's Comments
// section). Joins back to threads so the caller always knows which post
// each matching comment belongs to.
export async function keywordSearchComments(
  db: DB,
  publicApiUrl: string,
  forumId: string,
  query: string,
  opts: SearchOpts,
  threadId?: string,
): Promise<{ results: CommentSearchResult[]; total: number }> {
  const offset = (opts.page - 1) * opts.limit;
  // Conditional SQL fragment: only adds the "AND c.thread_id = ..." clause
  // when threadId is actually passed in, following the same optional-filter
  // pattern already used in repositories/thread.ts's listThreads.
  const threadFilter = threadId ? db`AND c.thread_id = ${threadId}` : db``;

  const rows = await db<CommentSearchRow[]>`
    SELECT
      c.id                                                       AS comment_id,
      c.thread_id                                                AS thread_id,
      t.title                                                    AS thread_title,
      LEFT(c.body, 200)                                          AS body_snippet,
      GREATEST(
        ts_rank(to_tsvector('english', c.body), plainto_tsquery('english', ${query})),
        similarity(c.body, ${query})
      )                                                          AS rank,
      c.created_at,
      c.author_id,
      u.display_name                                             AS author_display_name,
      u.avatar_url                                                AS author_avatar_url,
      ${db.unsafe(COMMENT_SEARCH_VOTE_COUNTS_SUBQUERY)},
      t.author_id                                                AS thread_author_id,
      tu.display_name                                            AS thread_author_display_name,
      tu.avatar_url                                               AS thread_author_avatar_url,
      ${db.unsafe(THREAD_VOTE_COUNTS_SUBQUERY)},
      (SELECT COUNT(*) FROM comments WHERE thread_id = t.id AND status = 'visible')::int AS thread_comment_count,
      COUNT(*) OVER()                                            AS total_count
    FROM comments c
    JOIN threads t ON t.id = c.thread_id
    JOIN users u ON u.id = c.author_id
    JOIN users tu ON tu.id = t.author_id
    WHERE t.forum_id = ${forumId}
      AND c.status = 'visible'
      ${threadFilter}
      AND (
        to_tsvector('english', c.body) @@ plainto_tsquery('english', ${query})
        OR similarity(c.body, ${query}) > ${FUZZY_SIMILARITY_THRESHOLD}
      )
    ORDER BY rank DESC, c.created_at DESC
    LIMIT ${opts.limit} OFFSET ${offset}
  `;

  return {
    results: rows.map(r => toCommentSearchResult(r, publicApiUrl)),
    total: Number(rows[0]?.total_count ?? 0),
  };
}

// Semantic (embedding cosine-similarity) counterpart to keywordSearchComments
// — same optional threadId scoping and thread-title join, but ranks by how
// close the comment's embedding is to the query's embedding instead of text
// matching, same pattern as semanticSearch's relationship to keywordSearch.
export async function semanticSearchComments(
  db: DB,
  publicApiUrl: string,
  forumId: string,
  embedding: number[],
  opts: SearchOpts,
  threadId?: string,
): Promise<{ results: CommentSearchResult[]; total: number }> {
  const offset = (opts.page - 1) * opts.limit;
  const vec = '[' + embedding.join(',') + ']';
  const threadFilter = threadId ? db`AND c.thread_id = ${threadId}` : db``;

  const rows = await db<CommentSearchRow[]>`
    SELECT
      c.id                                                     AS comment_id,
      c.thread_id                                               AS thread_id,
      t.title                                                   AS thread_title,
      LEFT(c.body, 200)                                         AS body_snippet,
      (1 - (c.embedding <=> ${vec}::vector))::float             AS rank,
      c.created_at,
      c.author_id,
      u.display_name                                            AS author_display_name,
      u.avatar_url                                               AS author_avatar_url,
      ${db.unsafe(COMMENT_SEARCH_VOTE_COUNTS_SUBQUERY)},
      t.author_id                                               AS thread_author_id,
      tu.display_name                                           AS thread_author_display_name,
      tu.avatar_url                                              AS thread_author_avatar_url,
      ${db.unsafe(THREAD_VOTE_COUNTS_SUBQUERY)},
      (SELECT COUNT(*) FROM comments WHERE thread_id = t.id AND status = 'visible')::int AS thread_comment_count,
      COUNT(*) OVER()                                           AS total_count
    FROM comments c
    JOIN threads t ON t.id = c.thread_id
    JOIN users u ON u.id = c.author_id
    JOIN users tu ON tu.id = t.author_id
    WHERE t.forum_id = ${forumId}
      AND c.status = 'visible'
      AND c.embedding IS NOT NULL
      ${threadFilter}
    ORDER BY c.embedding <=> ${vec}::vector
    LIMIT ${opts.limit} OFFSET ${offset}
  `;

  return {
    results: rows.map(r => toCommentSearchResult(r, publicApiUrl)),
    total: Number(rows[0]?.total_count ?? 0),
  };
}
