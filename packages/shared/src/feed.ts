import { fmtRelativeTime } from './format-time';
import type { Thread, VoteCounts, VoteDirection } from '@forumkit/types';

// Shared Thread -> feed-row mapping. The common fields both SDKs need; each
// platform layers its own extras on top. sdk-web's FeedPost composes this and
// adds thumbGradient, the full imageUrls array, domain, and a computed
// net-votes count for its carousel/lightbox. The mobile feed uses this row
// shape as-is, but (like web's own row/compact view) only ever shows ONE
// thumbnail per card — imageUrl is that thumbnail (an image takes priority
// over a video, matching web's row view), videoUrl is only set when there's
// no image at all, and mediaCount is the total attachment count so the card
// can show a "+N" badge for the rest, same as web's row view badge.
//
// This uses `.find()`/`.filter().length` rather than building the whole
// imageUrls array (which sdk-web's own richer mapping does, since its
// carousel needs every image) — the row here only ever renders one thumb.

export type FeedRow = {
  id: string;
  authorId: string;
  author: string;
  authorAvatarUrl: string | null;
  time: string;
  title: string;
  body: string;
  imageUrl: string | null;
  videoUrl: string | null;
  mediaCount: number;
  voteCounts: VoteCounts;
  myVote: VoteDirection | null;
  commentCount: number;
  saved: boolean;
};

export function threadToFeedRow(thread: Thread): FeedRow {
  const attachments = thread.attachments ?? [];
  const firstImage = attachments.find(a => a.mimeType.startsWith('image/'));
  const firstVideo = attachments.find(a => a.mimeType.startsWith('video/'));
  return {
    id: thread.id,
    authorId: thread.authorId,
    author: thread.authorDisplayName ?? 'Member',
    authorAvatarUrl: thread.authorAvatarUrl ?? null,
    time: fmtRelativeTime(thread.createdAt),
    title: thread.title,
    body: thread.body,
    imageUrl: firstImage?.downloadUrl ?? null,
    videoUrl: firstImage ? null : (firstVideo?.downloadUrl ?? null),
    mediaCount: attachments.length,
    voteCounts: thread.voteCounts ?? { up: 0, down: 0 },
    myVote: thread.myVote ?? null,
    commentCount: thread.commentCount ?? 0,
    saved: thread.isSaved ?? false,
  };
}
