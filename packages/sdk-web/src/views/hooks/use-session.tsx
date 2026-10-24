import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ForumKitConfig } from '@forumkit/types';
import { createSession } from '../api/auth';
import { setTokenRefresher } from '@forumkit/shared';

type SessionState =
  | { status: 'loading'; forumId: string; apiUrl: string; sessionToken: null; error: null; onLogout: (() => void) | undefined; platform: 'web' | 'native' }
  | { status: 'ready'; forumId: string; apiUrl: string; sessionToken: string; error: null; onLogout: (() => void) | undefined; platform: 'web' | 'native' }
  | { status: 'error'; forumId: string; apiUrl: string; sessionToken: null; error: string; onLogout: (() => void) | undefined; platform: 'web' | 'native' };

const SessionContext = createContext<SessionState | null>(null);

// Decodes a JWT's exp claim without verifying it — the token was either
// just handed to us by the host or already accepted by the backend, not
// something we need to re-check here, just read a field from.
function decodeExp(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    return payload ? (JSON.parse(atob(payload)).exp ?? null) : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ config, children }: { config: ForumKitConfig; children: ReactNode }) {
  const apiUrl = config.apiUrl ?? '';
  const platform = config.platform ?? 'web';
  const direct = config.useHostTokenDirectly ?? false;
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
    let refreshPromise: Promise<string | null> | null = null;

    // Collapses concurrent callers (the 80%-TTL timer, the visibilitychange
    // resume check, and any number of simultaneously-401ing API calls
    // retrying through authedFetch below) into one network round trip
    // instead of one each. Returns the new token so authedFetch's
    // retry-once-on-401 can use it directly.
    function refresh(isRenewal = false): Promise<string | null> {
      if (refreshPromise) return refreshPromise;
      const tokenPromise = isRenewal && config.getToken ? config.getToken() : Promise.resolve(config.token);
      refreshPromise = tokenPromise
        .then(async hostToken => {
          const result = await createSession(apiUrl, hostToken, config.forumId);
          return { hostToken, result };
        })
        .then(({ hostToken, result }) => {
          if (cancelled) return null;
          // direct mode: re-present the host token itself on every request
          // instead of ForumKit's own session token; scheduleRefresh then
          // needs the host token's own exp, not ForumKit's session TTL.
          const sessionToken = direct ? hostToken : result.sessionToken;
          const hostExp = direct ? decodeExp(hostToken) : null;
          const expiresIn = hostExp !== null ? hostExp - Date.now() / 1000 : result.expiresIn;
          setState({ status: 'ready', forumId: config.forumId, apiUrl, sessionToken, error: null, onLogout: config.onLogout, platform });
          scheduleRefresh(expiresIn);
          return sessionToken;
        })
        .catch((err: unknown) => {
          if (cancelled) return null;
          const message = err instanceof Error ? err.message : 'Failed to create session';
          setState({ status: 'error', forumId: config.forumId, apiUrl, sessionToken: null, error: message, onLogout: config.onLogout, platform });
          // A transient failure (network blip, momentary server error)
          // shouldn't end the session for good — scheduleRefresh was only
          // ever called from the success path, so without this a single
          // failed refresh permanently stopped renewal for the rest of the
          // page's lifetime. Keep trying instead.
          retryTimer = setTimeout(() => { void refresh(true); }, RETRY_DELAY_MS);
          return null;
        })
        .finally(() => { refreshPromise = null; });
      return refreshPromise;
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
    setTokenRefresher(() => refresh(true));
    setState({ status: 'loading', forumId: config.forumId, apiUrl, sessionToken: null, error: null, onLogout: config.onLogout, platform });
    void refresh();

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      setTokenRefresher(null);
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
