import { StrictMode, useCallback, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { ForumKitConfig } from '@forumkit/types';
import './index.css';
import './styles/tokens.css';
import { App } from './App';
import { ThemeHostContext, type Theme, type ForumKitMascot } from './hooks/use-theme';

// Dev-harness-only: the production embed reads these from <forum-kit> attributes
// (forum-id/token, set by the host application). Standalone `npm run dev` has no
// host page, so fall back to dev-server env vars.
const DEV_CONFIG: ForumKitConfig = {
  forumId: import.meta.env.VITE_DEV_FORUM_ID ?? 'demo',
  token: import.meta.env.VITE_DEV_HOST_TOKEN ?? '',
  apiUrl: import.meta.env.VITE_DEV_API_URL,
  platform: import.meta.env.VITE_DEV_PLATFORM === 'native' ? 'native' : 'web',
};

/**
 * Dev-harness-only wrapper: the production embed (src/components/forum-kit.ts)
 * sets data-theme on the <forum-kit> shadow host itself. Here there's no shadow
 * host, so we set it on a plain wrapper div carrying tokens.css's `.fk-root`
 * fallback selector instead.
 */
function DevRoot() {
  const rootRef = useRef<HTMLDivElement>(null);
  const setThemeAttr = useCallback((theme: Theme) => {
    const el = rootRef.current;
    if (!el) return;
    if (theme === 'light') el.setAttribute('data-theme', 'light');
    else el.removeAttribute('data-theme');
  }, []);

  // Mirrors forum-kit.ts's _applyTheme/_applyBrandFont, which this harness
  // otherwise never runs (there's no ForumKitElement here to do it) - without
  // this, theme.fontFamily/brandNameFontFamily silently do nothing here even
  // though they work in the real embed.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const tokenMap: Record<string, string> = {
      primaryColor: '--fk-color-primary',
      primaryColorHover: '--fk-color-primary-hover',
      backgroundColor: '--fk-color-bg',
      surfaceColor: '--fk-color-surface',
      borderColor: '--fk-color-border',
      textPrimary: '--fk-color-text-primary',
      textSecondary: '--fk-color-text-secondary',
      fontFamily: '--fk-font-family',
      fontSize: '--fk-font-size-base',
      borderRadius: '--fk-border-radius',
      spacing: '--fk-spacing-base',
    };
    for (const [key, cssVar] of Object.entries(tokenMap)) {
      const value = DEV_CONFIG.theme?.[key as keyof typeof DEV_CONFIG.theme];
      if (value !== undefined) el.style.setProperty(cssVar, value);
    }
    if (DEV_CONFIG.brandNameFontFamily) el.style.setProperty('--fk-brand-font-family', DEV_CONFIG.brandNameFontFamily);
  }, []);

  return (
    <div ref={rootRef} className="fk-root" style={{ width: '100%', height: '100%' }}>
      <ThemeHostContext.Provider
        value={{
          setThemeAttr,
          ...(DEV_CONFIG.mascot !== undefined ? { mascot: DEV_CONFIG.mascot as ForumKitMascot } : {}),
          ...(DEV_CONFIG.brandName !== undefined ? { brandName: DEV_CONFIG.brandName } : {}),
        }}
      >
        <App config={DEV_CONFIG} />
      </ThemeHostContext.Provider>
    </div>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('No #root element found');

createRoot(root).render(
  <StrictMode>
    <DevRoot />
  </StrictMode>,
);
