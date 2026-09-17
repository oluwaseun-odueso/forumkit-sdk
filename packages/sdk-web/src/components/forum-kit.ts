import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ForumKitConfig, ThemeTokens } from '@forumkit/types';
import { App } from '../views/App';
import { ThemeHostContext, type Theme, type ForumKitMascot } from '../views/hooks/use-theme';
import shadowStyles from '../views/styles/all.css?inline';

const DEFAULT_API_URL = '';  // same origin by default
const MAX_BRAND_NAME_LENGTH = 15;

// This package targets the browser and has no @types/node dependency, so
// TypeScript doesn't otherwise know about Node's `process` global. Declared
// locally, just for the one field actually read, rather than pulling in the
// full @types/node surface for a single dev/prod check.
declare const process: { env: { NODE_ENV?: string } } | undefined;

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
// SSR frameworks (e.g. Next.js) still import client-component modules on the
// server to render initial HTML, where `HTMLElement` doesn't exist — extending
// it directly would throw just from importing this file, before any consumer
// code gets a chance to skip rendering server-side. Extending this stand-in
// instead means the class itself is always definable; only actually
// instantiating/connecting it needs a real DOM, which SSR never does.
const HTMLElementBase: typeof HTMLElement =
  typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as typeof HTMLElement);

export class ForumKitElement extends HTMLElementBase {
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

  // Same reasoning as onLogout above - getToken is a function, so it's a JS
  // property (el.getToken = fn) rather than an observed attribute. Called by
  // SessionProvider to fetch a fresh host JWT on every renewal past the
  // first exchange, since a properly short-lived host token (the security
  // property it's meant to have) will already be expired by the time a
  // renewal is due - without this, the SDK has no way to get a new one and
  // renewal just fails once the original token expires.
  private _getToken: (() => Promise<string>) | undefined;

  get getToken(): (() => Promise<string>) | undefined {
    return this._getToken;
  }

  set getToken(fn: (() => Promise<string>) | undefined) {
    this._getToken = fn;
    if (this._config) {
      this._config = this._readConfig();
      this._render();
    }
  }

  // Same reasoning again - a component reference can't be an HTML attribute,
  // so mascot is a JS property (el.mascot = MyMascot) rather than observed.
  private _mascot: unknown;

  get mascot(): unknown {
    return this._mascot;
  }

  set mascot(component: unknown) {
    this._mascot = component;
    if (this._config) {
      this._config = this._readConfig();
      this._render();
    }
  }

  static get observedAttributes(): string[] {
    return ['forum-id', 'token', 'theme', 'api-url', 'platform', 'brand-name', 'brand-name-font-family'];
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
    this._applyBrandFont(this._config.brandNameFontFamily);
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
    this._applyBrandFont(this._config.brandNameFontFamily);
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

    const brandName = this._resolveBrandName(this.getAttribute('brand-name'));
    const brandNameFontFamily = this.getAttribute('brand-name-font-family') ?? undefined;

    return {
      forumId,
      token,
      theme,
      apiUrl,
      platform,
      ...(brandName !== undefined ? { brandName } : {}),
      ...(brandNameFontFamily !== undefined ? { brandNameFontFamily } : {}),
      ...(this._mascot !== undefined ? { mascot: this._mascot } : {}),
      ...(this._onLogout ? { onLogout: this._onLogout } : {}),
      ...(this._getToken ? { getToken: this._getToken } : {}),
    };
  }

  // Fails loudly in development (a host catches an over-length brandName
  // immediately, while building) and gracefully in production (truncates
  // defensively rather than ever overflowing the nav bar live) - same split
  // CLAUDE.md prescribes for the rest of this codebase. `process` is guarded
  // since not every bundler a host uses necessarily polyfills it, though the
  // common ones (Vite, webpack, Next.js) all replace process.env.NODE_ENV at
  // build time - the same convention React itself relies on for dev warnings.
  private _resolveBrandName(raw: string | null): string | undefined {
    if (raw === null || raw === '') return undefined;
    if (raw.length <= MAX_BRAND_NAME_LENGTH) return raw;

    const isDev = typeof process === 'undefined' || process.env['NODE_ENV'] !== 'production';
    if (isDev) {
      throw new Error(
        `<forum-kit>: brand-name is ${raw.length} characters ("${raw}") — must be ${MAX_BRAND_NAME_LENGTH} or fewer.`,
      );
    }
    return raw.slice(0, MAX_BRAND_NAME_LENGTH);
  }

  /** brandNameFontFamily lives outside ThemeTokens (it's a top-level ForumKitConfig field, not a theme token), so it gets its own CSS var rather than going through _applyTheme's tokenMap. */
  private _applyBrandFont(fontFamily: string | undefined): void {
    if (fontFamily) this.style.setProperty('--fk-brand-font-family', fontFamily);
    else this.style.removeProperty('--fk-brand-font-family');
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
        // this._config.mascot is `unknown` (ForumKitConfig's own type, kept
        // framework-agnostic) - this is the trust boundary where a host's
        // raw JS property value gets threaded into the properly-typed React
        // context that MascotIcon actually consumes. Conditionally spread,
        // not `mascot: ... as ... | undefined`, since exactOptionalPropertyTypes
        // treats "key present with value undefined" differently from "key omitted".
        {
          value: {
            setThemeAttr: this._setThemeAttr,
            ...(this._config.mascot !== undefined ? { mascot: this._config.mascot as ForumKitMascot } : {}),
            ...(this._config.brandName !== undefined ? { brandName: this._config.brandName } : {}),
          },
        },
        createElement(App, { config: this._config }),
      ),
    );
  }
}

// Register the custom element
if (typeof customElements !== 'undefined' && !customElements.get('forum-kit')) {
  customElements.define('forum-kit', ForumKitElement);
}
