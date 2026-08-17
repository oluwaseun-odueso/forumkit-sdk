import { fmtRelativeTime } from './format-time';
import type { Thread, VoteCounts, VoteDirection } from '@forumkit/types';

// Shared Thread -> feed-row mapping. The common fields both SDKs need; each
// platform layers its own extras on top. sdk-web's FeedPost composes this and
// adds thumbGradient, the full imageUrls array + videoUrl, domain, and a
// computed net-votes count for its carousel/lightbox; the mobile feed uses this
// row shape as-is.
//
// This uses `.find()` for the thumbnail (short-circuits at the first image, no
// intermediate arrays) since the row only needs one image. sdk-web keeps its
// own `.filter().map()` because it needs the WHOLE image list anyway and reuses
// [0] from it — both optimal in their own context.

export type FeedRow = {
  id: string;
  authorId: string;
  author: string;
  authorAvatarUrl: string | null;
  time: string;
  title: string;
  body: string;
  imageUrl: string | null;
  voteCounts: VoteCounts;
  myVote: VoteDirection | null;
  commentCount: number;
  saved: boolean;
};

export function threadToFeedRow(thread: Thread): FeedRow {
  const firstImage = (thread.attachments ?? []).find(a => a.mimeType.startsWith('image/'));
  return {
    id: thread.id,
    authorId: thread.authorId,
    author: thread.authorDisplayName ?? 'Member',
    authorAvatarUrl: thread.authorAvatarUrl ?? null,
    time: fmtRelativeTime(thread.createdAt),
    title: thread.title,
    body: thread.body,
    imageUrl: firstImage?.downloadUrl ?? null,
    voteCounts: thread.voteCounts ?? { up: 0, down: 0 },
    myVote: thread.myVote ?? null,
    commentCount: thread.commentCount ?? 0,
    saved: thread.isSaved ?? false,
  };
}
