import type { VoteCounts, VoteDirection } from '@forumkit/types';

// Optimistic vote helpers shared by the Feed and Thread screens (posts and
// comments both). Kept in one place so the transition math isn't re-derived.

// Tapping the direction you already have toggles it off; otherwise it switches.
export function nextVoteDir(oldDir: VoteDirection | null, tapped: VoteDirection): VoteDirection | null {
  return oldDir === tapped ? null : tapped;
}

// Adjust the up/down counts for a vote transition (old direction -> new).
export function applyVote(vc: VoteCounts, oldDir: VoteDirection | null, newDir: VoteDirection | null): VoteCounts {
  return {
    up: vc.up - (oldDir === 1 ? 1 : 0) + (newDir === 1 ? 1 : 0),
    down: vc.down - (oldDir === -1 ? 1 : 0) + (newDir === -1 ? 1 : 0),
  };
}
