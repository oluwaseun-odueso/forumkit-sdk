export type FeedPost = {
  id: string;
  authorId?: string;
  author: string;
  authorAvatarUrl?: string | null;
  time: string;
  title: string;
  body: string;
  thumbGradient: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  videoUrl?: string | null;
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
  authorAvatarUrl?: string | null;
  time: string;
  body: string;
  votes: number;
  voteCounts?: { up: number; down: number };
  myVote?: 1 | -1 | null;
  isSaved: boolean;
  replies: CommentNodeData[];
};

export type RailItem = {
  id: string;
  title: string;
  authorId?: string;
  author: string;
  authorAvatarUrl?: string | null;
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

export const PROFILE_POSTS: ProfilePost[] = [];

export const SUMMARY_POINTS = [
  'Warmth is specificity, not adjectives — name the cause, not the feeling.',
  'Use the read-aloud test: copy you would be embarrassed to say out loud is too precious.',
  'Give every warm line a job — reduce anxiety or clarify the next step, or cut it.',
];

export const SUGGESTED_REPLY =
  'Building on Idris and Priya — a quick rule we could adopt: keep a warm line only if deleting it makes the next step less clear. Warmth that fails that test is ornament.';
