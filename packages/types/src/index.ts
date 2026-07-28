// ── Enums ──────────────────────────────────────────────────────────

export type UserRole = 'member' | 'moderator' | 'admin';
export type ThreadStatus = 'open' | 'locked' | 'deleted';
export type PostStatus = 'visible' | 'hidden' | 'deleted';
export type ModerationStatus = 'pending' | 'approved' | 'removed';
export type ReactionType = 'like' | 'helpful' | 'insightful' | 'funny';
export type EmbeddingProvider = 'local' | 'openai';
export type ModerationProvider = 'local' | 'perspective';
export type AIProvider = 'local' | 'openai' | 'anthropic';
export type AttachmentStatus = 'pending' | 'confirmed' | 'deleted';
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
  title: string;
  body: string;
  status: ThreadStatus;
  pinned: boolean;
  viewCount: number;
  tags: Tag[];
  attachments?: AttachmentSummary[];
  postCount?: number;
  voteCounts?: VoteCounts;
  myVote?: VoteDirection | null;
  createdAt: Date;
  updatedAt: Date;
  // embedding is not included in API responses — internal only
};

export type Post = {
  id: string;
  threadId: string;
  authorId: string;
  authorDisplayName?: string;
  parentPostId: string | null;       // null = top-level reply
  body: string;
  status: PostStatus;
  toxicityScore: number | null;      // null until moderation completes
  isAcceptedAnswer: boolean;
  reactionCounts: Partial<Record<ReactionType, number>>;
  voteCounts?: VoteCounts;
  myVote?: VoteDirection | null;
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
  postId: string | null;             // null until attached to a post
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

// Minimal, display-ready shape embedded in Thread/Post responses —
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
  postId: string;
  userId: string;
  type: ReactionType;
  createdAt: Date;
};

export type ModerationQueueItem = {
  id: string;
  postId: string;
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
  attachmentIds?: string[] | undefined;
};

export type UpdateThreadBody = {
  title?: string;
  body?: string;
  tagIds?: string[];
};

export type CreatePostBody = {
  body: string;
  parentPostId?: string;
  attachmentIds?: string[];
};

export type UserProfile = {
  id: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  socialLinks: Array<{ platform: string; url: string }>;
};

export type UpdateProfileBody = {
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  socialLinks?: Array<{ platform: string; url: string }>;
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

export type UpdatePostBody = {
  body: string;
};

export type ThreadListQuery = {
  tagId?: string | undefined;
  sort?: 'latest' | 'oldest' | 'most_posts' | 'most_reactions' | undefined;
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

// ── Error response ─────────────────────────────────────────────────

export type ErrorResponse = {
  error: string;                     // machine-readable e.g. "thread_not_found"
  message: string;                   // human-readable explanation
  statusCode: number;
};

// ── WebSocket messages ─────────────────────────────────────────────

export type WSMessage =
  | { type: 'post.created'; payload: Post }
  | { type: 'post.updated'; payload: Post }
  | { type: 'post.deleted'; payload: { postId: string } }
  | { type: 'reaction.updated'; payload: { postId: string; reactionCounts: Partial<Record<ReactionType, number>> } }
  | { type: 'vote.updated'; payload: { targetType: 'thread' | 'post'; targetId: string; voteCounts: VoteCounts } };

// ── AI feature types ───────────────────────────────────────────────

export type SimilarThread = {
  id: string;
  title: string;
  similarity: number;                // 0-1
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
};
