import type { DB } from '../db';
import type {
  ProfileActivityItem, ProfileActivityScope, ProfileActivitySort, ProfileActivityContentType,
} from '@forumkit/types';
import * as threadRepo from '../repositories/thread';
import type { ThreadWithMetaData } from '../repositories/thread';
import * as commentRepo from '../repositories/comment';
import type { CommentWithThreadContext } from '../repositories/comment';
import * as saveRepo from '../repositories/save';
import * as voteRepo from '../repositories/vote';
import * as attachmentRepo from '../repositories/attachment';
import { toAttachmentSummaries } from './thread';
import type { ThreadWithAttachments } from './thread';

export type ProfileActivityResult = { items: ProfileActivityItem[]; total: number; page: number; limit: number };

// Capped rather than exhaustive — see repositories/vote.ts's listVotedThreadIds
// doc comment. Large enough to cover many pages of a normal user's activity,
// small enough to keep the merge step cheap at this app's expected scale
// (a self-hosted community forum, not Reddit-scale).
const VOTE_HISTORY_CAP = 200;
const OVERVIEW_FETCH_CAP = 500;

// Threads returned by author/id-batch queries don't carry attachments —
// unlike the main feed, which resolves them via services/thread.ts's own
// listThreads. Same resolution, reused here via the exported helper.
async function hydrateThreadAttachments(
  db: DB,
  publicApiUrl: string,
  forumId: string,
  threads: ThreadWithMetaData[],
): Promise<ThreadWithAttachments[]> {
  if (threads.length === 0) return [];
  const allAttachments = await attachmentRepo.listAttachmentsByThreadIds(db, threads.map((t) => t.id));
  const byThread = new Map<string, typeof allAttachments>();
  for (const a of allAttachments) {
    if (!a.threadId) continue;
    const list = byThread.get(a.threadId) ?? [];
    list.push(a);
    byThread.set(a.threadId, list);
  }
  return threads.map((t) => ({ ...t, attachments: toAttachmentSummaries(publicApiUrl, forumId, byThread.get(t.id) ?? []) }));
}

function threadItem(thread: ThreadWithAttachments): ProfileActivityItem {
  return { kind: 'thread', thread };
}

function commentItem(comment: CommentWithThreadContext): ProfileActivityItem {
  return {
    kind: 'comment',
    comment,
    threadId: comment.threadId,
    threadTitle: comment.threadTitle,
    ...(comment.replyingTo ? { replyingTo: comment.replyingTo } : {}),
  };
}

function sortKeyOf(item: ProfileActivityItem): Date {
  return item.kind === 'thread' ? item.thread.createdAt : item.comment.createdAt;
}

function scoreOf(item: ProfileActivityItem): number {
  const counts = item.kind === 'thread' ? item.thread.voteCounts : item.comment.voteCounts;
  return (counts?.up ?? 0) - (counts?.down ?? 0);
}

function sortByRecency(items: ProfileActivityItem[]): ProfileActivityItem[] {
  return [...items].sort((a, b) => sortKeyOf(b).getTime() - sortKeyOf(a).getTime());
}

function sortByScore(items: ProfileActivityItem[]): ProfileActivityItem[] {
  return [...items].sort((a, b) => scoreOf(b) - scoreOf(a));
}

function sortItems(items: ProfileActivityItem[], sort: ProfileActivitySort): ProfileActivityItem[] {
  return sort === 'top' ? sortByScore(items) : sortByRecency(items);
}

function paginate<T>(items: T[], page: number, limit: number): T[] {
  const offset = (page - 1) * limit;
  return items.slice(offset, offset + limit);
}

// Sorts a mixed thread+comment list by an external timestamp (save/vote
// time) rather than the items' own createdAt — used by Saved/Upvoted/
// Downvoted, where "recency" means "when you saved/voted," not "when it
// was posted."
function sortByExternalTime(items: ProfileActivityItem[], timeById: Map<string, Date>): ProfileActivityItem[] {
  const idOf = (item: ProfileActivityItem): string => (item.kind === 'thread' ? item.thread.id : item.comment.id);
  return [...items].sort((a, b) => (timeById.get(idOf(b))?.getTime() ?? 0) - (timeById.get(idOf(a))?.getTime() ?? 0));
}

export async function getProfileActivity(
  db: DB,
  publicApiUrl: string,
  forumId: string,
  userId: string,
  scope: ProfileActivityScope,
  page: number,
  limit: number,
  sort: ProfileActivitySort,
  contentType: ProfileActivityContentType,
): Promise<ProfileActivityResult> {
  if (scope === 'posts') {
    if (sort === 'top') {
      const { threads, total } = await threadRepo.listThreadsByAuthor(db, publicApiUrl, forumId, userId, 1, OVERVIEW_FETCH_CAP, userId);
      const hydrated = await hydrateThreadAttachments(db, publicApiUrl, forumId, threads);
      return { items: paginate(sortByScore(hydrated.map(threadItem)), page, limit), total, page, limit };
    }
    const { threads, total } = await threadRepo.listThreadsByAuthor(db, publicApiUrl, forumId, userId, page, limit, userId);
    const hydrated = await hydrateThreadAttachments(db, publicApiUrl, forumId, threads);
    return { items: hydrated.map(threadItem), total, page, limit };
  }

  if (scope === 'comments') {
    if (sort === 'top') {
      const { comments, total } = await commentRepo.listCommentsByAuthor(db, publicApiUrl, forumId, userId, 1, OVERVIEW_FETCH_CAP, userId);
      return { items: paginate(sortByScore(comments.map(commentItem)), page, limit), total, page, limit };
    }
    const { comments, total } = await commentRepo.listCommentsByAuthor(db, publicApiUrl, forumId, userId, page, limit, userId);
    return { items: comments.map(commentItem), total, page, limit };
  }

  if (scope === 'saved') {
    const [savedThreadRows, savedCommentRows] = await Promise.all([
      contentType === 'comments' ? [] : saveRepo.listSavedThreadIds(db, userId, forumId),
      contentType === 'posts' ? [] : saveRepo.listSavedCommentIds(db, userId, forumId),
    ]);
    const savedAtById = new Map(savedThreadRows.map((r) => [r.id, r.savedAt] as const));
    for (const r of savedCommentRows) savedAtById.set(r.id, r.savedAt);

    const [threads, comments] = await Promise.all([
      threadRepo.getThreadsByIds(db, publicApiUrl, savedThreadRows.map((r) => r.id), userId),
      commentRepo.getCommentsByIds(db, publicApiUrl, savedCommentRows.map((r) => r.id), userId),
    ]);
    const hydratedThreads = await hydrateThreadAttachments(db, publicApiUrl, forumId, threads);

    const items = [...hydratedThreads.map(threadItem), ...comments.map(commentItem)];
    const sorted = sort === 'top' ? sortByScore(items) : sortByExternalTime(items, savedAtById);
    return { items: paginate(sorted, page, limit), total: items.length, page, limit };
  }

  if (scope === 'upvoted' || scope === 'downvoted') {
    const direction = scope === 'upvoted' ? 1 : -1;
    const [votedThreadRows, votedCommentRows] = await Promise.all([
      contentType === 'comments' ? [] : voteRepo.listVotedThreadIds(db, forumId, userId, direction, VOTE_HISTORY_CAP),
      contentType === 'posts' ? [] : voteRepo.listVotedCommentIds(db, forumId, userId, direction, VOTE_HISTORY_CAP),
    ]);
    const votedAtById = new Map(votedThreadRows.map((r) => [r.id, r.votedAt] as const));
    for (const r of votedCommentRows) votedAtById.set(r.id, r.votedAt);

    const [threads, comments] = await Promise.all([
      threadRepo.getThreadsByIds(db, publicApiUrl, votedThreadRows.map((r) => r.id), userId),
      commentRepo.getCommentsByIds(db, publicApiUrl, votedCommentRows.map((r) => r.id), userId),
    ]);
    const hydratedThreads = await hydrateThreadAttachments(db, publicApiUrl, forumId, threads);

    const items = [...hydratedThreads.map(threadItem), ...comments.map(commentItem)];
    const sorted = sort === 'top' ? sortByScore(items) : sortByExternalTime(items, votedAtById);
    return { items: paginate(sorted, page, limit), total: items.length, page, limit };
  }

  // overview — the user's own threads + comments merged, newest (or top) first.
  const fetchLimit = Math.min(OVERVIEW_FETCH_CAP, page * limit);
  const [threadsResult, commentsResult] = await Promise.all([
    contentType === 'comments'
      ? { threads: [] as ThreadWithMetaData[], total: 0 }
      : threadRepo.listThreadsByAuthor(db, publicApiUrl, forumId, userId, 1, fetchLimit, userId),
    contentType === 'posts'
      ? { comments: [] as CommentWithThreadContext[], total: 0 }
      : commentRepo.listCommentsByAuthor(db, publicApiUrl, forumId, userId, 1, fetchLimit, userId),
  ]);
  const hydratedThreads = await hydrateThreadAttachments(db, publicApiUrl, forumId, threadsResult.threads);
  const items = [...hydratedThreads.map(threadItem), ...commentsResult.comments.map(commentItem)];

  return {
    items: paginate(sortItems(items, sort), page, limit),
    total: threadsResult.total + commentsResult.total,
    page,
    limit,
  };
}
