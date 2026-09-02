import type { VoteDirection } from '@forumkit/types';
import {
  voteOnThread as sharedVoteOnThread,
  removeVoteFromThread as sharedRemoveVoteFromThread,
  voteOnComment as sharedVoteOnComment,
  removeVoteFromComment as sharedRemoveVoteFromComment,
  type VoteResult,
} from '@forumkit/shared';

function getApiBase(): string {
  return typeof window !== 'undefined'
    ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
    : '';
}

// All vote endpoints delegate to the shared client (fetch logic lives once
// there); the web signatures are unchanged, so existing call sites are untouched.
export function voteOnThread(
  forumId: string,
  threadId: string,
  direction: VoteDirection,
  token?: string,
): Promise<VoteResult> {
  return sharedVoteOnThread(getApiBase(), forumId, threadId, direction, token);
}

export function removeVoteFromThread(forumId: string, threadId: string, token?: string): Promise<VoteResult> {
  return sharedRemoveVoteFromThread(getApiBase(), forumId, threadId, token);
}

export function voteOnComment(
  threadId: string,
  commentId: string,
  direction: VoteDirection,
  token?: string,
): Promise<VoteResult> {
  return sharedVoteOnComment(getApiBase(), threadId, commentId, direction, token);
}

export function removeVoteFromComment(threadId: string, commentId: string, token?: string): Promise<VoteResult> {
  return sharedRemoveVoteFromComment(getApiBase(), threadId, commentId, token);
}
