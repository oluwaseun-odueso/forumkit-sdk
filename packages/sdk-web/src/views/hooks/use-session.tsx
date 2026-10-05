import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ForumKitConfig } from '@forumkit/types';
import { createSession } from '../api/auth';

type SessionState =
  | { status: 'loading'; forumId: string; apiUrl: string; sessionToken: null; error: null; onLogout: (() => void) | undefined; platform: 'web' | 'native' }
  | { status: 'ready'; forumId: string; apiUrl: string; sessionToken: string; error: null; onLogout: (() => void) | undefined; platform: 'web' | 'native' }
  | { status: 'error'; forumId: string; apiUrl: string; sessionToken: null; error: string; onLogout: (() => void) | undefined; platform: 'web' | 'native' };

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ config, children }: { config: ForumKitConfig; children: ReactNode }) {
  const apiUrl = config.apiUrl ?? '';
  const platform = config.platform ?? 'web';
  const [state, setState] = useState<SessionState>({
    status: 'loading', forumId: config.forumId, apiUrl, sessionToken: null, error: null, onLogout: config.onLogout, platform,
  });
  // Wall-clock expiry time of the current token — used by the visibilitychange
  // handler to decide whether a refresh is needed when the tab comes back to
  // the foreground (same pattern as mobile's AppState listener + expiresAtRef).
  const expiresAtRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const RETRY_DELAY_MS = 15000;

    // The session token (unlike the host JWT) is short-lived — SESSION_TTL_MINUTES,
    // 15 min by default — and nothing was ever renewing it, so every authenticated
    // request silently started 401ing once a page had been open that long. Refreshing
    // at 80% of the TTL keeps a live token in place with margin to spare, rather than
    // racing the exact expiry instant.
    function scheduleRefresh(expiresIn: number) {
      if (cancelled) return;
      expiresAtRef.current = Date.now() + expiresIn * 1000;
      refreshTimer = setTimeout(() => { void refresh(true); }, expiresIn * 1000 * 0.8);
    }

    // isRenewal is false only for the very first call, made right after
    // mount — `config.token` is already fresh there (the host just minted
    // it for this render), so calling getToken() again would just be a
    // redundant extra fetch. Every later call (the 80%-of-TTL timer, a
    // failed-refresh retry, or the tab-foreground check below) is a genuine
    // renewal, and needs getToken() when the host provides one: a properly
    // short-lived host token will already be expired by the time this
    // session token needs renewing, so re-presenting the same original
    // token to the exchange endpoint is guaranteed to 401 past that point.
    // Falls back to the static token when the host hasn't implemented
    // getToken (previous behaviour — renewal just stops once that token
    // expires).
    function refresh(isRenewal = false): Promise<void> {
      const tokenPromise = isRenewal && config.getToken ? config.getToken() : Promise.resolve(config.token);
      return tokenPromise
        .then(hostToken => createSession(apiUrl, hostToken))
        .then(result => {
          if (cancelled) return;
          setState({ status: 'ready', forumId: config.forumId, apiUrl, sessionToken: result.sessionToken, error: null, onLogout: config.onLogout, platform });
          scheduleRefresh(result.expiresIn);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : 'Failed to create session';
          setState({ status: 'error', forumId: config.forumId, apiUrl, sessionToken: null, error: message, onLogout: config.onLogout, platform });
          // A transient failure (network blip, momentary server error)
          // shouldn't end the session for good — scheduleRefresh was only
          // ever called from the success path, so without this a single
          // failed refresh permanently stopped renewal for the rest of the
          // page's lifetime. Keep trying instead.
          retryTimer = setTimeout(() => { void refresh(true); }, RETRY_DELAY_MS);
        });
    }

    // Re-arm on tab foreground — if the tab was hidden long enough for the
    // token to expire (or nearly expire), refresh immediately; otherwise
    // reschedule from the remaining TTL so the 80%-trigger stays accurate.
    // Mirrors mobile's AppState 'active' listener in SessionContext.tsx.
    function handleVisibility() {
      if (document.visibilityState !== 'visible') return;
      const msRemaining = expiresAtRef.current - Date.now();
      if (msRemaining <= 0) {
        void refresh(true);
      } else {
        if (refreshTimer) clearTimeout(refreshTimer);
        scheduleRefresh(msRemaining / 1000);
      }
    }

    document.addEventListener('visibilitychange', handleVisibility);
    setState({ status: 'loading', forumId: config.forumId, apiUrl, sessionToken: null, error: null, onLogout: config.onLogout, platform });
    void refresh();

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (refreshTimer) clearTimeout(refreshTimer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [config.forumId, config.token, apiUrl, config.onLogout, platform]);

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
