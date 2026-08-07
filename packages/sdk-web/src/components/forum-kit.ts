import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ForumKitConfig, ThemeTokens } from '@forumkit/types';
import { App } from '../views/App';
import { ThemeHostContext, type Theme } from '../views/hooks/use-theme';
import shadowStyles from '../views/styles/all.css?inline';

const DEFAULT_API_URL = '';  // same origin by default

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

  static get observedAttributes(): string[] {
    return ['forum-id', 'token', 'theme', 'api-url'];
  }

  constructor() {
    super();
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

    return {
      forumId,
      token,
      theme,
      apiUrl: this.getAttribute('api-url') ?? DEFAULT_API_URL,
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
      shadowLevel:       '--fk-shadow-level',
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
