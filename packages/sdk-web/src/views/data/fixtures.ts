export type Community = { id: string; name: string; letter: string; gradient: string };

export type FeedPost = {
  id: string;
  communityId: string;
  authorId?: string;
  author: string;
  time: string;
  title: string;
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
  imageUrl: string | null;
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

export const PROFILE_POSTS: ProfilePost[] = [];

export const SUMMARY_POINTS = [
  'Warmth is specificity, not adjectives — name the cause, not the feeling.',
  'Use the read-aloud test: copy you would be embarrassed to say out loud is too precious.',
  'Give every warm line a job — reduce anxiety or clarify the next step, or cut it.',
];

export const SUGGESTED_REPLY =
  'Building on Idris and Priya — a quick rule we could adopt: keep a warm line only if deleting it makes the next step less clear. Warmth that fails that test is ornament.';
