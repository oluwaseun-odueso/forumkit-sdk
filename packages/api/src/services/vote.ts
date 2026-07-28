import type { DB } from '../db';
import type { VoteCounts, VoteDirection } from '@forumkit/types';
import { ok, err } from '../lib/result';
import type { Result } from '../lib/result';
import * as voteRepo from '../repositories/vote';
import * as postRepo from '../repositories/post';
import * as threadRepo from '../repositories/thread';

export type VoteError = 'thread_not_found' | 'post_not_found';

type VoteResult = { voteCounts: VoteCounts; myVote: VoteDirection | null };

// Toggle semantics live here, not in the repository: voting the same
// direction you already have clears your vote; voting the opposite
// direction flips it. The server is the source of truth across devices.
export async function voteOnThread(
  db: DB,
  threadId: string,
  userId: string,
  direction: VoteDirection,
): Promise<Result<VoteResult, VoteError>> {
  const thread = await threadRepo.getThreadById(db, threadId);
  if (!thread) return err('thread_not_found');

  const target = { kind: 'thread' as const, id: threadId };
  const current = await voteRepo.getUserVote(db, target, userId);
  if (current === direction) {
    await voteRepo.removeVote(db, target, userId);
  } else {
    await voteRepo.upsertVote(db, target, userId, direction);
  }

  const voteCounts = await voteRepo.getVoteCounts(db, target);
  return ok({ voteCounts, myVote: current === direction ? null : direction });
}

export async function removeVoteFromThread(
  db: DB,
  threadId: string,
  userId: string,
): Promise<Result<VoteResult, VoteError>> {
  const thread = await threadRepo.getThreadById(db, threadId);
  if (!thread) return err('thread_not_found');

  const target = { kind: 'thread' as const, id: threadId };
  await voteRepo.removeVote(db, target, userId);
  const voteCounts = await voteRepo.getVoteCounts(db, target);
  return ok({ voteCounts, myVote: null });
}

// No threadId here, mirroring reactToPost/updatePost/deletePost/reportPost —
// postId alone is enough to find/verify the post, and voting has no
// thread-level invariant to protect (unlike acceptAnswer, which does check
// post.threadId, since only one accepted answer may exist per thread).
export async function voteOnPost(
  db: DB,
  postId: string,
  userId: string,
  direction: VoteDirection,
): Promise<Result<VoteResult, VoteError>> {
  const post = await postRepo.getPostById(db, postId);
  if (!post) return err('post_not_found');

  const target = { kind: 'post' as const, id: postId };
  const current = await voteRepo.getUserVote(db, target, userId);
  if (current === direction) {
    await voteRepo.removeVote(db, target, userId);
  } else {
    await voteRepo.upsertVote(db, target, userId, direction);
  }

  const voteCounts = await voteRepo.getVoteCounts(db, target);
  return ok({ voteCounts, myVote: current === direction ? null : direction });
}

export async function removeVoteFromPost(
  db: DB,
  postId: string,
  userId: string,
): Promise<Result<VoteResult, VoteError>> {
  const post = await postRepo.getPostById(db, postId);
  if (!post) return err('post_not_found');

  const target = { kind: 'post' as const, id: postId };
  await voteRepo.removeVote(db, target, userId);
  const voteCounts = await voteRepo.getVoteCounts(db, target);
  return ok({ voteCounts, myVote: null });
}
