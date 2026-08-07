import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'fk_theme';

export type ThemeHost = { setThemeAttr: (theme: Theme) => void };

export const ThemeHostContext = createContext<ThemeHost>({ setThemeAttr: () => {} });

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const host = useContext(ThemeHostContext);
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    host.setThemeAttr(theme);
  }, [theme, host]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
