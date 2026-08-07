import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ForumKitConfig } from '@forumkit/types';
import { createSession } from '../api/auth';

type SessionState =
  | { status: 'loading'; forumId: string; apiUrl: string; sessionToken: null; error: null; onLogout: (() => void) | undefined }
  | { status: 'ready'; forumId: string; apiUrl: string; sessionToken: string; error: null; onLogout: (() => void) | undefined }
  | { status: 'error'; forumId: string; apiUrl: string; sessionToken: null; error: string; onLogout: (() => void) | undefined };

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ config, children }: { config: ForumKitConfig; children: ReactNode }) {
  const apiUrl = config.apiUrl ?? '';
  const [state, setState] = useState<SessionState>({
    status: 'loading', forumId: config.forumId, apiUrl, sessionToken: null, error: null, onLogout: config.onLogout,
  });

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    // The session token (unlike the host JWT) is short-lived — SESSION_TTL_MINUTES,
    // 15 min by default — and nothing was ever renewing it, so every authenticated
    // request silently started 401ing once a page had been open that long. Refreshing
    // at 80% of the TTL keeps a live token in place with margin to spare, rather than
    // racing the exact expiry instant.
    function scheduleRefresh(expiresIn: number) {
      if (cancelled) return;
      refreshTimer = setTimeout(() => { void refresh(); }, expiresIn * 1000 * 0.8);
    }

    function refresh(): Promise<void> {
      return createSession(apiUrl, config.token)
        .then(result => {
          if (cancelled) return;
          setState({ status: 'ready', forumId: config.forumId, apiUrl, sessionToken: result.sessionToken, error: null, onLogout: config.onLogout });
          scheduleRefresh(result.expiresIn);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : 'Failed to create session';
          setState({ status: 'error', forumId: config.forumId, apiUrl, sessionToken: null, error: message, onLogout: config.onLogout });
        });
    }

    setState({ status: 'loading', forumId: config.forumId, apiUrl, sessionToken: null, error: null, onLogout: config.onLogout });
    void refresh();

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [config.forumId, config.token, apiUrl, config.onLogout]);

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
