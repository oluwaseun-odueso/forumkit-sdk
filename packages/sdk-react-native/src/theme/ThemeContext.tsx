import { createContext, startTransition, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme, LayoutAnimation, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTokens, lightTokens, type TokenSet } from '@forumkit/shared';
import type { ThemeTokens } from '@forumkit/types';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'forumkit.themePreference';

// Maps the small set of host-overridable knobs in ForumKitConfig.theme onto
// the internal token keys they affect — mirrors sdk-web's _applyTheme in
// forum-kit.ts, which sets these as CSS custom properties on the host
// element.
function applyHostOverrides(base: TokenSet, overrides: ThemeTokens | undefined): TokenSet {
  if (!overrides) return base;
  const next = { ...base };
  if (overrides.primaryColor) next.accent = overrides.primaryColor;
  if (overrides.primaryColorHover) next['accent-2'] = overrides.primaryColorHover;
  if (overrides.backgroundColor) next.bg = overrides.backgroundColor;
  if (overrides.surfaceColor) next.surface = overrides.surfaceColor;
  if (overrides.borderColor) next.border = overrides.borderColor;
  if (overrides.textPrimary) next.text = overrides.textPrimary;
  if (overrides.textSecondary) next['text-2'] = overrides.textSecondary;
  return next;
}

type ThemeContextValue = {
  mode: ThemeMode;
  tokens: TokenSet;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children, theme }: { children: ReactNode; theme?: ThemeTokens | undefined }) {
  const systemScheme = useColorScheme();
  // Seeds from the device's own light/dark setting on first mount (before
  // any stored preference loads), then a persisted user choice takes over —
  // same "system default, explicit choice wins" shape as sdk-web's
  // localStorage-seeded default in main.tsx.
  const [mode, setMode] = useState<ThemeMode>(systemScheme === 'light' ? 'light' : 'dark');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored === 'light' || stored === 'dark') setMode(stored);
      setHydrated(true);
    }).catch(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => { /* best-effort persistence */ });
  }, [mode, hydrated]);

  const tokens = useMemo(
    () => applyHostOverrides(mode === 'light' ? lightTokens : darkTokens, theme),
    [mode, theme],
  );

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    tokens,
    // startTransition schedules the mass re-render (all useTheme consumers) as
    // a concurrent update so React can yield to user interactions mid-render,
    // preventing the JS thread from blocking during a full-tree theme repaint.
    // LayoutAnimation hands the colour transition to the native animation system
    // so the swap feels like a smooth crossfade rather than an instant hard cut.
    toggleTheme: () => {
      if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      startTransition(() => setMode(m => (m === 'light' ? 'dark' : 'light')));
    },
    setTheme: (m) => {
      if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      startTransition(() => setMode(m));
    },
  }), [mode, tokens]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
