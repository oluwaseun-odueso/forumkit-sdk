import type { DB } from '../db';
import type { Post, ReactionType, UserRole } from '@forumkit/types';
import type { EmbedFn, ModerateFn } from '@forumkit/ai';
import { embedOne, safeModerate } from '@forumkit/ai';
import { ok, err } from '../lib/result';
import type { Result } from '../lib/result';
import * as repo from '../repositories/post';

export type PostError = 'post_not_found' | 'thread_not_found' | 'thread_locked' | 'forbidden';

type CreatePostOptions = {
  threadId: string;
  authorId: string;
  body: string;
  parentPostId?: string | undefined;
};

export async function createPost(
  db: DB,
  embedFn: EmbedFn,
  moderateFn: ModerateFn,
  opts: CreatePostOptions,
): Promise<Result<Post, PostError>> {
  const thread = await repo.getThreadInfo(db, opts.threadId);
  if (!thread) return err('thread_not_found');
  if (thread.status === 'locked') return err('thread_locked');
  if (thread.status === 'deleted') return err('thread_not_found');

  const post = await repo.createPost(db, opts);

  void embedPost(db, embedFn, post.id, post.body);
  void moderatePost(db, moderateFn, post.id, opts.threadId, post.body);

  return ok(post);
}

export async function updatePost(
  db: DB,
  postId: string,
  authorId: string,
  body: string,
): Promise<Result<Post, PostError>> {
  const existing = await repo.getPostById(db, postId);
  if (!existing) return err('post_not_found');
  if (existing.authorId !== authorId) return err('forbidden');

  const post = await repo.updatePost(db, postId, body);
  if (!post) return err('post_not_found');
  return ok(post);
}

export async function deletePost(
  db: DB,
  postId: string,
  requesterId: string,
  requesterRole: UserRole,
): Promise<Result<void, PostError>> {
  const post = await repo.getPostById(db, postId);
  if (!post) return err('post_not_found');

  const canDelete =
    post.authorId === requesterId ||
    requesterRole === 'moderator' ||
    requesterRole === 'admin';

  if (!canDelete) return err('forbidden');

  await repo.softDeletePost(db, postId);
  return ok(undefined);
}

export async function reactToPost(
  db: DB,
  postId: string,
  userId: string,
  type: ReactionType,
): Promise<Result<Partial<Record<ReactionType, number>>, PostError>> {
  const post = await repo.getPostById(db, postId);
  if (!post) return err('post_not_found');
  await repo.upsertReaction(db, postId, userId, type);
  const counts = await repo.getReactionCounts(db, postId);
  return ok(counts);
}

export async function removeReaction(
  db: DB,
  postId: string,
  userId: string,
  type: ReactionType,
): Promise<Result<Partial<Record<ReactionType, number>>, PostError>> {
  const post = await repo.getPostById(db, postId);
  if (!post) return err('post_not_found');
  await repo.deleteReaction(db, postId, userId, type);
  const counts = await repo.getReactionCounts(db, postId);
  return ok(counts);
}

export async function reportPost(
  db: DB,
  postId: string,
  reporterId: string,
  reason: string,
): Promise<Result<void, PostError>> {
  const post = await repo.getPostById(db, postId);
  if (!post) return err('post_not_found');
  await repo.insertReport(db, postId, reporterId, reason);
  return ok(undefined);
}

type AcceptAnswerOptions = {
  postId: string;
  threadId: string;
  requesterId: string;
  requesterRole: UserRole;
};

export async function acceptAnswer(
  db: DB,
  opts: AcceptAnswerOptions,
): Promise<Result<Post, PostError>> {
  const [post, thread] = await Promise.all([
    repo.getPostById(db, opts.postId),
    repo.getThreadInfo(db, opts.threadId),
  ]);

  if (!post) return err('post_not_found');
  if (!thread) return err('thread_not_found');

  const canAccept =
    thread.authorId === opts.requesterId ||
    opts.requesterRole === 'moderator' ||
    opts.requesterRole === 'admin';

  if (!canAccept) return err('forbidden');

  const updated = await repo.setAcceptedAnswer(db, opts.postId, opts.threadId);
  return ok(updated);
}

async function embedPost(
  db: DB,
  embedFn: EmbedFn,
  postId: string,
  body: string,
): Promise<void> {
  try {
    const vector = await embedOne(body, embedFn);
    if (vector) await repo.updatePostEmbedding(db, postId, vector);
  } catch (e) {
    console.error('[post-service] embedding failed for post %s: %o', postId, e);
  }
}

async function moderatePost(
  db: DB,
  moderateFn: ModerateFn,
  postId: string,
  threadId: string,
  body: string,
): Promise<void> {
  try {
    const [result, config] = await Promise.all([
      safeModerate(body, moderateFn),
      repo.getForumConfigByThreadId(db, threadId),
    ]);
    if (!config) return;
    const hide = result.score >= config.moderationThreshold;
    await repo.updatePostToxicity(db, postId, result.score, hide);
    if (result.score >= config.moderationReviewThreshold) {
      await repo.insertModerationQueueItem(db, postId, result.score, result.flags);
    }
  } catch (e) {
    console.error('[post-service] moderation failed for post %s: %o', postId, e);
  }
}
