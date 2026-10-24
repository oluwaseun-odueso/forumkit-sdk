import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { createSession, getMyProfile, setTokenRefresher } from '@forumkit/shared';
import type { ForumKitConfig } from '@forumkit/types';

// Ported from sdk-web's hooks/use-session.tsx — same short-lived session token
// exchanged from the host JWT, refreshed at 80% of the TTL. React context +
// fetch + setTimeout are all available in React Native, so the logic is
// unchanged; apiUrl comes from ForumKitConfig (no window.FK_API_URL fallback).
// Two things mobile needs beyond the shared logic, though: a retry on a
// failed refresh (a single network blip used to kill the refresh chain for
// good — scheduleRefresh was only ever called from the success path), and an
// AppState listener (RN's JS timers aren't guaranteed to fire while the app
// is backgrounded/suspended by the OS, so a scheduled refresh can be missed
// entirely; re-check on every foreground return against the real remaining
// time rather than trusting the timer that was armed before backgrounding).

type SessionState =
  | { status: 'loading'; forumId: string; apiUrl: string; sessionToken: null; userId: null; role: null; error: null }
  | { status: 'ready'; forumId: string; apiUrl: string; sessionToken: string; userId: string; role: string; error: null }
  | { status: 'error'; forumId: string; apiUrl: string; sessionToken: null; userId: null; role: null; error: string };

// Just enough of the signed-in user's own profile for chrome that shows it
// everywhere (currently just the bottom bar's Profile tab avatar). Cached
// here — not in Shell.tsx, which remounts fresh on every screen — so
// navigating between screens never re-shows Avatar's fallback-letter
// placeholder while a fresh copy re-fetches.
type MyProfileSummary = { displayName: string; avatarUrl: string | null };

type SessionContextValue = SessionState & {
  profile: MyProfileSummary | null;
  setProfile: (p: MyProfileSummary) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

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
  const direct = config.useHostTokenDirectly ?? false;
  const [state, setState] = useState<SessionState>({
    status: 'loading', forumId: config.forumId, apiUrl, sessionToken: null, userId: null, role: null, error: null,
  });
  const [profile, setProfile] = useState<MyProfileSummary | null>(null);
  // Wall-clock expiry of the current session token, tracked outside state
  // (doesn't need to trigger a render) so the AppState listener can tell how
  // much real time is actually left, independent of whatever the timer that
  // was armed before backgrounding thinks.
  const expiresAtRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const RETRY_DELAY_MS = 15000;

    function scheduleRefresh(expiresIn: number) {
      if (cancelled) return;
      expiresAtRef.current = Date.now() + expiresIn * 1000;
      refreshTimer = setTimeout(() => { void refresh(true); }, expiresIn * 1000 * 0.8);
    }

    // isRenewal is false only for the very first call, made right after
    // mount — `config.token` is already fresh there (the host just minted
    // it for this render), so calling getToken() again would just be a
    // redundant extra fetch. Every later call (the 80%-of-TTL timer, a
    // failed-refresh retry, or the AppState foreground check below) is a
    // genuine renewal, and needs getToken() when the host provides one:
    // a properly short-lived host token will already be expired by the
    // time this session token needs renewing, so re-presenting the same
    // original token to the exchange endpoint is guaranteed to 401 past
    // that point. Falls back to the static token when the host hasn't
    // implemented getToken (previous behaviour — renewal just stops once
    // that token expires).
    let refreshPromise: Promise<string | null> | null = null;

    // Collapses concurrent callers (the 80%-TTL timer, the AppState resume
    // check, and any number of simultaneously-401ing API calls retrying
    // through authedFetch below) into one network round trip instead of one
    // each. Returns the new token so authedFetch's retry-once-on-401 can use
    // it directly.
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
          setState({ status: 'ready', forumId: config.forumId, apiUrl, sessionToken, userId: result.userId, role: result.role, error: null });
          scheduleRefresh(expiresIn);
          return sessionToken;
        })
        .catch((err: unknown) => {
          if (cancelled) return null;
          const message = err instanceof Error ? err.message : 'Failed to create session';
          setState({ status: 'error', forumId: config.forumId, apiUrl, sessionToken: null, userId: null, role: null, error: message });
          // A transient failure (network blip, momentary server error)
          // shouldn't end the session for good — keep trying rather than
          // leaving the app permanently stuck on a dead token.
          retryTimer = setTimeout(() => { void refresh(true); }, RETRY_DELAY_MS);
          return null;
        })
        .finally(() => { refreshPromise = null; });
      return refreshPromise;
    }

    const appStateSub = AppState.addEventListener('change', next => {
      if (next !== 'active' || cancelled || expiresAtRef.current === null) return;
      const msRemaining = expiresAtRef.current - Date.now();
      if (refreshTimer) clearTimeout(refreshTimer);
      if (msRemaining <= 0) {
        void refresh(true);
      } else {
        refreshTimer = setTimeout(() => { void refresh(true); }, msRemaining * 0.8);
      }
    });

    setTokenRefresher(() => refresh(true));
    setState({ status: 'loading', forumId: config.forumId, apiUrl, sessionToken: null, userId: null, role: null, error: null });
    void refresh();

    return () => {
      cancelled = true;
      setTokenRefresher(null);
      if (refreshTimer) clearTimeout(refreshTimer);
      if (retryTimer) clearTimeout(retryTimer);
      appStateSub.remove();
    };
  }, [config.forumId, config.token, apiUrl]);

  const token = state.status === 'ready' ? state.sessionToken : undefined;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getMyProfile(apiUrl, config.forumId, token).then(p => {
      if (!cancelled && p) setProfile({ displayName: p.displayName, avatarUrl: p.avatarUrl });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [apiUrl, config.forumId, token]);

  return <SessionContext.Provider value={{ ...state, profile, setProfile }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (ctx === null) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
