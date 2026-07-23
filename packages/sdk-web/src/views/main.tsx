import { StrictMode, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { ForumKitConfig } from '@forumkit/types';
import './index.css';
import './styles/tokens.css';
import { App } from './App';
import { ThemeHostContext, type Theme } from './hooks/use-theme';

// Dev-harness-only: the production embed reads these from <forum-kit> attributes
// (forum-id/token, set by the host application). Standalone `npm run dev` has no
// host page, so fall back to dev-server env vars.
const DEV_CONFIG: ForumKitConfig = {
  forumId: import.meta.env.VITE_DEV_FORUM_ID ?? 'demo',
  token: import.meta.env.VITE_DEV_HOST_TOKEN ?? '',
  apiUrl: import.meta.env.VITE_DEV_API_URL,
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

  return (
    <div ref={rootRef} className="fk-root" style={{ width: '100%', height: '100%' }}>
      <ThemeHostContext.Provider value={{ setThemeAttr }}>
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
