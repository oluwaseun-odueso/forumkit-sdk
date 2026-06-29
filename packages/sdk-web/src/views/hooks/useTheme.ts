import { useState, useEffect, useCallback } from 'react';
import { LIGHT_VARS } from '../styles/tokens';

export type Theme = 'dark' | 'light';

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return (localStorage.getItem('fk-theme') as Theme) ?? 'dark'; }
    catch { return 'dark'; }
  });

  const applyTheme = useCallback((t: Theme) => {
    const root = document.documentElement;
    if (t === 'light') {
      for (const [k, v] of Object.entries(LIGHT_VARS)) root.style.setProperty(k, v);
      root.style.setProperty('--fk-accent', '#2f6fe0');
      root.style.setProperty('--fk-glow', '0.3');
      root.style.setProperty('--fk-grain', '0');
    } else {
      for (const k of Object.keys(LIGHT_VARS)) root.style.removeProperty(k);
      root.style.setProperty('--fk-accent', '#5cc8f5');
      root.style.setProperty('--fk-glow', '1');
      root.style.setProperty('--fk-grain', '0.05');
    }
  }, []);

  useEffect(() => { applyTheme(theme); }, [theme, applyTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('fk-theme', next); } catch { /* noop */ }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
