import type { DB } from '../db';
import type { UserProfile } from '@forumkit/types';

type UserProfileRow = {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  social_links: unknown;
  created_at: Date;
  theme_preference: 'light' | 'dark' | null;
};

// Karma isn't selected here — it's a cross-table sum over the user's own
// threads/comments (see thread.ts/comment.ts's getThreadKarma/getCommentKarma),
// composed alongside this in the route handler rather than reached into
// from a users-table-scoped repository function.
//
// social_links is typed `unknown` on the row rather than trusted as
// jsonb-shaped — over Supabase's pooled (transaction-mode PgBouncer)
// connection, postgres.js can't always introspect the column type to
// auto-parse jsonb, so it falls back to handing back the raw JSON text
// instead of a parsed array. Parsing it here handles both cases.
function parseSocialLinks(value: unknown): Array<{ platform: string; url: string }> {
  const parsed = typeof value === 'string' ? JSON.parse(value) as unknown : value;
  return Array.isArray(parsed) ? parsed as Array<{ platform: string; url: string }> : [];
}

function toProfile(row: UserProfileRow): Omit<UserProfile, 'postKarma' | 'commentKarma'> {
  return {
    id: row.id,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    bannerUrl: row.banner_url,
    socialLinks: parseSocialLinks(row.social_links),
    joinedAt: row.created_at,
    themePreference: row.theme_preference,
  };
}

export async function findProfileById(db: DB, userId: string): Promise<Omit<UserProfile, 'postKarma' | 'commentKarma'> | null> {
  const rows = await db<UserProfileRow[]>`
    SELECT id, display_name, bio, avatar_url, banner_url, social_links, created_at, theme_preference
    FROM users WHERE id = ${userId}
  `;
  return rows[0] ? toProfile(rows[0]) : null;
}

export async function updateProfile(
  db: DB,
  userId: string,
  fields: {
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    socialLinks: Array<{ platform: string; url: string }>;
  },
): Promise<Omit<UserProfile, 'postKarma' | 'commentKarma'> | null> {
  const rows = await db<UserProfileRow[]>`
    UPDATE users
    SET
      display_name = ${fields.displayName},
      bio          = ${fields.bio},
      avatar_url   = ${fields.avatarUrl},
      banner_url   = ${fields.bannerUrl},
      social_links = ${JSON.stringify(fields.socialLinks)}::jsonb
    WHERE id = ${userId}
    RETURNING id, display_name, bio, avatar_url, banner_url, social_links, created_at, theme_preference
  `;
  return rows[0] ? toProfile(rows[0]) : null;
}

export async function updateThemePreference(
  db: DB,
  userId: string,
  themePreference: 'light' | 'dark' | null,
): Promise<void> {
  await db`UPDATE users SET theme_preference = ${themePreference} WHERE id = ${userId}`;
}

export type UserSearchResult = { id: string; displayName: string; avatarUrl: string | null };

type UserSearchRow = { id: string; display_name: string; avatar_url: string | null; total_count: string };

// Fuzzy-matches display_name using pg_trgm's similarity() (see
// migrations/013_search_fuzzy.ts for the trigram index this relies on) —
// there's no full-text-search fallback here like the thread/comment search
// functions have, since a display name is one short string, not a document;
// trigram matching alone is enough to tolerate a typo in someone's name.
// Banned users are excluded so they don't show up in the People results.
export async function searchUsers(
  db: DB,
  forumId: string,
  query: string,
  opts: { page: number; limit: number },
): Promise<{ results: UserSearchResult[]; total: number }> {
  const offset = (opts.page - 1) * opts.limit;

  const rows = await db<UserSearchRow[]>`
    SELECT
      id, display_name, avatar_url,
      COUNT(*) OVER() AS total_count
    FROM users
    WHERE forum_id = ${forumId}
      AND banned_at IS NULL
      AND similarity(display_name, ${query}) > 0.2
    ORDER BY similarity(display_name, ${query}) DESC
    LIMIT ${opts.limit} OFFSET ${offset}
  `;

  return {
    results: rows.map(r => ({ id: r.id, displayName: r.display_name, avatarUrl: r.avatar_url })),
    total: Number(rows[0]?.total_count ?? 0),
  };
}
