import { StrictMode, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './styles/tokens.css';
import { App } from './App';
import { ThemeHostContext, type Theme } from './hooks/use-theme';

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
        <App />
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
