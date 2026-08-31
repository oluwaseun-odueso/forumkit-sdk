import type { VoteDirection } from '@forumkit/types';
import {
  voteOnThread as sharedVoteOnThread,
  removeVoteFromThread as sharedRemoveVoteFromThread,
  voteOnComment as sharedVoteOnComment,
  removeVoteFromComment as sharedRemoveVoteFromComment,
  type VoteResult,
} from '@forumkit/shared';

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

// All vote endpoints delegate to the shared client (fetch logic lives once
// there); the web signatures are unchanged, so existing call sites are untouched.
export function voteOnThread(
  forumId: string,
  threadId: string,
  direction: VoteDirection,
  token?: string,
): Promise<VoteResult> {
  return sharedVoteOnThread(API_BASE, forumId, threadId, direction, token);
}

export function removeVoteFromThread(forumId: string, threadId: string, token?: string): Promise<VoteResult> {
  return sharedRemoveVoteFromThread(API_BASE, forumId, threadId, token);
}

export function voteOnComment(
  threadId: string,
  commentId: string,
  direction: VoteDirection,
  token?: string,
): Promise<VoteResult> {
  return sharedVoteOnComment(API_BASE, threadId, commentId, direction, token);
}

export function removeVoteFromComment(threadId: string, commentId: string, token?: string): Promise<VoteResult> {
  return sharedRemoveVoteFromComment(API_BASE, threadId, commentId, token);
}
