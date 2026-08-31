import { createContext } from 'react';

export type Theme = 'dark' | 'light';

export type ThemeHost = { setThemeAttr: (theme: Theme) => void };

// The DOM-attribute-setting side of theming (shared by every consumer);
// the actual theme *state* lives in use-forum-state.tsx's
// state.profile.themePreference + toggleTheme now, as the single source of
// truth every toggle (top-nav, account menu, Settings) reads from and
// writes to.
export const ThemeHostContext = createContext<ThemeHost>({ setThemeAttr: () => {} });
