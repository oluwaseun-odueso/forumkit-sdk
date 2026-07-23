import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ForumKitConfig } from '@forumkit/types';
import { createSession } from '../api/auth';

type SessionState =
  | { status: 'loading'; forumId: string; apiUrl: string; sessionToken: null; error: null }
  | { status: 'ready'; forumId: string; apiUrl: string; sessionToken: string; error: null }
  | { status: 'error'; forumId: string; apiUrl: string; sessionToken: null; error: string };

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ config, children }: { config: ForumKitConfig; children: ReactNode }) {
  const apiUrl = config.apiUrl ?? '';
  const [state, setState] = useState<SessionState>({
    status: 'loading', forumId: config.forumId, apiUrl, sessionToken: null, error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', forumId: config.forumId, apiUrl, sessionToken: null, error: null });
    createSession(apiUrl, config.token)
      .then(result => {
        if (cancelled) return;
        setState({ status: 'ready', forumId: config.forumId, apiUrl, sessionToken: result.sessionToken, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to create session';
        setState({ status: 'error', forumId: config.forumId, apiUrl, sessionToken: null, error: message });
      });
    return () => { cancelled = true; };
  }, [config.forumId, config.token, apiUrl]);

  return (
    <SessionContext.Provider value={state}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (ctx === null) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
