import { createContext, type ComponentType } from 'react';

export type Theme = 'dark' | 'light';

// ForumKitConfig types this `unknown` (that package has no React
// dependency); this is MascotIcon's own real contract, defined here since
// this context is the thing that actually carries a host's override to it.
export type ForumKitMascot = ComponentType<{ size?: number }>;

export type ThemeHost = { setThemeAttr: (theme: Theme) => void; mascot?: ForumKitMascot; brandName?: string };

// The DOM-attribute-setting side of theming (shared by every consumer);
// the actual theme *state* lives in use-forum-state.tsx's
// state.profile.themePreference + toggleTheme now, as the single source of
// truth every toggle (top-nav, account menu, Settings) reads from and
// writes to.
export const ThemeHostContext = createContext<ThemeHost>({ setThemeAttr: () => {} });
