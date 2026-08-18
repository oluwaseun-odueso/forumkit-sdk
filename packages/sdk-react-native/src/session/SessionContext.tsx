import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createSession } from '@forumkit/shared';
import type { ForumKitConfig } from '@forumkit/types';

// Ported from sdk-web's hooks/use-session.tsx — same short-lived session token
// exchanged from the host JWT, refreshed at 80% of the TTL. React context +
// fetch + setTimeout are all available in React Native, so the logic is
// unchanged; apiUrl comes from ForumKitConfig (no window.FK_API_URL fallback).

type SessionState =
  | { status: 'loading'; forumId: string; apiUrl: string; sessionToken: null; userId: null; role: null; error: null }
  | { status: 'ready'; forumId: string; apiUrl: string; sessionToken: string; userId: string; role: string; error: null }
  | { status: 'error'; forumId: string; apiUrl: string; sessionToken: null; userId: null; role: null; error: string };

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ config, children }: { config: ForumKitConfig; children: ReactNode }) {
  const apiUrl = config.apiUrl ?? '';
  const [state, setState] = useState<SessionState>({
    status: 'loading', forumId: config.forumId, apiUrl, sessionToken: null, userId: null, role: null, error: null,
  });

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleRefresh(expiresIn: number) {
      if (cancelled) return;
      refreshTimer = setTimeout(() => { void refresh(); }, expiresIn * 1000 * 0.8);
    }

    function refresh(): Promise<void> {
      return createSession(apiUrl, config.token)
        .then(result => {
          if (cancelled) return;
          setState({ status: 'ready', forumId: config.forumId, apiUrl, sessionToken: result.sessionToken, userId: result.userId, role: result.role, error: null });
          scheduleRefresh(result.expiresIn);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : 'Failed to create session';
          setState({ status: 'error', forumId: config.forumId, apiUrl, sessionToken: null, userId: null, role: null, error: message });
        });
    }

    setState({ status: 'loading', forumId: config.forumId, apiUrl, sessionToken: null, userId: null, role: null, error: null });
    void refresh();

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [config.forumId, config.token, apiUrl]);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (ctx === null) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
