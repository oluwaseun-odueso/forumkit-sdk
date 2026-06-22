import type { DB } from '../db';
import type { Tag, Thread, ThreadListQuery, SimilarThread } from '@forumkit/types';

export type ThreadWithMetaData = Thread & { postCount: number };

type ThreadRow = {
  id: string;
  forum_id: string;
  author_id: string;
  title: string;
  body: string;
  status: Thread['status'];
  pinned: boolean;
  view_count: number;
  created_at: Date;
  updated_at: Date;
  post_count: string;
  tags: (Tag & { forum_id: string })[] | null;
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
  sort: NonNullable<ThreadListQuery['sort']>;
  page: number;
  limit: number;
};

// Hardcoded ORDER BY clauses keyed by sort enum — no user content ever
// reaches db.unsafe(). SQL parameterised placeholders cannot represent column
// names or expressions, so a static lookup + db.unsafe() is the correct pattern.
const SORT_CLAUSES = {
  latest:         't.pinned DESC, t.created_at DESC',
  oldest:         't.pinned DESC, t.created_at ASC',
  most_posts:     't.pinned DESC, COALESCE(pc.post_count, 0) DESC, t.created_at DESC',
  most_reactions: 't.pinned DESC, COALESCE(rc.reaction_count, 0) DESC, t.created_at DESC',
} satisfies Record<NonNullable<ThreadListQuery['sort']>, string>;

function toThreadWithMetaData(row: ThreadRow): ThreadWithMetaData {
  return {
    id: row.id,
    forumId: row.forum_id,
    authorId: row.author_id,
    title: row.title,
    body: row.body,
    status: row.status,
    pinned: row.pinned,
    viewCount: row.view_count,
    postCount: Number(row.post_count),
    tags: (row.tags ?? []).map((t) => ({
      id: t.id,
      forumId: t.forum_id,
      name: t.name,
      description: t.description,
      color: t.color,
    })),
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

  const [rows, countRows] = await Promise.all([
    db<ThreadRow[]>`
      SELECT
        t.id, t.forum_id, t.author_id, t.title, t.body,
        t.status, t.pinned, t.view_count, t.created_at, t.updated_at,
        COALESCE(pc.post_count, 0) AS post_count,
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
        ) AS tags
      FROM threads t
      LEFT JOIN (
        SELECT thread_id, COUNT(*) AS post_count
        FROM posts
        WHERE status = 'visible'
        GROUP BY thread_id
      ) pc ON pc.thread_id = t.id
      LEFT JOIN (
        SELECT p.thread_id, COUNT(*) AS reaction_count
        FROM reactions r
        JOIN posts p ON p.id = r.post_id
        GROUP BY p.thread_id
      ) rc ON rc.thread_id = t.id
      LEFT JOIN thread_tags tt ON tt.thread_id = t.id
      LEFT JOIN tags tg ON tg.id = tt.tag_id
      WHERE t.forum_id = ${forumId}
        AND t.status != 'deleted'
        ${tagFilter}
      GROUP BY t.id, pc.post_count, rc.reaction_count
      ORDER BY ${db.unsafe(SORT_CLAUSES[opts.sort])}
      LIMIT ${opts.limit} OFFSET ${offset}
    `,
    db<[{ total: string }]>`
      SELECT COUNT(*) AS total
      FROM threads t
      WHERE t.forum_id = ${forumId}
        AND t.status != 'deleted'
        ${tagFilter}
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
): Promise<ThreadWithMetaData | null> {
  const rows = await db<ThreadRow[]>`
    SELECT
      t.id, t.forum_id, t.author_id, t.title, t.body,
      t.status, t.pinned, t.view_count, t.created_at, t.updated_at,
      COALESCE(pc.post_count, 0) AS post_count,
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
      ) AS tags
    FROM threads t
    LEFT JOIN (
      SELECT thread_id, COUNT(*) AS post_count
      FROM posts
      WHERE status = 'visible'
      GROUP BY thread_id
    ) pc ON pc.thread_id = t.id
    LEFT JOIN thread_tags tt ON tt.thread_id = t.id
    LEFT JOIN tags tg ON tg.id = tt.tag_id
    WHERE t.id = ${threadId}
      AND t.status != 'deleted'
    GROUP BY t.id, pc.post_count
  `;

  const row = rows[0];
  return row ? toThreadWithMetaData(row) : null;
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
  const vecStr = '[' + embedding.join(',') + ']';
  const excludeFilter = excludeId ? db`AND id != ${excludeId}` : db``;

  const rows = await db<{ id: string; title: string; similarity: number }[]>`
    SELECT
      id,
      title,
      (1 - (embedding <=> ${vecStr}::vector))::float AS similarity
    FROM threads
    WHERE forum_id = ${forumId}
      AND status != 'deleted'
      AND embedding IS NOT NULL
      ${excludeFilter}
    ORDER BY embedding <=> ${vecStr}::vector
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
