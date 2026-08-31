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
  voteCounts: { up: number; down: number };
  myVote?: 1 | -1 | null;
  commentCount: number;
  saved: boolean;
};

// The nested comment shape now lives in @forumkit/shared (CommentNode);
// aliased here so existing `CommentNodeData` references keep working.
export type { CommentNode as CommentNodeData } from '@forumkit/shared';

export type RailItem = {
  id: string;
  title: string;
  authorId?: string;
  author: string;
  authorAvatarUrl?: string | null;
  time: string;
  votes: number;
  voteCounts: { up: number; down: number };
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

