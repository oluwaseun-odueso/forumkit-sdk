import type { ForumKitConfig, ThemeTokens } from '@forumkit/types';

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

  static get observedAttributes(): string[] {
    return ['forum-id', 'token', 'theme', 'api-url'];
  }

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this._config = this._readConfig();
    this._applyTheme(this._config.theme ?? {});
    this._render();
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

  private _render(): void {
    if (!this._config) return;

    // TODO: replace with full UI rendering
    // For now renders a loading state so the component is visible and testable
    this._shadow.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--fk-font-family, system-ui, sans-serif);
          font-size: var(--fk-font-size-base, 16px);
          color: var(--fk-color-text-primary, #0f172a);
          background: var(--fk-color-bg, #ffffff);
          border-radius: var(--fk-border-radius, 8px);
          padding: var(--fk-spacing-base, 16px);
        }
        .fk-loading {
          text-align: center;
          padding: 2rem;
          color: var(--fk-color-text-secondary, #475569);
        }
      </style>
      <div class="fk-loading">
        ForumKit loading for forum: ${this._config.forumId}
      </div>
    `;
  }
}

// Register the custom element
if (!customElements.get('forum-kit')) {
  customElements.define('forum-kit', ForumKitElement);
}
