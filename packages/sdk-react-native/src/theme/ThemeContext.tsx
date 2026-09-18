import { createContext, startTransition, useContext, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { useColorScheme, LayoutAnimation, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTokens, lightTokens, type TokenSet } from '@forumkit/shared';
import type { ForumKitConfig, ThemeTokens } from '@forumkit/types';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'forumkit.themePreference';
const MAX_BRAND_NAME_LENGTH = 15;

// ForumKitConfig types this `unknown` (that package has no React/React
// Native dependency); this is Mascot's own real contract.
export type ForumKitMascot = ComponentType<{ size?: number }>;

// Maps the small set of host-overridable knobs in ForumKitConfig.theme onto
// the internal token keys they affect — mirrors sdk-web's _applyTheme in
// forum-kit.ts, which sets these as CSS custom properties on the host
// element. Colour tokens only - fontFamily/fontSize aren't TokenSet keys
// (that's a colour palette; RN has its own font-handling constraints, see
// parseFontSize below), so they're threaded through separately.
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

// theme.fontSize is a CSS string on ForumKitConfig (e.g. "16px", matching
// web's convention) since it's shared across both platforms - RN's style
// system needs a plain number instead, so this strips a trailing "px" (the
// only unit web's own usage ever produces) and parses it. Unparseable or
// absent values just fall through to undefined (RN's own default), not 0.
function parseFontSize(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : undefined;
}

// Same fail-loudly-in-dev/gracefully-in-prod split as sdk-web's
// _resolveBrandName in forum-kit.ts: throws in development so a host
// catches an over-length brandName while building, truncates defensively
// in production so a live app never overflows the drawer. __DEV__ is RN's
// own built-in global for this (unlike web, no process.env workaround
// needed here).
function resolveBrandName(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  if (raw.length <= MAX_BRAND_NAME_LENGTH) return raw;

  if (__DEV__) {
    throw new Error(
      `<ForumKit>: brandName is ${raw.length} characters ("${raw}") — must be ${MAX_BRAND_NAME_LENGTH} or fewer.`,
    );
  }
  return raw.slice(0, MAX_BRAND_NAME_LENGTH);
}

type ThemeContextValue = {
  mode: ThemeMode;
  tokens: TokenSet;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  // Unlike the colour tokens above, these aren't merged into `tokens` - a
  // host-supplied fontFamily must already be registered via their own
  // useFonts() call before ForumKit mounts (Expo can't load an arbitrary
  // CSS-style font-family string the way web can), so this is deliberately
  // just "the key to use if set", not a fully-resolved guarantee.
  fontFamily?: string;
  fontSize?: number;
  mascot?: ForumKitMascot;
  brandName?: string;
  brandNameFontFamily?: string;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children, config }: { children: ReactNode; config: ForumKitConfig }) {
  const { theme } = config;
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
    ...(theme?.fontFamily !== undefined ? { fontFamily: theme.fontFamily } : {}),
    ...((() => { const fs = parseFontSize(theme?.fontSize); return fs !== undefined ? { fontSize: fs } : {}; })()),
    ...(config.mascot !== undefined ? { mascot: config.mascot as ForumKitMascot } : {}),
    ...((() => { const bn = resolveBrandName(config.brandName); return bn !== undefined ? { brandName: bn } : {}; })()),
    ...(config.brandNameFontFamily !== undefined ? { brandNameFontFamily: config.brandNameFontFamily } : {}),
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
  }), [mode, tokens, theme, config.mascot, config.brandName, config.brandNameFontFamily]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
