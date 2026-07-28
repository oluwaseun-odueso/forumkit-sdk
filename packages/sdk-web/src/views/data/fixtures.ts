export type Community = { id: string; name: string; letter: string; gradient: string };

export type FeedPost = {
  id: string;
  communityId: string;
  authorId?: string;
  author: string;
  time: string;
  title: string;
  snippet: string;
  body: string;
  thumbGradient: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  domain: string | null;
  votes: number;
  voteCounts?: { up: number; down: number };
  myVote?: 1 | -1 | null;
  commentCount: number;
  saved: boolean;
};

export type CommentNodeData = {
  id: string;
  authorId?: string;
  author: string;
  time: string;
  body: string;
  votes: number;
  voteCounts?: { up: number; down: number };
  myVote?: 1 | -1 | null;
  replies: CommentNodeData[];
};

export type RailItem = {
  id: string;
  title: string;
  communityId: string;
  time: string;
  votes: number;
  commentCount: number;
  thumbGradient: string;
};

export type ProfilePost = {
  id: string;
  title: string;
  time: string;
  votes: number;
  commentCount: number;
};

export const COMMUNITIES: Community[] = [
  { id: 'c1', name: 'r/productdesign', letter: 'P', gradient: 'linear-gradient(135deg,#3f7ee2,#7b5cff)' },
  { id: 'c2', name: 'r/webdev', letter: 'W', gradient: 'linear-gradient(135deg,#ff6a3d,#ff5b7f)' },
  { id: 'c3', name: 'r/writing', letter: 'W', gradient: 'linear-gradient(135deg,#5ee6d0,#3f7ee2)' },
  { id: 'c4', name: 'r/opensource', letter: 'O', gradient: 'linear-gradient(135deg,#8b5cf6,#3f7ee2)' },
];

export const LATEST_ITEMS: RailItem[] = [
  { id: 'l1', title: 'A house style for tone — does anyone actually keep one?', communityId: 'c3', time: '6d', votes: 19, commentCount: 7, thumbGradient: 'linear-gradient(135deg,#3f7ee2,#5ee6d0)' },
  { id: 'l2', title: 'Microcopy reviews inside PRs — worth the friction?', communityId: 'c2', time: '1w', votes: 15, commentCount: 3, thumbGradient: 'linear-gradient(135deg,#ff6a3d,#ff5b7f)' },
  { id: 'l3', title: 'Should design systems own tone-of-voice too?', communityId: 'c1', time: '2w', votes: 24, commentCount: 5, thumbGradient: 'linear-gradient(135deg,#8b5cf6,#3f7ee2)' },
];

export const SIMILAR_ITEMS: RailItem[] = [
  { id: 's1', title: 'Writing empty states people actually read', communityId: 'c3', time: '4d', votes: 33, commentCount: 6, thumbGradient: 'linear-gradient(135deg,#f0521f,#ff8a5b)' },
  { id: 's2', title: 'How specific is too specific in error copy?', communityId: 'c2', time: '5d', votes: 18, commentCount: 4, thumbGradient: 'linear-gradient(135deg,#3f7ee2,#8b5cf6)' },
  { id: 's3', title: 'The "read it aloud" test for UI copy', communityId: 'c1', time: '1w', votes: 27, commentCount: 9, thumbGradient: 'linear-gradient(135deg,#5ee6d0,#3f7ee2)' },
];

export const TRENDING_ITEMS: RailItem[] = [
  { id: 't1', title: 'Naming features without falling into the cute-name trap', communityId: 'c1', time: '2d', votes: 28, commentCount: 9, thumbGradient: 'linear-gradient(135deg,#8b5cf6,#3f7ee2)' },
  { id: 't2', title: 'Onboarding copy — how much is too much?', communityId: 'c3', time: '5h', votes: 40, commentCount: 12, thumbGradient: 'linear-gradient(135deg,#5ee6d0,#3f7ee2)' },
  { id: 't3', title: 'Accessibility and voice: writing for screen readers', communityId: 'c4', time: '1w', votes: 26, commentCount: 8, thumbGradient: 'linear-gradient(135deg,#3f7ee2,#8b5cf6)' },
  { id: 't4', title: 'Error messages that calm instead of scold', communityId: 'c2', time: '1d', votes: 31, commentCount: 4, thumbGradient: 'linear-gradient(135deg,#3f7ee2,#5ee6d0)' },
];

export const PROFILE_POSTS: ProfilePost[] = [];

export const SUMMARY_POINTS = [
  'Warmth is specificity, not adjectives — name the cause, not the feeling.',
  'Use the read-aloud test: copy you would be embarrassed to say out loud is too precious.',
  'Give every warm line a job — reduce anxiety or clarify the next step, or cut it.',
];

export const SUGGESTED_REPLY =
  'Building on Idris and Priya — a quick rule we could adopt: keep a warm line only if deleting it makes the next step less clear. Warmth that fails that test is ornament.';
