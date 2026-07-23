import type { DB } from '../db';
import type { UserProfile } from '@forumkit/types';

type UserProfileRow = {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  social_links: Array<{ platform: string; url: string }>;
};

function toProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    bannerUrl: row.banner_url,
    socialLinks: row.social_links,
  };
}

export async function findProfileById(db: DB, userId: string): Promise<UserProfile | null> {
  const rows = await db<UserProfileRow[]>`
    SELECT id, display_name, bio, avatar_url, banner_url, social_links
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
): Promise<UserProfile | null> {
  const rows = await db<UserProfileRow[]>`
    UPDATE users
    SET
      display_name = ${fields.displayName},
      bio          = ${fields.bio},
      avatar_url   = ${fields.avatarUrl},
      banner_url   = ${fields.bannerUrl},
      social_links = ${JSON.stringify(fields.socialLinks)}::jsonb
    WHERE id = ${userId}
    RETURNING id, display_name, bio, avatar_url, banner_url, social_links
  `;
  return rows[0] ? toProfile(rows[0]) : null;
}
