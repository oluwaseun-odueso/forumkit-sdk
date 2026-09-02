import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ForumKitConfig, ThemeTokens } from '@forumkit/types';
import { App } from '../views/App';
import { ThemeHostContext, type Theme } from '../views/hooks/use-theme';
import shadowStyles from '../views/styles/all.css?inline';

const DEFAULT_API_URL = '';  // same origin by default

const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Michroma&family=Inter:wght@400;500;600;700;800&display=swap';

// tokens.css assumes Inter/Michroma are already loaded (font-family: Inter,
// system-ui, sans-serif - a silent fallback, not a load failure, so this was
// easy to miss). The dev harness's own index.html loads them via <link> tags,
// but that file is dev-harness-only scaffolding, never shipped - a real host
// page has no reason to know it needs to load these specific fonts for
// ForumKit's benefit. Font-face rules aren't shadow-DOM-scoped (unlike normal
// selectors), so injecting these into the document head - once per page,
// however many <forum-kit> instances exist - makes them available inside the
// shadow root too.
function ensureFontsLoaded(): void {
  if (document.querySelector(`link[href="${FONTS_HREF}"]`)) return;

  const preconnect1 = document.createElement('link');
  preconnect1.rel = 'preconnect';
  preconnect1.href = 'https://fonts.googleapis.com';
  document.head.appendChild(preconnect1);

  const preconnect2 = document.createElement('link');
  preconnect2.rel = 'preconnect';
  preconnect2.href = 'https://fonts.gstatic.com';
  preconnect2.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect2);

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = FONTS_HREF;
  document.head.appendChild(stylesheet);
}

/**
 * <forum-kit> Web Component
 *
 * Usage:
 *   <forum-kit
 *     forum-id="my-forum"
 *     token="eyJ..."
 *     theme='{"primaryColor":"#6200EE"}'
 *   ></forum-kit>
 */
export class ForumKitElement extends HTMLElement {
  private _config: ForumKitConfig | null = null;
  private _shadow: ShadowRoot;
  private _mountPoint: HTMLDivElement;
  private _root: Root | null = null;
  // A function can't be represented as an HTML attribute, so onLogout is set
  // as a JS property directly (el.onLogout = fn) rather than observed via
  // attributeChangedCallback — this is also why plain HTML usage has no way
  // to provide it, by design (see README's Customization section).
  private _onLogout: (() => void) | undefined;

  get onLogout(): (() => void) | undefined {
    return this._onLogout;
  }

  set onLogout(fn: (() => void) | undefined) {
    this._onLogout = fn;
    // Only re-render if we've already got a base config (forum-id/token
    // attributes present) - avoids re-rendering on a partially-constructed
    // element if onLogout happens to be assigned before those attributes.
    if (this._config) {
      this._config = this._readConfig();
      this._render();
    }
  }

  static get observedAttributes(): string[] {
    return ['forum-id', 'token', 'theme', 'api-url', 'platform'];
  }

  constructor() {
    super();
    ensureFontsLoaded();
    this._shadow = this.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = shadowStyles;
    this._shadow.appendChild(style);

    this._mountPoint = document.createElement('div');
    this._mountPoint.style.width = '100%';
    this._mountPoint.style.height = '100%';
    this._shadow.appendChild(this._mountPoint);
  }

  connectedCallback(): void {
    this._config = this._readConfig();
    this._applyTheme(this._config.theme ?? {});
    this._render();
  }

  disconnectedCallback(): void {
    this._root?.unmount();
    this._root = null;
  }

  attributeChangedCallback(): void {
    if (!this._shadow) return;
    this._config = this._readConfig();
    this._applyTheme(this._config.theme ?? {});
    this._render();
  }

  private _readConfig(): ForumKitConfig {
    const forumId = this.getAttribute('forum-id');
    const token = this.getAttribute('token');
    if (!forumId) throw new Error('<forum-kit>: forum-id attribute is required');
    if (!token) throw new Error('<forum-kit>: token attribute is required');

    const themeRaw = this.getAttribute('theme');
    const theme = themeRaw ? (JSON.parse(themeRaw) as ThemeTokens) : {};

    const platformAttr = this.getAttribute('platform');
    const platform = platformAttr === 'native' ? 'native' : 'web';

    const apiUrl = this.getAttribute('api-url') ?? DEFAULT_API_URL;
    // views/api/*.ts's fetch calls all read this global for their base URL
    // (set here rather than threaded through props/context, since several of
    // them are called from outside any component - e.g. streaming helpers).
    if (typeof window !== 'undefined') {
      (window as Window & { FK_API_URL?: string }).FK_API_URL = apiUrl;
    }

    return {
      forumId,
      token,
      theme,
      apiUrl,
      platform,
      ...(this._onLogout ? { onLogout: this._onLogout } : {}),
    };
  }

  /**
   * Maps theme token config to CSS custom properties on the host element.
   * CSS custom properties cross shadow DOM boundaries by design,
   * so tokens set here are available inside the shadow root.
   */
  private _applyTheme(theme: ThemeTokens): void {
    const tokenMap: Record<keyof ThemeTokens, string> = {
      primaryColor:      '--fk-color-primary',
      primaryColorHover: '--fk-color-primary-hover',
      backgroundColor:   '--fk-color-bg',
      surfaceColor:      '--fk-color-surface',
      borderColor:       '--fk-color-border',
      textPrimary:       '--fk-color-text-primary',
      textSecondary:     '--fk-color-text-secondary',
      fontFamily:        '--fk-font-family',
      fontSize:          '--fk-font-size-base',
      borderRadius:      '--fk-border-radius',
      spacing:           '--fk-spacing-base',
    };

    for (const [key, cssVar] of Object.entries(tokenMap)) {
      const value = theme[key as keyof ThemeTokens];
      if (value !== undefined) {
        this.style.setProperty(cssVar, value);
      }
    }
  }

  /** Implements ThemeHostContext: dark/light mode toggling sets data-theme on `this` (the host), matching tokens.css's `:host([data-theme='light'])` rule. */
  private _setThemeAttr = (theme: Theme): void => {
    if (theme === 'light') this.setAttribute('data-theme', 'light');
    else this.removeAttribute('data-theme');
  };

  private _render(): void {
    if (!this._config) return;
    if (!this._root) this._root = createRoot(this._mountPoint);
    this._root.render(
      createElement(
        ThemeHostContext.Provider,
        { value: { setThemeAttr: this._setThemeAttr } },
        createElement(App, { config: this._config }),
      ),
    );
  }
}

// Register the custom element
if (!customElements.get('forum-kit')) {
  customElements.define('forum-kit', ForumKitElement);
}
