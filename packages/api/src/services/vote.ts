import type { DB } from '../db';
import type { VoteCounts, VoteDirection } from '@forumkit/types';
import { ok, err } from '../lib/result';
import type { Result } from '../lib/result';
import * as voteRepo from '../repositories/vote';
import * as commentRepo from '../repositories/comment';
import { notifyVote } from './notification';

function directionLabel(direction: VoteDirection): 'up' | 'down' {
  return direction === 1 ? 'up' : 'down';
}

export type VoteError = 'thread_not_found' | 'comment_not_found';

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
  const thread = await commentRepo.getThreadInfo(db, threadId);
  if (!thread) return err('thread_not_found');

  const target = { kind: 'thread' as const, id: threadId };
  const current = await voteRepo.getUserVote(db, target, userId);
  if (current === direction) {
    await voteRepo.removeVote(db, target, userId);
  } else {
    await voteRepo.upsertVote(db, target, userId, direction);
    void notifyVote(db, {
      forumId: thread.forumId,
      kind: 'thread',
      threadId,
      voterId: userId,
      authorId: thread.authorId,
      direction: directionLabel(direction),
    });
  }

  const voteCounts = await voteRepo.getVoteCounts(db, target);
  return ok({ voteCounts, myVote: current === direction ? null : direction });
}

export async function removeVoteFromThread(
  db: DB,
  threadId: string,
  userId: string,
): Promise<Result<VoteResult, VoteError>> {
  const thread = await commentRepo.getThreadInfo(db, threadId);
  if (!thread) return err('thread_not_found');

  const target = { kind: 'thread' as const, id: threadId };
  await voteRepo.removeVote(db, target, userId);
  const voteCounts = await voteRepo.getVoteCounts(db, target);
  return ok({ voteCounts, myVote: null });
}

// No threadId here, mirroring reactToComment/updateComment/deleteComment/reportComment —
// commentId alone is enough to find/verify the comment, and voting has no
// thread-level invariant to protect (unlike acceptAnswer, which does check
// comment.threadId, since only one accepted answer may exist per thread).
export async function voteOnComment(
  db: DB,
  commentId: string,
  userId: string,
  direction: VoteDirection,
): Promise<Result<VoteResult, VoteError>> {
  const comment = await commentRepo.getCommentInfo(db, commentId);
  if (!comment) return err('comment_not_found');

  const target = { kind: 'comment' as const, id: commentId };
  const current = await voteRepo.getUserVote(db, target, userId);
  if (current === direction) {
    await voteRepo.removeVote(db, target, userId);
  } else {
    await voteRepo.upsertVote(db, target, userId, direction);
    if (userId !== comment.authorId) {
      const thread = await commentRepo.getThreadInfo(db, comment.threadId);
      if (thread) {
        void notifyVote(db, {
          forumId: thread.forumId,
          kind: 'comment',
          threadId: comment.threadId,
          commentId,
          voterId: userId,
          authorId: comment.authorId,
          direction: directionLabel(direction),
        });
      }
    }
  }

  const voteCounts = await voteRepo.getVoteCounts(db, target);
  return ok({ voteCounts, myVote: current === direction ? null : direction });
}

export async function removeVoteFromComment(
  db: DB,
  commentId: string,
  userId: string,
): Promise<Result<VoteResult, VoteError>> {
  const comment = await commentRepo.getCommentInfo(db, commentId);
  if (!comment) return err('comment_not_found');

  const target = { kind: 'comment' as const, id: commentId };
  await voteRepo.removeVote(db, target, userId);
  const voteCounts = await voteRepo.getVoteCounts(db, target);
  return ok({ voteCounts, myVote: null });
}
