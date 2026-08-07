import type { DB } from '../db';
import type { Tag, Thread, ThreadListQuery, SimilarThread, VoteCounts, VoteDirection, TopWindow } from '@forumkit/types';
import { THREAD_VOTE_COUNTS_SUBQUERY } from './vote';

export type ThreadWithMetaData = Thread & { commentCount: number };

type ThreadRow = {
  id: string;
  forum_id: string;
  author_id: string;
  author_display_name: string;
  author_avatar_url: string | null;
  title: string;
  body: string;
  status: Thread['status'];
  pinned: boolean;
  view_count: number;
  created_at: Date;
  updated_at: Date;
  comment_count: string;
  tags: (Tag & { forum_id: string })[] | null;
  vote_counts: VoteCounts;
  my_vote: VoteDirection | null;
  is_saved: boolean;
};

type CreateThreadInput = {
  forumId: string;
  authorId: string;
  title: string;
  body: string;
  tagIds: string[];
};

type ListThreadsOptions = {
  tagId?: string | undefined;
  tagName?: string | undefined;
  pinned?: boolean | undefined;
  sort: NonNullable<ThreadListQuery['sort']>;
  topWindow?: TopWindow | undefined;
  page: number;
  limit: number;
  requesterId?: string | undefined;
};

// Hardcoded ORDER BY clauses keyed by sort enum — no user content ever
// reaches db.unsafe(). SQL parameterised placeholders cannot represent column
// names or expressions, so a static lookup + db.unsafe() is the correct pattern.
// Real ranking algorithms (see packages/db/src/migrations/008_ranking_functions.ts):
// best/hot/rising use SQL functions, top/new are plain column sorts.
const SORT_CLAUSES = {
  best:   't.pinned DESC, fk_wilson_lower_bound(COALESCE(vc.up,0), COALESCE(vc.down,0)) DESC, t.created_at DESC',
  hot:    't.pinned DESC, fk_hot_score(COALESCE(vc.up,0), COALESCE(vc.down,0), t.created_at) DESC, t.created_at DESC',
  new:    't.pinned DESC, t.created_at DESC',
  latest: 't.pinned DESC, t.created_at DESC',
  top:    't.pinned DESC, (COALESCE(vc.up,0) - COALESCE(vc.down,0)) DESC, t.created_at DESC',
  rising: 't.pinned DESC, fk_rising_score(COALESCE(vc.up,0), COALESCE(vc.down,0), t.created_at) DESC, t.created_at DESC',
  oldest: 't.pinned DESC, t.created_at ASC',
} satisfies Record<NonNullable<ThreadListQuery['sort']>, string>;

// Reddit's own default window when Top is first selected.
const DEFAULT_TOP_WINDOW: TopWindow = 'day';

const TOP_WINDOW_INTERVALS: Record<Exclude<TopWindow, 'all'>, string> = {
  hour: '1 hour', day: '1 day', week: '7 days', month: '30 days', year: '365 days',
};

function toThreadWithMetaData(row: ThreadRow): ThreadWithMetaData {
  return {
    id: row.id,
    forumId: row.forum_id,
    authorId: row.author_id,
    authorDisplayName: row.author_display_name,
    authorAvatarUrl: row.author_avatar_url,
    title: row.title,
    body: row.body,
    status: row.status,
    pinned: row.pinned,
    viewCount: row.view_count,
    commentCount: Number(row.comment_count),
    tags: (row.tags ?? []).map((t) => ({
      id: t.id,
      forumId: t.forum_id,
      name: t.name,
      description: t.description,
      color: t.color,
    })),
    voteCounts: row.vote_counts,
    myVote: row.my_vote,
    isSaved: row.is_saved,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listThreads(
  db: DB,
  forumId: string,
  opts: ListThreadsOptions,
): Promise<{ threads: ThreadWithMetaData[]; total: number }> {
  const offset = (opts.page - 1) * opts.limit;
  const tagFilter = opts.tagId
    ? db`AND EXISTS (
        SELECT 1 FROM thread_tags
        WHERE thread_id = t.id AND tag_id = ${opts.tagId}
      )`
    : db``;
  const tagNameFilter = opts.tagName
    ? db`AND EXISTS (
        SELECT 1 FROM thread_tags tt2 JOIN tags tg2 ON tg2.id = tt2.tag_id
        WHERE tt2.thread_id = t.id AND LOWER(tg2.name) = LOWER(${opts.tagName})
      )`
    : db``;
  const pinnedFilter = opts.pinned !== undefined ? db`AND t.pinned = ${opts.pinned}` : db``;
  // Rising only ever considers recent threads — old threads are excluded as
  // candidates entirely, not merely down-ranked, matching Reddit's real tab.
  const risingFilter = opts.sort === 'rising'
    ? db`AND t.created_at > NOW() - INTERVAL '48 hours'`
    : db``;
  const topWindow = opts.topWindow ?? DEFAULT_TOP_WINDOW;
  const topWindowFilter = opts.sort === 'top' && topWindow !== 'all'
    ? db.unsafe(`AND t.created_at > NOW() - INTERVAL '${TOP_WINDOW_INTERVALS[topWindow]}'`)
    : db``;

  const [rows, countRows] = await Promise.all([
    db<ThreadRow[]>`
      SELECT
        t.id, t.forum_id, t.author_id, u.display_name AS author_display_name, u.avatar_url AS author_avatar_url,
        t.title, t.body,
        t.status, t.pinned, t.view_count, t.created_at, t.updated_at,
        COALESCE(cc.comment_count, 0) AS comment_count,
        COALESCE(
          JSON_AGG(
            JSONB_BUILD_OBJECT(
              'id',          tg.id,
              'forum_id',    tg.forum_id,
              'name',        tg.name,
              'description', tg.description,
              'color',       tg.color
            )
          ) FILTER (WHERE tg.id IS NOT NULL),
          '[]'::json
        ) AS tags,
        ${db.unsafe(THREAD_VOTE_COUNTS_SUBQUERY)},
        (SELECT direction FROM votes WHERE thread_id = t.id AND user_id = ${opts.requesterId ?? null}) AS my_vote,
        EXISTS(SELECT 1 FROM saves WHERE thread_id = t.id AND user_id = ${opts.requesterId ?? null}) AS is_saved
      FROM threads t
      JOIN users u ON u.id = t.author_id
      LEFT JOIN (
        SELECT thread_id, COUNT(*) AS comment_count
        FROM comments
        WHERE status = 'visible'
        GROUP BY thread_id
      ) cc ON cc.thread_id = t.id
      LEFT JOIN (
        SELECT c.thread_id, COUNT(*) AS reaction_count
        FROM reactions r
        JOIN comments c ON c.id = r.comment_id
        GROUP BY c.thread_id
      ) rc ON rc.thread_id = t.id
      LEFT JOIN (
        SELECT thread_id,
          COUNT(*) FILTER (WHERE direction = 1)  AS up,
          COUNT(*) FILTER (WHERE direction = -1) AS down
        FROM votes
        WHERE thread_id IS NOT NULL
        GROUP BY thread_id
      ) vc ON vc.thread_id = t.id
      LEFT JOIN thread_tags tt ON tt.thread_id = t.id
      LEFT JOIN tags tg ON tg.id = tt.tag_id
      WHERE t.forum_id = ${forumId}
        AND t.status != 'deleted'
        ${tagFilter}
        ${tagNameFilter}
        ${pinnedFilter}
        ${risingFilter}
        ${topWindowFilter}
      GROUP BY t.id, u.display_name, u.avatar_url, cc.comment_count, rc.reaction_count, vc.up, vc.down
      ORDER BY ${db.unsafe(SORT_CLAUSES[opts.sort])}
      LIMIT ${opts.limit} OFFSET ${offset}
    `,
    db<[{ total: string }]>`
      SELECT COUNT(*) AS total
      FROM threads t
      WHERE t.forum_id = ${forumId}
        AND t.status != 'deleted'
        ${tagFilter}
        ${tagNameFilter}
        ${pinnedFilter}
        ${risingFilter}
        ${topWindowFilter}
    `,
  ]);

  return {
    threads: rows.map(toThreadWithMetaData),
    total: Number(countRows[0]?.total ?? 0),
  };
}

export async function getThreadById(
  db: DB,
  threadId: string,
  requesterId?: string | undefined,
): Promise<ThreadWithMetaData | null> {
  const rows = await db<ThreadRow[]>`
    SELECT
      t.id, t.forum_id, t.author_id, u.display_name AS author_display_name, u.avatar_url AS author_avatar_url,
      t.title, t.body,
      t.status, t.pinned, t.view_count, t.created_at, t.updated_at,
      COALESCE(cc.comment_count, 0) AS comment_count,
      COALESCE(
        JSON_AGG(
          JSONB_BUILD_OBJECT(
            'id',          tg.id,
            'forum_id',    tg.forum_id,
            'name',        tg.name,
            'description', tg.description,
            'color',       tg.color
          )
        ) FILTER (WHERE tg.id IS NOT NULL),
        '[]'::json
      ) AS tags,
      ${db.unsafe(THREAD_VOTE_COUNTS_SUBQUERY)},
      (SELECT direction FROM votes WHERE thread_id = t.id AND user_id = ${requesterId ?? null}) AS my_vote,
      EXISTS(SELECT 1 FROM saves WHERE thread_id = t.id AND user_id = ${requesterId ?? null}) AS is_saved
    FROM threads t
    JOIN users u ON u.id = t.author_id
    LEFT JOIN (
      SELECT thread_id, COUNT(*) AS comment_count
      FROM comments
      WHERE status = 'visible'
      GROUP BY thread_id
    ) cc ON cc.thread_id = t.id
    LEFT JOIN thread_tags tt ON tt.thread_id = t.id
    LEFT JOIN tags tg ON tg.id = tt.tag_id
    WHERE t.id = ${threadId}
      AND t.status != 'deleted'
    GROUP BY t.id, u.display_name, u.avatar_url, cc.comment_count
  `;

  const row = rows[0];
  return row ? toThreadWithMetaData(row) : null;
}

// Backs the profile's Posts tab — threads authored by a specific user,
// newest first. Same row shape as listThreads, filtered by author instead
// of forum-wide scope/sort. page/limit flow in from the route's query
// string, same as listThreads.
export async function listThreadsByAuthor(
  db: DB,
  forumId: string,
  authorId: string,
  page: number,
  limit: number,
  requesterId?: string | undefined,
): Promise<{ threads: ThreadWithMetaData[]; total: number }> {
  const offset = (page - 1) * limit;

  const [rows, countRows] = await Promise.all([
    db<ThreadRow[]>`
      SELECT
        t.id, t.forum_id, t.author_id, u.display_name AS author_display_name, u.avatar_url AS author_avatar_url,
        t.title, t.body,
        t.status, t.pinned, t.view_count, t.created_at, t.updated_at,
        COALESCE(cc.comment_count, 0) AS comment_count,
        '[]'::json AS tags,
        ${db.unsafe(THREAD_VOTE_COUNTS_SUBQUERY)},
        (SELECT direction FROM votes WHERE thread_id = t.id AND user_id = ${requesterId ?? null}) AS my_vote,
        EXISTS(SELECT 1 FROM saves WHERE thread_id = t.id AND user_id = ${requesterId ?? null}) AS is_saved
      FROM threads t
      JOIN users u ON u.id = t.author_id
      LEFT JOIN (
        SELECT thread_id, COUNT(*) AS comment_count
        FROM comments
        WHERE status = 'visible'
        GROUP BY thread_id
      ) cc ON cc.thread_id = t.id
      WHERE t.forum_id = ${forumId}
        AND t.author_id = ${authorId}
        AND t.status != 'deleted'
      ORDER BY t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    db<[{ total: string }]>`
      SELECT COUNT(*) AS total FROM threads
      WHERE forum_id = ${forumId} AND author_id = ${authorId} AND status != 'deleted'
    `,
  ]);

  return { threads: rows.map(toThreadWithMetaData), total: Number(countRows[0]?.total ?? 0) };
}

// Batch fetch by id, same row shape as listThreads/getThreadById — used to
// hydrate Upvoted/Downvoted/Saved results, which start from a list of ids
// (from votes/saves) rather than a forum-wide scope query.
export async function getThreadsByIds(
  db: DB,
  ids: string[],
  requesterId?: string | undefined,
): Promise<ThreadWithMetaData[]> {
  if (ids.length === 0) return [];

  const rows = await db<ThreadRow[]>`
    SELECT
      t.id, t.forum_id, t.author_id, u.display_name AS author_display_name, u.avatar_url AS author_avatar_url,
      t.title, t.body,
      t.status, t.pinned, t.view_count, t.created_at, t.updated_at,
      COALESCE(cc.comment_count, 0) AS comment_count,
      COALESCE(
        JSON_AGG(
          JSONB_BUILD_OBJECT(
            'id',          tg.id,
            'forum_id',    tg.forum_id,
            'name',        tg.name,
            'description', tg.description,
            'color',       tg.color
          )
        ) FILTER (WHERE tg.id IS NOT NULL),
        '[]'::json
      ) AS tags,
      ${db.unsafe(THREAD_VOTE_COUNTS_SUBQUERY)},
      (SELECT direction FROM votes WHERE thread_id = t.id AND user_id = ${requesterId ?? null}) AS my_vote,
      EXISTS(SELECT 1 FROM saves WHERE thread_id = t.id AND user_id = ${requesterId ?? null}) AS is_saved
    FROM threads t
    JOIN users u ON u.id = t.author_id
    LEFT JOIN (
      SELECT thread_id, COUNT(*) AS comment_count
      FROM comments
      WHERE status = 'visible'
      GROUP BY thread_id
    ) cc ON cc.thread_id = t.id
    LEFT JOIN thread_tags tt ON tt.thread_id = t.id
    LEFT JOIN tags tg ON tg.id = tt.tag_id
    WHERE t.id = ANY(${ids}::uuid[])
      AND t.status != 'deleted'
    GROUP BY t.id, u.display_name, u.avatar_url, cc.comment_count
  `;

  return rows.map(toThreadWithMetaData);
}

// Post karma: sum(upvotes) - sum(downvotes) across every thread the user
// authored — the same convention Reddit uses for the same number.
export async function getThreadKarma(db: DB, forumId: string, authorId: string): Promise<number> {
  const rows = await db<{ karma: string }[]>`
    SELECT
      COALESCE(SUM(CASE WHEN v.direction = 1 THEN 1 WHEN v.direction = -1 THEN -1 ELSE 0 END), 0) AS karma
    FROM threads t
    LEFT JOIN votes v ON v.thread_id = t.id
    WHERE t.forum_id = ${forumId} AND t.author_id = ${authorId} AND t.status != 'deleted'
  `;
  return Number(rows[0]?.karma ?? 0);
}

export async function createThread(
  db: DB,
  input: CreateThreadInput,
): Promise<ThreadWithMetaData> {
  const thread = await db.begin(async (sql) => {
    const [row] = await sql<[{ id: string }]>`
      INSERT INTO threads (forum_id, author_id, title, body)
      VALUES (${input.forumId}, ${input.authorId}, ${input.title}, ${input.body})
      RETURNING id
    `;

    if (!row) throw new Error('Thread insert returned no row');

    if (input.tagIds.length > 0) {
      await sql`
        INSERT INTO thread_tags (thread_id, tag_id)
        SELECT ${row.id}, UNNEST(${input.tagIds}::uuid[])
      `;
    }

    return getThreadById(sql as unknown as DB, row.id);
  });

  if (!thread) throw new Error('Thread not found after create');
  return thread;
}

type UpdateThreadPatch = {
  title?: string | undefined;
  body?: string | undefined;
  tagIds?: string[] | undefined;
};

export async function updateThread(
  db: DB,
  threadId: string,
  patch: UpdateThreadPatch,
): Promise<ThreadWithMetaData | null> {
  await db.begin(async (sql) => {
    await sql`
      UPDATE threads
      SET
        title = ${patch.title !== undefined ? patch.title : sql`title`},
        body  = ${patch.body  !== undefined ? patch.body  : sql`body`}
      WHERE id = ${threadId}
    `;

    if (patch.tagIds !== undefined) {
      await sql`DELETE FROM thread_tags WHERE thread_id = ${threadId}`;
      if (patch.tagIds.length > 0) {
        await sql`
          INSERT INTO thread_tags (thread_id, tag_id)
          SELECT ${threadId}, UNNEST(${patch.tagIds}::uuid[])
        `;
      }
    }
  });

  return getThreadById(db, threadId);
}

export async function softDeleteThread(db: DB, threadId: string): Promise<void> {
  await db`UPDATE threads SET status = 'deleted' WHERE id = ${threadId}`;
}

export async function setThreadLocked(
  db: DB,
  threadId: string,
  locked: boolean,
): Promise<ThreadWithMetaData | null> {
  await db`
    UPDATE threads
    SET status = ${locked ? 'locked' : 'open'}
    WHERE id = ${threadId}
  `;
  return getThreadById(db, threadId);
}

export async function setThreadPinned(
  db: DB,
  threadId: string,
  pinned: boolean,
): Promise<ThreadWithMetaData | null> {
  await db`UPDATE threads SET pinned = ${pinned} WHERE id = ${threadId}`;
  return getThreadById(db, threadId);
}

export async function findSimilarThreads(
  db: DB,
  forumId: string,
  embedding: number[],
  excludeId?: string | undefined,
): Promise<SimilarThread[]> {
  const vec = '[' + embedding.join(',') + ']';
  const excludeFilter = excludeId ? db`AND id != ${excludeId}` : db``;

  const rows = await db<{ id: string; title: string; similarity: number }[]>`
    SELECT
      id,
      title,
      (1 - (embedding <=> ${vec}::vector))::float AS similarity
    FROM threads
    WHERE forum_id = ${forumId}
      AND status != 'deleted'
      AND embedding IS NOT NULL
      ${excludeFilter}
    ORDER BY embedding <=> ${vec}::vector
    LIMIT 3
  `;

  return rows.map((r) => ({ id: r.id, title: r.title, similarity: r.similarity }));
}

export async function incrementViewCount(db: DB, threadId: string): Promise<void> {
  await db`UPDATE threads SET view_count = view_count + 1 WHERE id = ${threadId}`;
}

export async function updateThreadEmbedding(
  db: DB,
  threadId: string,
  embedding: number[],
): Promise<void> {
  await db`
    UPDATE threads
    SET embedding = ${'[' + embedding.join(',') + ']'}::vector
    WHERE id = ${threadId}
  `;
}
