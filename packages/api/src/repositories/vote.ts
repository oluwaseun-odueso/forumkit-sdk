import type { DB } from '../db';
import type { VoteDirection, VoteCounts } from '@forumkit/types';

export type VoteTarget = { kind: 'post'; id: string } | { kind: 'thread'; id: string };

// Reusable correlated-subquery SQL fragments for embedding into post/thread
// SELECTs via db.unsafe() — mirrors REACTION_COUNTS_SUBQUERY in
// repositories/post.ts. Always returns exactly one row (an aggregate with no
// GROUP BY never yields zero rows), so no COALESCE is needed here, unlike
// the reaction subquery which wraps a grouped aggregate that can be empty.
export const POST_VOTE_COUNTS_SUBQUERY = `
  (SELECT JSON_BUILD_OBJECT(
     'up',   COUNT(*) FILTER (WHERE direction = 1),
     'down', COUNT(*) FILTER (WHERE direction = -1)
   )
   FROM votes WHERE post_id = p.id)::json AS vote_counts
`;

export const THREAD_VOTE_COUNTS_SUBQUERY = `
  (SELECT JSON_BUILD_OBJECT(
     'up',   COUNT(*) FILTER (WHERE direction = 1),
     'down', COUNT(*) FILTER (WHERE direction = -1)
   )
   FROM votes WHERE thread_id = t.id)::json AS vote_counts
`;

export async function getUserVote(db: DB, target: VoteTarget, userId: string): Promise<VoteDirection | null> {
  const rows = target.kind === 'post'
    ? await db<{ direction: VoteDirection }[]>`
        SELECT direction FROM votes WHERE post_id = ${target.id} AND user_id = ${userId}
      `
    : await db<{ direction: VoteDirection }[]>`
        SELECT direction FROM votes WHERE thread_id = ${target.id} AND user_id = ${userId}
      `;
  return rows[0]?.direction ?? null;
}

// Records a user's vote — INSERT if none exists yet, or DO UPDATE to flip an
// existing vote's direction in place (same row, no delete). Toggle-off
// (clearing an unchanged vote) is removeVote, not this — the service layer
// decides which to call based on whether the requested direction matches
// the user's current vote.
export async function upsertVote(
  db: DB,
  target: VoteTarget,
  userId: string,
  direction: VoteDirection,
): Promise<void> {
  if (target.kind === 'post') {
    await db`
      INSERT INTO votes (post_id, user_id, direction)
      VALUES (${target.id}, ${userId}, ${direction})
      ON CONFLICT (user_id, post_id) WHERE post_id IS NOT NULL
      DO UPDATE SET direction = EXCLUDED.direction, updated_at = NOW()
    `;
  } else {
    await db`
      INSERT INTO votes (thread_id, user_id, direction)
      VALUES (${target.id}, ${userId}, ${direction})
      ON CONFLICT (user_id, thread_id) WHERE thread_id IS NOT NULL
      DO UPDATE SET direction = EXCLUDED.direction, updated_at = NOW()
    `;
  }
}

export async function removeVote(db: DB, target: VoteTarget, userId: string): Promise<void> {
  if (target.kind === 'post') {
    await db`DELETE FROM votes WHERE post_id = ${target.id} AND user_id = ${userId}`;
  } else {
    await db`DELETE FROM votes WHERE thread_id = ${target.id} AND user_id = ${userId}`;
  }
}

export async function getVoteCounts(db: DB, target: VoteTarget): Promise<VoteCounts> {
  const rows = target.kind === 'post'
    ? await db<{ up: string; down: string }[]>`
        SELECT
          COUNT(*) FILTER (WHERE direction = 1)  AS up,
          COUNT(*) FILTER (WHERE direction = -1) AS down
        FROM votes WHERE post_id = ${target.id}
      `
    : await db<{ up: string; down: string }[]>`
        SELECT
          COUNT(*) FILTER (WHERE direction = 1)  AS up,
          COUNT(*) FILTER (WHERE direction = -1) AS down
        FROM votes WHERE thread_id = ${target.id}
      `;
  const row = rows[0];
  return { up: Number(row?.up ?? 0), down: Number(row?.down ?? 0) };
}
