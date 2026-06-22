import type { DB } from '../db';

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

export async function semanticSearch(
  db: DB,
  forumId: string,
  embedding: number[],
  opts: SearchOpts,
): Promise<{ results: SearchResult[]; total: number }> {
  const offset = (opts.page - 1) * opts.limit;
  const vecStr = '[' + embedding.join(',') + ']';

  const rows = await db<SearchRow[]>`
    SELECT
      t.id                                                              AS thread_id,
      t.title,
      LEFT(t.body, 200)                                                 AS body_snippet,
      (1 - (t.embedding <=> ${vecStr}::vector))::float                  AS rank,
      t.created_at,
      COUNT(*) OVER()                                                   AS total_count
    FROM threads t
    WHERE t.forum_id = ${forumId}
      AND t.status != 'deleted'
      AND t.embedding IS NOT NULL
    ORDER BY t.embedding <=> ${vecStr}::vector
    LIMIT ${opts.limit} OFFSET ${offset}
  `;

  return {
    results: rows.map(toSearchResult),
    total: Number(rows[0]?.total_count ?? 0),
  };
}
