import { fmtRelativeTime } from './format-time';
import type { Comment, VoteCounts, VoteDirection } from '@forumkit/types';

// Nested comment view-model + the flat->tree builder, shared by web and mobile.
// Lifted from sdk-web (use-forum-state.tsx's commentsToCommentTree +
// thread-view.tsx's filterComments); web's CommentNodeData is now an alias of
// CommentNode. The server returns a flat Comment[] (created_at ASC); this nests
// it by parentCommentId.

export type CommentNode = {
  id: string;
  authorId?: string;
  author: string;
  authorAvatarUrl?: string | null;
  time: string;
  body: string;
  votes: number;
  voteCounts: VoteCounts;
  myVote?: VoteDirection | null;
  isSaved: boolean;
  isAcceptedAnswer: boolean;
  replies: CommentNode[];
};

function netVotes(v?: VoteCounts): number {
  return (v?.up ?? 0) - (v?.down ?? 0);
}

export function commentsToCommentTree(comments: Comment[]): CommentNode[] {
  const byId = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const p of comments) {
    const voteCounts = p.voteCounts ?? { up: 0, down: 0 };
    byId.set(p.id, {
      id: p.id,
      authorId: p.authorId,
      author: p.authorDisplayName ?? 'Member',
      authorAvatarUrl: p.authorAvatarUrl ?? null,
      time: fmtRelativeTime(p.createdAt),
      body: p.body,
      votes: netVotes(voteCounts),
      voteCounts,
      myVote: p.myVote ?? null,
      isSaved: p.isSaved ?? false,
      isAcceptedAnswer: p.isAcceptedAnswer,
      replies: [],
    });
  }

  for (const p of comments) {
    const node = byId.get(p.id);
    if (!node) continue;
    const parent = p.parentCommentId ? byId.get(p.parentCommentId) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }

  return roots;
}

// Keeps a comment (and its ancestors) if its body — or any descendant's —
// matches the query. Used by the thread's "Search Comments" filter.
export function filterComments(list: CommentNode[], q: string): CommentNode[] {
  const lower = q.toLowerCase();
  return list.reduce<CommentNode[]>((acc, c) => {
    const filteredReplies = filterComments(c.replies, lower);
    if (c.body.toLowerCase().includes(lower) || filteredReplies.length > 0) {
      acc.push({ ...c, replies: filteredReplies });
    }
    return acc;
  }, []);
}
