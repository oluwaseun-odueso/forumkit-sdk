import type { ForumKitConfig, ThemeTokens, Post, SimilarThread, Tag, WSMessage } from '@forumkit/types';
import { ForumKitClient } from '../api/client';
import type { ThreadWithMetaData } from '../api/client';
import { BASE_STYLES } from './styles';
import { renderThreadList } from '../views/thread-list';
import {
  renderThreadView,
  renderNewThreadForm,
  renderComposer,
  type AIState,
} from '../views/thread-view';
import { escapeHtml } from '../lib/html';

// Empty string = same-origin default; overridden via the api-url attribute
const DEFAULT_API_URL = '';

type RouterState =
  | { view: 'loading' }
  | { view: 'error'; message: string }
  | { view: 'list'; page: number; search: string }
  | { view: 'new-thread' }
  | { view: 'thread'; threadId: string };

export class ForumKitElement extends HTMLElement {
  private _config: ForumKitConfig | null = null;
  private _shadow: ShadowRoot;

  private _client: ForumKitClient | null = null;
  private _routerState: RouterState = { view: 'loading' };

  private _threads: ThreadWithMetaData[] = [];
  private _total = 0;
  private _availableTags: Tag[] = [];
  private _activeTagId: string | null = null;

  private _currentThread: ThreadWithMetaData | null = null;
  private _currentPosts: Post[] = [];
  private _currentUserId = '';

  private _aiState: AIState = { status: 'idle' };
  private _duplicates: SimilarThread[] = [];
  private _isDuplicateChecking = false;
  private _replyTargetPostId: string | null = null;

  private _searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _duplicateDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _wsUnsubscribe: (() => void) | null = null;
  private _previousThreadId: string | null = null;
  private _lastInitToken = '';

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
    this._shadow.addEventListener('click', this._onClick);
    this._shadow.addEventListener('input', this._onInput);
    this._shadow.addEventListener('keydown', this._onKeyDown);
    this._initClient();
  }

  attributeChangedCallback(): void {
    if (!this._shadow) return;
    this._config = this._readConfig();
    this._applyTheme(this._config.theme ?? {});
    if (this._config.token !== this._lastInitToken) {
      this._initClient();
    } else {
      this._render();
    }
  }

  disconnectedCallback(): void {
    this._wsUnsubscribe?.();
    this._shadow.removeEventListener('click', this._onClick);
    this._shadow.removeEventListener('input', this._onInput);
    this._shadow.removeEventListener('keydown', this._onKeyDown);
    if (this._searchDebounceTimer !== null) clearTimeout(this._searchDebounceTimer);
    if (this._duplicateDebounceTimer !== null) clearTimeout(this._duplicateDebounceTimer);
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
      if (value !== undefined) this.style.setProperty(cssVar, value);
    }
  }

  private _initClient(): void {
    if (!this._config) return;
    this._lastInitToken = this._config.token;
    this._client = new ForumKitClient(this._config);
    this._navigateTo({ view: 'loading' });

    this._client
      .init()
      .then(() => {
        this._currentUserId = (this._client as ForumKitClient).userId;
        return Promise.all([this._loadThreadList(1, ''), this._loadTags()]);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to connect to forum';
        this._navigateTo({ view: 'error', message });
      });
  }

  private async _loadThreadList(page: number, search: string): Promise<void> {
    if (!this._client) return;
    this._navigateTo({ view: 'loading' });
    try {
      if (search) {
        const resp = await this._client.search(search, page);
        this._threads = resp.results as unknown as ThreadWithMetaData[];
        this._total = resp.total;
      } else {
        const resp = await this._client.listThreads({
          page,
          tagId: this._activeTagId ?? undefined,
        });
        this._threads = resp.threads;
        this._total = resp.total;
      }
      this._navigateTo({ view: 'list', page, search });
    } catch {
      this._navigateTo({ view: 'error', message: 'Could not load threads. Try refreshing.' });
    }
  }

  private async _loadTags(): Promise<void> {
    if (!this._client) return;
    try {
      this._availableTags = await this._client.listTags();
      this._render();
    } catch {
      // Non-fatal; forum works without tag filters
    }
  }

  private async _loadThread(threadId: string): Promise<void> {
    if (!this._client) return;
    this._previousThreadId = threadId;
    this._wsUnsubscribe?.();
    this._wsUnsubscribe = null;
    this._aiState = { status: 'idle' };
    this._navigateTo({ view: 'loading' });

    try {
      const resp = await this._client.getThread(threadId);
      this._currentThread = resp.thread;
      this._currentPosts = resp.posts;
      this._navigateTo({ view: 'thread', threadId });
      this._focusThreadTitle();
      this._wsUnsubscribe = this._client.subscribeToThread(threadId, this._onWsMessage);
    } catch {
      this._navigateTo({ view: 'error', message: 'Could not load this thread. Try again.' });
    }
  }

  private _navigateTo(state: RouterState): void {
    this._routerState = state;
    this._render();
  }

  private _render(): void {
    if (!this._config) return;

    let viewHtml: string;
    const state = this._routerState;

    switch (state.view) {
      case 'loading':
        viewHtml = '<div class="fk-loading" role="status" aria-live="polite">Loading...</div>';
        break;

      case 'error':
        viewHtml = `<div class="fk-error" role="alert">${escapeHtml(state.message)}</div>`;
        break;

      case 'list':
        viewHtml = renderThreadList(
          { page: state.page, search: state.search, activeTagId: this._activeTagId },
          this._threads,
          this._total,
          this._availableTags,
        );
        break;

      case 'new-thread':
        viewHtml = renderNewThreadForm(this._duplicates, this._isDuplicateChecking);
        break;

      case 'thread':
        if (!this._currentThread) {
          viewHtml = '<div class="fk-loading" role="status">Loading thread...</div>';
        } else {
          viewHtml = renderThreadView(
            this._currentThread,
            this._currentPosts,
            this._aiState,
            this._currentUserId,
          );
          if (this._replyTargetPostId) {
            viewHtml += renderComposer(this._replyTargetPostId);
          }
        }
        break;
    }

    this._shadow.innerHTML = `<style>${BASE_STYLES}</style>${viewHtml}`;
  }

  private _focusThreadTitle(): void {
    requestAnimationFrame(() => {
      (this._shadow.getElementById('fk-thread-title') as HTMLElement | null)?.focus();
    });
  }

  private _focusPreviousCard(): void {
    if (!this._previousThreadId) return;
    requestAnimationFrame(() => {
      (this._shadow.getElementById(
        `fk-thread-card-${this._previousThreadId}`,
      ) as HTMLElement | null)?.focus();
    });
  }

  private _onWsMessage = (msg: WSMessage): void => {
    switch (msg.type) {
      case 'post.created':
        this._currentPosts = [...this._currentPosts, msg.payload];
        break;
      case 'post.updated':
        this._currentPosts = this._currentPosts.map((p) =>
          p.id === msg.payload.id ? msg.payload : p,
        );
        break;
      case 'post.deleted':
        this._currentPosts = this._currentPosts.filter((p) => p.id !== msg.payload.postId);
        break;
      case 'reaction.updated':
        this._currentPosts = this._currentPosts.map((p) =>
          p.id === msg.payload.postId
            ? { ...p, reactionCounts: msg.payload.reactionCounts }
            : p,
        );
        break;
    }
    this._render();
  };

  private _onClick = (e: Event): void => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) return;

    const action = target.dataset['action'];
    const postId = target.dataset['postId'] ?? '';
    const threadId = target.dataset['threadId'] ?? '';
    const page = Number(target.dataset['page'] ?? 1);
    const tagId = target.dataset['tagId'] ?? '';

    switch (action) {
      case 'open-thread': {
        const tid = target.dataset['threadId'];
        if (tid) void this._loadThread(tid);
        break;
      }
      case 'new-thread':
        this._duplicates = [];
        this._isDuplicateChecking = false;
        this._navigateTo({ view: 'new-thread' });
        break;
      case 'back':
        this._wsUnsubscribe?.();
        this._wsUnsubscribe = null;
        this._replyTargetPostId = null;
        void this._loadThreadList(1, '').then(() => this._focusPreviousCard());
        break;
      case 'prev-page':
      case 'next-page': {
        const currentSearch =
          this._routerState.view === 'list' ? this._routerState.search : '';
        void this._loadThreadList(page, currentSearch);
        break;
      }
      case 'filter-tag':
        this._activeTagId = this._activeTagId === tagId ? null : tagId;
        void this._loadThreadList(1, '');
        break;
      case 'submit-post':
        void this._submitPost(target.dataset['parentPostId'] ?? null);
        break;
      case 'submit-thread':
        void this._submitThread();
        break;
      case 'react':
        void this._toggleReaction(postId, threadId, target.dataset['reactionType'] ?? '');
        break;
      case 'accept':
        void this._acceptAnswer(postId, threadId);
        break;
      case 'reply':
        this._replyTargetPostId = postId;
        this._render();
        requestAnimationFrame(() => {
          (this._shadow.getElementById(
            'fk-compose-input',
          ) as HTMLTextAreaElement | null)?.focus();
        });
        break;
      case 'ai-summarise':
        void this._runAI('summarise');
        break;
      case 'ai-suggest':
        void this._runAI('suggest');
        break;
      case 'jump-to-latest': {
        const last = this._shadow.querySelector('#fk-posts-list article:last-of-type');
        last?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        break;
      }
    }
  };

  private _onInput = (e: Event): void => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const action = (target as HTMLElement).dataset['action'];

    if (action === 'search-input') {
      if (this._searchDebounceTimer !== null) clearTimeout(this._searchDebounceTimer);
      const value = target.value;
      this._searchDebounceTimer = setTimeout(() => {
        void this._loadThreadList(1, value);
      }, 500);
    }

    if (action === 'thread-title-input') {
      if (this._duplicateDebounceTimer !== null) clearTimeout(this._duplicateDebounceTimer);
      const value = target.value;
      this._duplicateDebounceTimer = setTimeout(() => {
        void this._checkDuplicates(value);
      }, 500);
    }
  };

  private _onKeyDown = (e: Event): void => {
    const ke = e as KeyboardEvent;
    if (ke.key === 'Escape' && this._aiState.status !== 'idle') {
      this._aiState = { status: 'idle' };
      this._render();
      return;
    }
    const cardTarget = (ke.target as HTMLElement).closest<HTMLElement>(
      '[data-action="open-thread"]',
    );
    if (cardTarget && (ke.key === 'Enter' || ke.key === ' ')) {
      ke.preventDefault();
      const tid = cardTarget.dataset['threadId'];
      if (tid) void this._loadThread(tid);
    }
  };

  private async _checkDuplicates(title: string): Promise<void> {
    if (!this._client || title.length < 5) {
      this._duplicates = [];
      this._isDuplicateChecking = false;
      this._render();
      return;
    }
    this._isDuplicateChecking = true;
    this._render();
    try {
      this._duplicates = await this._client.findDuplicates(title);
    } catch {
      this._duplicates = [];
    }
    this._isDuplicateChecking = false;
    this._render();
  }

  private async _runAI(mode: 'summarise' | 'suggest'): Promise<void> {
    if (!this._client || this._routerState.view !== 'thread') return;
    const { threadId } = this._routerState;
    this._aiState = { status: 'loading', mode };
    this._render();
    try {
      const result =
        mode === 'summarise'
          ? await this._client.summarise(threadId)
          : await this._client.suggest(threadId);
      this._aiState = { status: 'done', result, mode };
    } catch {
      this._aiState = { status: 'error', message: 'AI unavailable. Try again later.' };
    }
    this._render();
  }

  private async _submitPost(parentPostId: string | null): Promise<void> {
    if (!this._client || this._routerState.view !== 'thread') return;
    const { threadId } = this._routerState;
    const textarea = this._shadow.querySelector<HTMLTextAreaElement>(
      '[data-action="compose-input"]',
    );
    const body = textarea?.value.trim() ?? '';
    if (!body) return;

    const submitBtn = this._shadow.querySelector<HTMLButtonElement>(
      '[data-action="submit-post"]',
    );
    if (submitBtn) submitBtn.disabled = true;

    try {
      const post = await this._client.createPost(threadId, {
        body,
        ...(parentPostId ? { parentPostId } : {}),
      });
      if (textarea) textarea.value = '';
      this._replyTargetPostId = null;
      // Push immediately as WS fallback; WS broadcast will deduplicate on next sync
      if (!this._currentPosts.some((p) => p.id === post.id)) {
        this._currentPosts = [...this._currentPosts, post];
      }
      this._render();
      requestAnimationFrame(() => {
        this._shadow
          .getElementById(`fk-post-${post.id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    } catch {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  private async _submitThread(): Promise<void> {
    if (!this._client) return;
    const titleEl = this._shadow.querySelector<HTMLInputElement>(
      '[data-action="thread-title-input"]',
    );
    const bodyEl = this._shadow.querySelector<HTMLTextAreaElement>(
      '[data-action="thread-body-input"]',
    );
    const title = titleEl?.value.trim() ?? '';
    const body = bodyEl?.value.trim() ?? '';
    if (!title || !body) return;

    const submitBtn = this._shadow.querySelector<HTMLButtonElement>(
      '[data-action="submit-thread"]',
    );
    if (submitBtn) submitBtn.disabled = true;

    try {
      const thread = await this._client.createThread({ title, body, tagIds: [] });
      await this._loadThread(thread.id);
    } catch {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  private async _toggleReaction(
    postId: string,
    threadId: string,
    reactionType: string,
  ): Promise<void> {
    if (!this._client) return;
    const validTypes = ['like', 'helpful', 'insightful', 'funny'] as const;
    type RT = (typeof validTypes)[number];
    if (!(validTypes as readonly string[]).includes(reactionType)) return;
    const type = reactionType as RT;

    const post = this._currentPosts.find((p) => p.id === postId);
    const alreadyReacted = (post?.reactionCounts[type] ?? 0) > 0;

    try {
      const updated = alreadyReacted
        ? await this._client.unreact(threadId, postId, type)
        : await this._client.react(threadId, postId, type);
      this._currentPosts = this._currentPosts.map((p) => (p.id === postId ? updated : p));
      this._render();
    } catch {
      // Silent; WS will sync state on next broadcast
    }
  }

  private async _acceptAnswer(postId: string, threadId: string): Promise<void> {
    if (!this._client) return;
    try {
      const updated = await this._client.acceptAnswer(threadId, postId);
      this._currentPosts = this._currentPosts.map((p) => {
        if (p.id === postId) return updated;
        if (p.isAcceptedAnswer) return { ...p, isAcceptedAnswer: false };
        return p;
      });
      this._render();
    } catch {
      // Silent; non-fatal
    }
  }
}

if (!customElements.get('forum-kit')) {
  customElements.define('forum-kit', ForumKitElement);
}
