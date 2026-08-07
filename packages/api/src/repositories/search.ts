import type { DB } from '../db';
import type { SimilarThread, RelatedThreadForRail } from '@forumkit/types';
import { THREAD_VOTE_COUNTS_SUBQUERY } from './vote';

export type SearchResult = {
  threadId: string;
  title: string;
  bodySnippet: string;
  rank: number;
  createdAt: Date;
};

type SearchRow = {
  thread_id: string;
  title: string;
  body_snippet: string;
  rank: number;
  created_at: Date;
  total_count: string;
};

type SearchOpts = { page: number; limit: number };

function toSearchResult(row: SearchRow): SearchResult {
  return {
    threadId: row.thread_id,
    title: row.title,
    bodySnippet: row.body_snippet,
    rank: Number(row.rank),
    createdAt: row.created_at,
  };
}

export async function keywordSearch(
  db: DB,
  forumId: string,
  query: string,
  opts: SearchOpts,
): Promise<{ results: SearchResult[]; total: number }> {
  const offset = (opts.page - 1) * opts.limit;

  const rows = await db<SearchRow[]>`
    SELECT
      t.id                                                       AS thread_id,
      t.title,
      LEFT(t.body, 200)                                          AS body_snippet,
      ts_rank(
        to_tsvector('english', t.title || ' ' || t.body),
        plainto_tsquery('english', ${query})
      )                                                          AS rank,
      t.created_at,
      COUNT(*) OVER()                                            AS total_count
    FROM threads t
    WHERE t.forum_id = ${forumId}
      AND t.status != 'deleted'
      AND to_tsvector('english', t.title || ' ' || t.body)
          @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC, t.created_at DESC
    LIMIT ${opts.limit} OFFSET ${offset}
  `;

  return {
    results: rows.map(toSearchResult),
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
    authorAvatarUrl: r.author_avatar_url,
  }));
}

export async function semanticSearch(
  db: DB,
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
      COUNT(*) OVER()                                                   AS total_count
    FROM threads t
    WHERE t.forum_id = ${forumId}
      AND t.status != 'deleted'
      AND t.embedding IS NOT NULL
    ORDER BY t.embedding <=> ${vec}::vector
    LIMIT ${opts.limit} OFFSET ${offset}
  `;

  return {
    results: rows.map(toSearchResult),
    total: Number(rows[0]?.total_count ?? 0),
  };
}
