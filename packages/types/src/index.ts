// ── Enums ──────────────────────────────────────────────────────────

export type UserRole = 'member' | 'moderator' | 'admin';
export type ThreadStatus = 'open' | 'locked' | 'deleted';
export type CommentStatus = 'visible' | 'hidden' | 'deleted';
export type ModerationStatus = 'pending' | 'approved' | 'removed';
export type ReactionType = 'like' | 'helpful' | 'insightful' | 'funny';
export type EmbeddingProvider = 'local' | 'openai';
export type ModerationProvider = 'local' | 'perspective';
export type AIProvider = 'local' | 'openai' | 'anthropic';
export type AttachmentStatus = 'pending' | 'confirmed' | 'deleted';
// Chooses which storage path an upload lands under (see buildStorageKey in
// packages/api/src/services/storage.ts) — avatars, banners, and post/comment
// attachments are kept in separate prefixes within a forum's bucket space.
export type AttachmentPurpose = 'avatar' | 'banner' | 'attachment';
export type VoteDirection = 1 | -1;

// ── Core entities ──────────────────────────────────────────────────

export type Forum = {
  id: string;
  name: string;
  ownerId: string;
  config: ForumConfig;
  createdAt: Date;
};

export type ForumConfig = {
  isPublic: boolean;                 // false by default — true = anyone can read without a token
  moderationThreshold: number;       // 0-1, posts above this are auto-hidden
  moderationReviewThreshold: number; // 0-1, posts above this are flagged for review
  aiEnabled: boolean;
  maxPostLength: number;
  requireApproval: boolean;
  newsTagName?: string;               // tag name backing the sidebar's "News" scope; falls back to "news"
};

export type User = {
  id: string;
  externalId: string;                // ID from the host application's JWT
  forumId: string;
  displayName: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  bannedAt: Date | null;
  bannedReason: string | null;
};

export type Thread = {
  id: string;
  forumId: string;
  authorId: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string | null;
  title: string;
  body: string;
  status: ThreadStatus;
  pinned: boolean;
  viewCount: number;
  tags: Tag[];
  attachments?: AttachmentSummary[];
  commentCount?: number;
  voteCounts?: VoteCounts;
  myVote?: VoteDirection | null;
  isSaved?: boolean;
  createdAt: Date;
  updatedAt: Date;
  // embedding is not included in API responses — internal only
};

export type Comment = {
  id: string;
  threadId: string;
  authorId: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string | null;
  parentCommentId: string | null;    // null = top-level reply
  body: string;
  status: CommentStatus;
  toxicityScore: number | null;      // null until moderation completes
  isAcceptedAnswer: boolean;
  reactionCounts: Partial<Record<ReactionType, number>>;
  voteCounts?: VoteCounts;
  myVote?: VoteDirection | null;
  isSaved?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Tag = {
  id: string;
  forumId: string;
  name: string;
  description: string;
  color: string;                     // hex colour e.g. "#6200EE"
};

export type Attachment = {
  id: string;
  forumId: string;
  commentId: string | null;          // null until attached to a comment
  threadId: string | null;           // null until attached to a thread
  uploaderId: string;
  storageKey: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  status: AttachmentStatus;
  createdAt: Date;
};

// Minimal, display-ready shape embedded in Thread/Comment responses —
// storageKey is internal only, never sent to clients directly.
export type AttachmentSummary = {
  id: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  downloadUrl: string;
};

export type VoteCounts = {
  up: number;
  down: number;
};

export type Reaction = {
  id: string;
  commentId: string;
  userId: string;
  type: ReactionType;
  createdAt: Date;
};

export type ModerationQueueItem = {
  id: string;
  commentId: string;
  reporterId: string | null;
  reason: string;
  aiScore: number;
  aiFlags: string[];
  status: ModerationStatus;
  reviewerId: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
};

// ── JWT payload (from host application) ───────────────────────────

export type HostJWTPayload = {
  sub: string;                       // host app's user ID
  name: string;
  email: string;
  role: UserRole;
  forumId: string;
  iat: number;
  exp: number;
};

export type SessionTokenPayload = {
  sub: string;                       // external_id (host app user ID)
  forumId: string;
  role: UserRole;
  iss: 'forumkit';
  iat: number;
  exp: number;
};

// Minimal shape available on request.jwtPayload for both host JWT and session token
export type AuthPayload = {
  sub: string;
  forumId: string;
  role: UserRole;
};

// ── API request / response shapes ─────────────────────────────────

export type CreateThreadBody = {
  title: string;
  body: string;
  tagIds: string[];
  tagNames?: string[] | undefined;
  attachmentIds?: string[] | undefined;
};

export type UpdateThreadBody = {
  title?: string;
  body?: string;
  tagIds?: string[];
};

export type CreateCommentBody = {
  body: string;
  parentCommentId?: string;
  attachmentIds?: string[];
};

export type UserProfile = {
  id: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  socialLinks: Array<{ platform: string; url: string }>;
  joinedAt: Date;
  postKarma: number;
  commentKarma: number;
  themePreference: 'light' | 'dark' | null;
};

export type UpdateProfileBody = {
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  socialLinks?: Array<{ platform: string; url: string }>;
};

export type UpdateThemePreferenceBody = {
  themePreference: 'light' | 'dark' | null;
};

// ── Profile activity feed (Overview/Posts/Comments/Saved/Upvoted/Downvoted) ──

export type ProfileActivityScope = 'overview' | 'posts' | 'comments' | 'saved' | 'upvoted' | 'downvoted';
export type ProfileActivitySort = 'new' | 'top';
export type ProfileActivityContentType = 'all' | 'posts' | 'comments';

export type ProfileActivityItem =
  | { kind: 'thread'; thread: Thread }
  | {
      kind: 'comment';
      comment: Comment;
      threadId: string;
      threadTitle: string;
      replyingTo?: { author: string; snippet: string };
    };

export type UploadUrlRequest = {
  filename: string;
  mimeType: string;
  byteSize: number;
};

export type UploadUrlResponse = {
  attachmentId: string;
  uploadUrl: string;
  uploadMethod: 'PUT';
  uploadHeaders: Record<string, string>;
  expiresAt: string;                 // ISO timestamp
};

export type UpdateCommentBody = {
  body: string;
};

// ── Composer drafts ─────────────────────────────────────────────────

// Mirrors the composer's persistable fields — excludes transient UI state
// (upload/generation-in-progress flags, local preview data: URLs) since
// those can't or shouldn't survive a resume.
export type DraftContent = {
  activeTab: 'text' | 'images' | 'link';
  tags: string;
  body: string;
  linkUrl: string;
  attachments: Array<{
    attachmentId: string;
    attachmentUrl: string;
    caption: string;
    kind: 'image' | 'video' | 'file';
    name: string;
    sizeLabel: string;
  }>;
};

export type Draft = {
  id: string;
  userId: string;
  forumId: string;
  title: string;
  content: DraftContent;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateDraftBody = {
  title: string;
  content: DraftContent;
};

export type UpdateDraftBody = {
  title?: string;
  content?: DraftContent;
};

export type TopWindow = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

export type ThreadListQuery = {
  tagId?: string | undefined;
  tagName?: string | undefined;
  pinned?: boolean | undefined;
  sort?: 'best' | 'hot' | 'new' | 'top' | 'rising' | 'oldest' | 'latest' | undefined;
  topWindow?: TopWindow | undefined;
  page?: number | undefined;
  limit?: number | undefined;
};

export type SearchQuery = {
  q: string;
  mode?: 'keyword' | 'semantic';
  tagId?: string;
  page?: number;
  limit?: number;
};

// A single matching thread from GET /forums/:forumId/search — bodySnippet is
// a truncated preview (not the full body), and rank is whichever score
// (full-text or fuzzy trigram) matched best for that row, higher = better.
export type SearchResult = {
  threadId: string;
  title: string;
  bodySnippet: string;
  // The thread's first image attachment, if it has one — null otherwise.
  // Lets the search dropdown/results page show a thumbnail, same as the
  // compact post-card view does on the feed.
  imageUrl: string | null;
  // Total image attachments on the thread — lets the Media tab show a
  // "1/N" counter badge on tiles from a multi-image post, same as a
  // gallery-post carousel indicator.
  mediaCount: number;
  // Lets the results page show "N votes · N comments" under each thread
  // result, same as the feed's compact PostCard view.
  voteCounts: VoteCounts;
  commentCount: number;
  authorId: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  rank: number;
  createdAt: Date;
};

// Same idea for GET /forums/:forumId/search/comments (forum-wide) and
// GET /threads/:threadId/comments/search (thread-scoped) — threadTitle is
// included because a bare comment snippet is meaningless without knowing
// which post it's replying to. imageUrl here is the parent thread's image
// (a comment can't have its own attachment), for the same reason.
export type CommentSearchResult = {
  commentId: string;
  threadId: string;
  threadTitle: string;
  bodySnippet: string;
  imageUrl: string | null;
  mediaCount: number;
  // Who wrote the comment — shown inside the comment's own "card" in the
  // results-page row.
  authorId: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  commentVoteCounts: VoteCounts;
  // The thread's original poster and stats — shown above the comment card,
  // since a search hit on a comment is presented in the context of "who
  // started this thread, and how is it doing overall" first.
  threadAuthorId: string;
  threadAuthorDisplayName: string;
  threadAuthorAvatarUrl: string | null;
  threadVoteCounts: VoteCounts;
  threadCommentCount: number;
  rank: number;
  createdAt: Date;
};

// mode tells the client which search strategies actually ran: 'hybrid' means
// semantic (pgvector embedding similarity, matches by meaning) and keyword
// (full-text + fuzzy trigram, matches by spelling/typo-tolerance) both ran
// and were merged into one ranked list; 'keyword' means only keyword+fuzzy
// ran, because generating an embedding for the query failed (e.g. no AI
// provider configured) — the server decides this automatically, the client
// doesn't choose.
export type SearchResponse<T> = {
  results: T[];
  total: number;
  page: number;
  limit: number;
  mode: 'hybrid' | 'keyword';
};

// The `notifications.type` column is plain TEXT in Postgres (not an ENUM,
// which is annoying to extend) — but that doesn't mean the TypeScript side
// needs to be a loose `string` too. A real union costs nothing in migration
// terms and buys typo-catching + exhaustiveness checking wherever a type is
// mapped to display text; adding a future trigger is one more literal here.
export type NotificationType = 'share' | 'comment_reply' | 'vote';

// One row per event a user should see on the Notifications page.
export type Notification = {
  id: string;
  forumId: string;
  userId: string;
  actorId: string | null;
  actorDisplayName: string | null;
  actorAvatarUrl: string | null;
  type: NotificationType;
  threadId: string | null;
  commentId: string | null;
  // Only meaningful for type: 'vote' today ('up' | 'down') — kept as a
  // plain nullable string rather than a second typed field, since it's
  // genuinely just "extra type-specific detail," not a first-class column
  // every notification has an opinion about.
  message: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export type NotificationListResponse = {
  results: Notification[];
  total: number;
  page: number;
  limit: number;
};

export type NotificationPrefs = {
  commentReply: boolean;
  share: boolean;
  vote: boolean;
};

// GET /forums/:forumId/search/users — People section of the search results
// page. Fuzzy-only (trigram similarity on display_name), no semantic mode:
// a display name is one short string, not a document worth embedding.
export type UserSearchResult = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  // Post karma + comment karma combined, shown under the name in the
  // People section — same "karma" concept as the profile page's two
  // separate stats, just summed for a compact list row.
  karma: number;
};

// ── Error response ─────────────────────────────────────────────────

export type ErrorResponse = {
  error: string;                     // machine-readable e.g. "thread_not_found"
  message: string;                   // human-readable explanation
  statusCode: number;
};

// ── WebSocket messages ─────────────────────────────────────────────

export type WSMessage =
  | { type: 'comment.created'; payload: Comment }
  | { type: 'comment.updated'; payload: Comment }
  | { type: 'comment.deleted'; payload: { commentId: string } }
  | { type: 'reaction.updated'; payload: { commentId: string; reactionCounts: Partial<Record<ReactionType, number>> } }
  | { type: 'vote.updated'; payload: { targetType: 'thread' | 'comment'; targetId: string; voteCounts: VoteCounts } };

// ── AI feature types ───────────────────────────────────────────────

export type SimilarThread = {
  id: string;
  title: string;
  similarity: number;                // 0-1
};

// Enriched similar-thread shape for the right rail — needs enough fields to
// build a full RailItem (votes/comment-count/time), unlike SimilarThread
// above which only backs the manual AI assistant panel's simpler list.
export type RelatedThreadForRail = {
  id: string;
  title: string;
  createdAt: Date;
  commentCount: number;
  voteCounts: VoteCounts;
  similarity: number;
  imageUrl: string | null;
  authorId: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
};

export type AISummary = {
  keyPoints: string[];
  conclusion: string;
  openQuestions: string[];
};

export type AISuggestion = {
  suggestion: string;
  confidence: 'high' | 'medium' | 'low';
  caveats: string[];
};

// ── Theme tokens (SDK) ─────────────────────────────────────────────

export type ThemeTokens = {
  primaryColor?: string;
  primaryColorHover?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  borderColor?: string;
  textPrimary?: string;
  textSecondary?: string;
  fontFamily?: string;
  fontSize?: string;
  borderRadius?: string;
  spacing?: string;
  shadowLevel?: 'none' | 'sm' | 'md' | 'lg';
};

// ── SDK init config ────────────────────────────────────────────────

export type ForumKitConfig = {
  forumId: string;
  token: string;                     // signed JWT from host application
  theme?: ThemeTokens;
  apiUrl?: string;                   // defaults to same origin
  onLogout?: () => void;             // host owns the real sign-out flow; if provided, the
                                      // account menu shows a "Log Out" item that calls this.
                                      // Omitted entirely (no dead button) if not provided.
  // 'web': Share offers both a copyable link and in-app member sharing.
  // 'native': Share skips the link (nowhere meaningful to paste one inside
  // a native app shell) and goes straight to in-app member sharing.
  // Declared explicitly by the host, not auto-detected — there's no
  // reliable runtime signal for "am I inside a native app" today.
  platform?: 'web' | 'native';       // defaults to 'web'
};
