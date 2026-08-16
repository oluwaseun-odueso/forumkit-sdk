// Canonical design token values — the single source of truth for both
// packages/sdk-web (which renders these as CSS custom properties in
// views/styles/tokens.css) and packages/sdk-react-native (which consumes
// this object directly, since RN has no CSS). Keep both consumers in sync
// with this file rather than hand-copying values into either one.
//
// Keys match the CSS custom property name (minus the leading `--`) exactly,
// so generating tokens.css from this file later is a direct `--${key}` — no
// separate name-mapping table to keep in sync on top of the values.
//
// `down` has no light-theme override in the current web tokens.css (a
// pre-existing gap, not introduced here) — kept as-is; falls back to the
// dark value until someone gives it one.
export type TokenKey =
  | 'bg' | 'surface' | 'surface-2' | 'elev' | 'nav'
  | 'border' | 'border-strong'
  | 'text' | 'text-2' | 'muted' | 'faint'
  | 'hover' | 'hover-2'
  | 'accent' | 'accent-2' | 'accent-fg' | 'accent-soft'
  | 'up' | 'down' | 'success' | 'danger'
  | 'ring' | 'thumb-shadow';

export type TokenSet = Record<TokenKey, string>;

export const darkTokens: TokenSet = {
  'bg': '#0b0e12',
  'surface': '#14171c',
  'surface-2': '#1a1e25',
  'elev': '#1f242c',
  'nav': '#0e1116',
  'border': 'rgba(255, 255, 255, 0.09)',
  'border-strong': 'rgba(255, 255, 255, 0.16)',
  'text': '#e7eaef',
  'text-2': '#c3c9d2',
  'muted': '#868e9b',
  'faint': '#5b6470',
  'hover': 'rgba(255, 255, 255, 0.06)',
  'hover-2': 'rgba(255, 255, 255, 0.1)',
  'accent': '#3f7ee2',
  'accent-2': '#5a92ea',
  'accent-fg': '#ffffff',
  'accent-soft': 'rgba(63, 126, 226, 0.16)',
  'up': '#ff6a3d',
  'down': '#8b6dff',
  'success': '#3fb950',
  'danger': '#e0463a',
  'ring': 'rgba(63, 126, 226, 0.55)',
  'thumb-shadow': 'rgba(0, 0, 0, 0.5)',
};

export const lightTokens: TokenSet = {
  ...darkTokens,
  'bg': '#f6f8fa',
  'surface': '#ffffff',
  'surface-2': '#eef1f4',
  'elev': '#ffffff',
  'nav': '#ffffff',
  'border': 'rgba(0, 0, 0, 0.1)',
  'border-strong': 'rgba(0, 0, 0, 0.16)',
  'text': '#16181c',
  'text-2': '#2b2f36',
  'muted': '#5c6773',
  'faint': '#7c8794',
  'hover': 'rgba(0, 0, 0, 0.05)',
  'hover-2': 'rgba(0, 0, 0, 0.08)',
  'accent': '#2f6fd6',
  'accent-2': '#2560c4',
  'accent-soft': 'rgba(47, 111, 214, 0.12)',
  'up': '#f0521f',
  'success': '#1f9d3c',
  'danger': '#d1372b',
  'ring': 'rgba(47, 111, 214, 0.5)',
  'thumb-shadow': 'rgba(0, 0, 0, 0.18)',
};

// Timing/easing shared by the mascot's fkdance/fkdotpop/fkbadge animations
// on both platforms (CSS @keyframes on web, react-native-reanimated on
// mobile) — kept here so the two implementations can't silently drift out
// of sync on duration/delay values.
export const mascotAnimationTiming = {
  danceDurationMs: 4800,
  dotPopDurationMs: 1400,
  dotPopDelaysMs: [0, 180, 360] as const,
  badgeDurationMs: 4800,
} as const;
