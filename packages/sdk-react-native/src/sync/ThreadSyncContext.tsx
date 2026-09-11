import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { FeedRow } from '@forumkit/shared';
import type { Comment } from '@forumkit/types';

// Cross-screen sync for fields a user's OWN vote/save/comment action can
// change. Not a port of sdk-web's use-forum-state.tsx (owns the entire app's
// state); native-stack keeps only a handful of screens mounted at once and
// each already fetches its own full data correctly — the only gap is these
// specific fields drifting once fetched. Mirrors SessionContext.tsx's
// existing focused-Context pattern rather than introducing a new one.

export type ThreadSyncPatch = Partial<Pick<FeedRow, 'voteCounts' | 'myVote' | 'commentCount' | 'saved'>>;
export type CommentSyncPatch = Partial<Pick<Comment, 'voteCounts' | 'myVote' | 'isSaved'>>;

type ThreadSyncContextValue = {
  threadPatches: Record<string, ThreadSyncPatch>;
  commentPatches: Record<string, CommentSyncPatch>;
  patchThread: (id: string, patch: ThreadSyncPatch) => void;
  patchComment: (id: string, patch: CommentSyncPatch) => void;
};

const ThreadSyncContext = createContext<ThreadSyncContextValue | null>(null);

export function ThreadSyncProvider({ children }: { children: ReactNode }) {
  const [threadPatches, setThreadPatches] = useState<Record<string, ThreadSyncPatch>>({});
  const [commentPatches, setCommentPatches] = useState<Record<string, CommentSyncPatch>>({});

  const patchThread = useCallback((id: string, patch: ThreadSyncPatch) => {
    setThreadPatches(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);
  const patchComment = useCallback((id: string, patch: CommentSyncPatch) => {
    setCommentPatches(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  return (
    <ThreadSyncContext.Provider value={{ threadPatches, commentPatches, patchThread, patchComment }}>
      {children}
    </ThreadSyncContext.Provider>
  );
}

export function useThreadSync(): ThreadSyncContextValue {
  const ctx = useContext(ThreadSyncContext);
  if (ctx === null) throw new Error('useThreadSync must be used inside ThreadSyncProvider');
  return ctx;
}
