// Profile tab list + per-tab empty-state copy, shared by web and mobile. Lifted
// from sdk-web's profile-tabs.tsx (TABS) and profile-empty-state.tsx
// (EMPTY_STATE_COPY). Following the web design, the tab set is these six
// (Saved is a private bookmark list, shown only on your own profile).

export const PROFILE_TABS = ['Overview', 'Posts', 'Comments', 'Saved', 'Upvoted', 'Downvoted'] as const;
export type ProfileTab = typeof PROFILE_TABS[number];

export type EmptyStateCopy = { title: string; description: string };

const DEFAULT_EMPTY_STATE_COPY: EmptyStateCopy = {
  title: 'You don’t have any activity yet',
  description: 'Once you post, comment, or vote, it’ll show up here. If you’d rather hide your activity, update your settings.',
};

const EMPTY_STATE_COPY: Record<string, EmptyStateCopy> = {
  Overview: {
    title: 'You don’t have any activity yet',
    description: 'Once you post, comment, or vote, it’ll show up here. If you’d rather hide your activity, update your settings.',
  },
  Posts: {
    title: 'You don’t have any posts yet',
    description: 'Once you post, it’ll show up here. If you’d rather hide your posts, update your settings.',
  },
  Comments: {
    title: 'You don’t have any comments yet',
    description: 'Once you comment on a post, it’ll show up here. If you’d rather hide your comments, update your settings.',
  },
  Saved: {
    title: 'Looks like you haven’t saved anything yet',
    description: 'Save posts and comments to find them here later.',
  },
  Upvoted: {
    title: 'Looks like you haven’t upvoted anything yet',
    description: 'Posts and comments you upvote will show up here.',
  },
  Downvoted: {
    title: 'Looks like you haven’t downvoted anything yet',
    description: 'Posts and comments you downvote will show up here.',
  },
};

export function profileEmptyCopy(tab: string): EmptyStateCopy {
  return EMPTY_STATE_COPY[tab] ?? DEFAULT_EMPTY_STATE_COPY;
}
