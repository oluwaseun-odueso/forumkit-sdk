import type { DB } from '../db';
import type { UserProfile, UserSearchResult } from '@forumkit/types';

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
    // undefined means "not part of this update, leave the column as-is" —
    // distinct from null, which explicitly clears it. A caller that only
    // sends e.g. { displayName, bio } (mobile's edit-profile sheet, which
    // doesn't touch avatar/banner) must not wipe avatarUrl/bannerUrl just
    // because it didn't mention them.
    bio?: string | null | undefined;
    avatarUrl?: string | null | undefined;
    bannerUrl?: string | null | undefined;
    socialLinks?: Array<{ platform: string; url: string }> | undefined;
  },
): Promise<Omit<UserProfile, 'postKarma' | 'commentKarma'> | null> {
  const rows = await db<UserProfileRow[]>`
    UPDATE users
    SET
      display_name = ${fields.displayName},
      bio          = ${fields.bio         !== undefined ? fields.bio         : db`bio`},
      avatar_url   = ${fields.avatarUrl   !== undefined ? fields.avatarUrl   : db`avatar_url`},
      banner_url   = ${fields.bannerUrl   !== undefined ? fields.bannerUrl   : db`banner_url`},
      social_links = ${fields.socialLinks !== undefined ? JSON.stringify(fields.socialLinks) : db`social_links`}::jsonb
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

type UserSearchRow = { id: string; display_name: string; avatar_url: string | null; total_count: string };

// Fuzzy-matches display_name using pg_trgm's similarity() (see
// migrations/013_search_fuzzy.ts for the trigram index this relies on) —
// there's no full-text-search fallback here like the thread/comment search
// functions have, since a display name is one short string, not a document;
// trigram matching alone is enough to tolerate a typo in someone's name.
// Banned users are excluded so they don't show up in the People results.
// karma is composed by the caller (routes/search.ts), same "not part of
// this query" convention as UserProfile's postKarma/commentKarma noted
// above — so this returns everything but that one field.
export async function searchUsers(
  db: DB,
  forumId: string,
  query: string,
  opts: { page: number; limit: number },
): Promise<{ results: Omit<UserSearchResult, 'karma'>[]; total: number }> {
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

// Recipients for the "a report came in" notification (services/notification.ts's
// notifyReport) — every active admin/moderator in the forum.
export async function listModeratorIds(db: DB, forumId: string): Promise<string[]> {
  const rows = await db<{ id: string }[]>`
    SELECT id FROM users
    WHERE forum_id = ${forumId}
      AND banned_at IS NULL
      AND role IN ('admin', 'moderator')
  `;
  return rows.map(r => r.id);
}
