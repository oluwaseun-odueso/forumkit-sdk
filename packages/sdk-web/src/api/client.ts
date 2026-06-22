import type {
  ForumKitConfig,
  Thread,
  Tag,
  Post,
  SimilarThread,
  AISummary,
  AISuggestion,
  WSMessage,
  ReactionType,
  CreateThreadBody,
  CreatePostBody,
  ThreadListQuery,
} from '@forumkit/types';

export type ThreadWithMetaData = Thread & { postCount: number; reactionCount: number };

type SessionResponse = {
  sessionToken: string;
  userId: string;
  role: string;
  expiresIn: number;
};

type ThreadListResponse = {
  threads: ThreadWithMetaData[];
  total: number;
  page: number;
  limit: number;
};

type ThreadDetailResponse = {
  thread: ThreadWithMetaData;
  posts: Post[];
};

type SearchResponse = {
  results: Thread[];
  total: number;
  page: number;
  limit: number;
  mode: 'semantic' | 'keyword';
};

type ApiError = {
  statusCode: number;
  error: string;
  message: string;
};

export class ForumKitClient {
  private _sessionToken: string | null = null;
  // Empty until init() resolves; only accessed after init() has been awaited
  private _userId = '';
  private _initPromise: Promise<void> | null = null;
  private _lastHostToken = '';

  constructor(private readonly _config: ForumKitConfig) {}

  async init(): Promise<void> {
    if (this._initPromise && this._lastHostToken === this._config.token) {
      return this._initPromise;
    }
    this._lastHostToken = this._config.token;
    this._initPromise = this._doInit();
    return this._initPromise;
  }

  private async _doInit(): Promise<void> {
    const res = await fetch(`${this._apiBase()}/auth/session`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this._config.token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Partial<ApiError>;
      throw new Error(body.message ?? 'ForumKit: session exchange failed');
    }
    const data = await res.json() as SessionResponse;
    this._sessionToken = data.sessionToken;
    this._userId = data.userId;
  }

  get userId(): string { return this._userId; }

  private _apiBase(): string {
    return (this._config.apiUrl ?? '').replace(/\/$/, '');
  }

  private async _request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this._apiBase()}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(this._sessionToken ? { authorization: `Bearer ${this._sessionToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      this._initPromise = null;
      await this.init();
      return this._request<T>(method, path, body);
    }

    if (res.status === 204) return undefined as T;

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Partial<ApiError>;
      const e = new Error(err.message ?? `Request failed: ${res.status}`);
      (e as Error & { statusCode: number; code: string }).statusCode = err.statusCode ?? res.status;
      (e as Error & { statusCode: number; code: string }).code = err.error ?? 'unknown_error';
      throw e;
    }

    return res.json() as Promise<T>;
  }

  async listThreads(opts: ThreadListQuery = {}): Promise<ThreadListResponse> {
    const params = new URLSearchParams();
    if (opts.page !== undefined) params.set('page', String(opts.page));
    if (opts.limit !== undefined) params.set('limit', String(opts.limit));
    if (opts.sort !== undefined) params.set('sort', opts.sort);
    if (opts.tagId !== undefined) params.set('tagId', opts.tagId);
    const qs = params.toString();
    return this._request<ThreadListResponse>(
      'GET',
      `/forums/${this._config.forumId}/threads${qs ? `?${qs}` : ''}`,
    );
  }

  async getThread(threadId: string): Promise<ThreadDetailResponse> {
    return this._request<ThreadDetailResponse>(
      'GET',
      `/forums/${this._config.forumId}/threads/${threadId}`,
    );
  }

  async createThread(body: CreateThreadBody): Promise<ThreadWithMetaData> {
    return this._request<ThreadWithMetaData>(
      'POST',
      `/forums/${this._config.forumId}/threads`,
      body,
    );
  }

  async createPost(threadId: string, body: CreatePostBody): Promise<Post> {
    return this._request<Post>('POST', `/threads/${threadId}/posts`, body);
  }

  async react(threadId: string, postId: string, type: ReactionType): Promise<Post> {
    return this._request<Post>('POST', `/threads/${threadId}/posts/${postId}/react`, { type });
  }

  async unreact(threadId: string, postId: string, type: ReactionType): Promise<Post> {
    return this._request<Post>('DELETE', `/threads/${threadId}/posts/${postId}/react`, { type });
  }

  async acceptAnswer(threadId: string, postId: string): Promise<Post> {
    return this._request<Post>('POST', `/threads/${threadId}/posts/${postId}/accept`);
  }

  async search(q: string, page = 1): Promise<SearchResponse> {
    const params = new URLSearchParams({ q, page: String(page) });
    return this._request<SearchResponse>(
      'GET',
      `/forums/${this._config.forumId}/search?${params.toString()}`,
    );
  }

  async findDuplicates(title: string): Promise<SimilarThread[]> {
    const params = new URLSearchParams({ title });
    return this._request<SimilarThread[]>(
      'GET',
      `/forums/${this._config.forumId}/threads/duplicates?${params.toString()}`,
    );
  }

  async summarise(threadId: string): Promise<AISummary> {
    const res = await this._request<{ summary: AISummary }>(
      'POST',
      `/threads/${threadId}/ai/summarise`,
    );
    return res.summary;
  }

  async suggest(threadId: string): Promise<AISuggestion> {
    const res = await this._request<{ suggestion: AISuggestion }>(
      'POST',
      `/threads/${threadId}/ai/suggest`,
    );
    return res.suggestion;
  }

  async listTags(): Promise<Tag[]> {
    return this._request<Tag[]>('GET', `/forums/${this._config.forumId}/tags`);
  }

  subscribeToThread(threadId: string, onMessage: (msg: WSMessage) => void): () => void {
    const url = this._buildWsUrl(`/threads/${threadId}/ws`);
    const ws = new WebSocket(url);

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as WSMessage;
        onMessage(msg);
      } catch {
        // Ignore malformed messages
      }
    };

    return () => { ws.close(); };
  }

  private _buildWsUrl(path: string): string {
    const base = (this._config.apiUrl ?? '') || window.location.origin;
    return base.replace(/^http/, 'ws') + path;
  }
}
