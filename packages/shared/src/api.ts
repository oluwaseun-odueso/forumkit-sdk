import type {
  Thread, VoteCounts, VoteDirection, TopWindow, Comment, CreateThreadBody,
  NotificationListResponse, Draft, DraftContent, UserProfile, NotificationPrefs,
  UserRole, ErrorResponse, UpdateThreadBody, UpdateProfileBody, SearchResponse,
  SearchResult, UserSearchResult, GifResult, Attachment, AttachmentPurpose,
  UploadUrlResponse, ProfileActivityScope, ProfileActivitySort,
  ProfileActivityContentType, ProfileActivityItem, ModerationQueueItem,
} from '@forumkit/types';

// Platform-agnostic ForumKit API client — the single source of truth for the
// endpoints both SDKs share. Every function takes `apiUrl` explicitly (there's
// no window in React Native). sdk-web's api/auth.ts, api/threads.ts and
// api/votes.ts are thin wrappers that pass window.FK_API_URL as `apiUrl` and
// keep their existing signatures; the mobile SDK calls these directly with its
// config.apiUrl.

export function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function okJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function okVoid(res: Response): Promise<void> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Like okJson but surfaces the API's human-readable error message (mirrors
// web's unwrapThread/unwrap in api/threads.ts + comments.ts) — used by the
// create/reply endpoints where the message matters to the user.
async function unwrapJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const message = await res
      .json()
      .then((data: ErrorResponse) => data.message)
      .catch(() => undefined);
    throw new Error(message ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

// Manual query builder rather than URLSearchParams — the latter's React Native
// (Hermes) polyfill has historically been incomplete, and this keeps the shared
// client identical across both runtimes.
function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

// ── Session ────────────────────────────────────────────────────────

export type CreateSessionResult = {
  sessionToken: string;
  userId: string;
  role: string;
  expiresIn: number;
};

export async function createSession(apiUrl: string, hostToken: string): Promise<CreateSessionResult> {
  const res = await fetch(`${apiUrl}/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({ token: hostToken }),
  });
  return okJson<CreateSessionResult>(res);
}

// ── Threads ────────────────────────────────────────────────────────

export type ListThreadsParams = {
  sort?: 'best' | 'hot' | 'new' | 'top' | 'rising' | undefined;
  tagId?: string | undefined;
  tagName?: string | undefined;
  pinned?: boolean | undefined;
  topWindow?: TopWindow | undefined;
  limit?: number | undefined;
  page?: number | undefined;
};

export type ListThreadsResult = { threads: Thread[]; total: number; page: number; limit: number };

export async function listThreads(
  apiUrl: string,
  forumId: string,
  token?: string,
  params?: ListThreadsParams,
): Promise<ListThreadsResult> {
  const suffix = buildQuery({
    sort: params?.sort,
    tagId: params?.tagId,
    tagName: params?.tagName,
    pinned: params?.pinned,
    topWindow: params?.topWindow,
    limit: params?.limit,
    page: params?.page,
  });
  const res = await fetch(`${apiUrl}/forums/${forumId}/threads${suffix}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
  });
  return okJson<ListThreadsResult>(res);
}

export async function saveThread(apiUrl: string, forumId: string, threadId: string, token?: string): Promise<void> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/threads/${threadId}/save`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  return okVoid(res);
}

export async function unsaveThread(apiUrl: string, forumId: string, threadId: string, token?: string): Promise<void> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/threads/${threadId}/save`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return okVoid(res);
}

export async function reportThread(
  apiUrl: string,
  forumId: string,
  threadId: string,
  reason: string,
  token?: string,
): Promise<void> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/threads/${threadId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ reason }),
  });
  return okVoid(res);
}

// ── Votes ──────────────────────────────────────────────────────────

export type VoteResult = { voteCounts: VoteCounts; myVote: VoteDirection | null };

export async function voteOnThread(
  apiUrl: string,
  forumId: string,
  threadId: string,
  direction: VoteDirection,
  token?: string,
): Promise<VoteResult> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/threads/${threadId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ direction }),
  });
  return okJson<VoteResult>(res);
}

export async function removeVoteFromThread(
  apiUrl: string,
  forumId: string,
  threadId: string,
  token?: string,
): Promise<VoteResult> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/threads/${threadId}/vote`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return okJson<VoteResult>(res);
}

// ── Thread detail + create ─────────────────────────────────────────

export type GetThreadResult = { thread: Thread; comments: Comment[] };

export async function getThread(
  apiUrl: string,
  forumId: string,
  threadId: string,
  token?: string,
): Promise<GetThreadResult> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/threads/${threadId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
  });
  return okJson<GetThreadResult>(res);
}

export async function createThread(
  apiUrl: string,
  forumId: string,
  body: CreateThreadBody,
  token?: string,
): Promise<Thread> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  return unwrapJson<Thread>(res);
}

// ── Comments ───────────────────────────────────────────────────────

export type CreateReplyBody = { body: string; parentCommentId?: string | undefined; attachmentIds?: string[] | undefined };

export async function createReply(
  apiUrl: string,
  threadId: string,
  body: CreateReplyBody,
  token?: string,
): Promise<Comment> {
  const res = await fetch(`${apiUrl}/threads/${threadId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  return unwrapJson<Comment>(res);
}

export async function saveComment(apiUrl: string, threadId: string, commentId: string, token?: string): Promise<void> {
  const res = await fetch(`${apiUrl}/threads/${threadId}/comments/${commentId}/save`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  return okVoid(res);
}

export async function unsaveComment(apiUrl: string, threadId: string, commentId: string, token?: string): Promise<void> {
  const res = await fetch(`${apiUrl}/threads/${threadId}/comments/${commentId}/save`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return okVoid(res);
}

export async function reportComment(
  apiUrl: string,
  threadId: string,
  commentId: string,
  reason: string,
  token?: string,
): Promise<void> {
  const res = await fetch(`${apiUrl}/threads/${threadId}/comments/${commentId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ reason }),
  });
  return okVoid(res);
}

export async function voteOnComment(
  apiUrl: string,
  threadId: string,
  commentId: string,
  direction: VoteDirection,
  token?: string,
): Promise<VoteResult> {
  const res = await fetch(`${apiUrl}/threads/${threadId}/comments/${commentId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ direction }),
  });
  return okJson<VoteResult>(res);
}

export async function removeVoteFromComment(
  apiUrl: string,
  threadId: string,
  commentId: string,
  token?: string,
): Promise<VoteResult> {
  const res = await fetch(`${apiUrl}/threads/${threadId}/comments/${commentId}/vote`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return okJson<VoteResult>(res);
}

// ── Notifications ──────────────────────────────────────────────────

export type NotificationsOpts = { page?: number | undefined; limit?: number | undefined };

export async function listNotifications(
  apiUrl: string,
  forumId: string,
  opts: NotificationsOpts | undefined,
  token?: string,
): Promise<NotificationListResponse> {
  const suffix = buildQuery({ page: opts?.page, limit: opts?.limit });
  const res = await fetch(`${apiUrl}/forums/${forumId}/notifications${suffix}`, {
    headers: authHeaders(token),
  });
  return okJson<NotificationListResponse>(res);
}

export async function markNotificationRead(apiUrl: string, forumId: string, id: string, token?: string): Promise<void> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
  return okVoid(res);
}

export async function markAllNotificationsRead(apiUrl: string, forumId: string, token?: string): Promise<void> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/notifications/read-all`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
  return okVoid(res);
}

export async function deleteNotification(apiUrl: string, forumId: string, id: string, token?: string): Promise<void> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/notifications/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return okVoid(res);
}

// ── Drafts ─────────────────────────────────────────────────────────

export async function createDraft(
  apiUrl: string,
  forumId: string,
  title: string,
  content: DraftContent,
  token?: string,
): Promise<Draft> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ title, content }),
  });
  return unwrapJson<Draft>(res);
}

// ── Profile ────────────────────────────────────────────────────────

// GET /me returns notificationPrefs + role alongside the shared UserProfile
// fields (mirrors web's MyProfile in api/profile.ts).
export type MyProfile = UserProfile & { notificationPrefs: NotificationPrefs; role: UserRole };

export async function getMyProfile(apiUrl: string, forumId: string, token?: string): Promise<MyProfile | null> {
  try {
    const res = await fetch(`${apiUrl}/forums/${forumId}/me`, { headers: authHeaders(token) });
    if (!res.ok) return null;
    return (await res.json()) as MyProfile;
  } catch {
    return null;
  }
}

export async function updateMyProfile(
  apiUrl: string,
  forumId: string,
  body: UpdateProfileBody,
  token?: string,
): Promise<UserProfile> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  return unwrapJson<UserProfile>(res);
}

export async function updateNotificationPrefs(
  apiUrl: string,
  forumId: string,
  prefs: NotificationPrefs,
  token?: string,
): Promise<void> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/me/notification-prefs`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(prefs),
  });
  return okVoid(res);
}

export type ProfileActivityResult = { items: ProfileActivityItem[]; total: number; page: number; limit: number };

export async function getProfileActivity(
  apiUrl: string,
  forumId: string,
  scope: ProfileActivityScope,
  page: number,
  limit: number,
  sort: ProfileActivitySort,
  contentType: ProfileActivityContentType,
  token?: string,
): Promise<ProfileActivityResult> {
  const suffix = buildQuery({ scope, page, limit, sort, contentType });
  const res = await fetch(`${apiUrl}/forums/${forumId}/me/activity${suffix}`, { headers: authHeaders(token) });
  return okJson<ProfileActivityResult>(res);
}

// ── Comments (edit / delete / accept) ──────────────────────────────

export async function updateReply(apiUrl: string, threadId: string, commentId: string, body: string, token?: string): Promise<Comment> {
  const res = await fetch(`${apiUrl}/threads/${threadId}/comments/${commentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ body }),
  });
  return unwrapJson<Comment>(res);
}

export async function deleteComment(apiUrl: string, threadId: string, commentId: string, token?: string): Promise<void> {
  const res = await fetch(`${apiUrl}/threads/${threadId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return okVoid(res);
}

export async function acceptAnswer(apiUrl: string, threadId: string, commentId: string, token?: string): Promise<Comment> {
  const res = await fetch(`${apiUrl}/threads/${threadId}/comments/${commentId}/accept`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  return unwrapJson<Comment>(res);
}

export async function unacceptAnswer(apiUrl: string, threadId: string, commentId: string, token?: string): Promise<Comment> {
  const res = await fetch(`${apiUrl}/threads/${threadId}/comments/${commentId}/accept`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return unwrapJson<Comment>(res);
}

// ── Threads (edit / delete / share) ────────────────────────────────

export async function updateThread(
  apiUrl: string,
  forumId: string,
  threadId: string,
  body: UpdateThreadBody,
  token?: string,
): Promise<Thread> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/threads/${threadId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  return unwrapJson<Thread>(res);
}

export async function deleteThread(apiUrl: string, forumId: string, threadId: string, token?: string): Promise<void> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/threads/${threadId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return okVoid(res);
}

export async function shareThreadWithUsers(
  apiUrl: string,
  forumId: string,
  threadId: string,
  recipientUserIds: string[],
  message: string | undefined,
  token?: string,
): Promise<void> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/threads/${threadId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ recipientUserIds, message }),
  });
  return okVoid(res);
}

// ── Attachments (upload-url + confirm + delete; raw PUT is platform-specific) ──

export async function requestUploadUrl(
  apiUrl: string,
  forumId: string,
  opts: { filename: string; mimeType: string; byteSize: number; purpose: AttachmentPurpose },
  token?: string,
): Promise<UploadUrlResponse> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/attachments/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(opts),
  });
  return okJson<UploadUrlResponse>(res);
}

export async function confirmUpload(
  apiUrl: string,
  forumId: string,
  attachmentId: string,
  dimensions: { width: number | null; height: number | null },
  token?: string,
): Promise<Attachment & { downloadUrl: string }> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/attachments/${attachmentId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(dimensions),
  });
  return okJson<Attachment & { downloadUrl: string }>(res);
}

export async function deleteAttachment(apiUrl: string, forumId: string, attachmentId: string, token?: string): Promise<void> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return okVoid(res);
}

// ── GIFs (GIPHY proxy) ─────────────────────────────────────────────

// Distinguishes "the forum owner hasn't set a GIPHY key yet" (recoverable — the
// picker shows a friendly message) from a real failure.
export class GifSearchNotConfiguredError extends Error {}

export async function searchGifs(apiUrl: string, forumId: string, query: string, token?: string, limit = 24): Promise<GifResult[]> {
  const suffix = buildQuery({ q: query, limit });
  const res = await fetch(`${apiUrl}/forums/${forumId}/gifs/search${suffix}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
  });
  if (res.status === 503) throw new GifSearchNotConfiguredError('GIF search is not configured for this forum yet.');
  const body = await okJson<{ results: GifResult[] }>(res);
  return body.results;
}

// ── Search ─────────────────────────────────────────────────────────

export type SearchOpts = { page?: number | undefined; limit?: number | undefined };

export async function searchThreads(
  apiUrl: string,
  forumId: string,
  q: string,
  opts?: SearchOpts,
  token?: string,
): Promise<SearchResponse<SearchResult>> {
  const suffix = buildQuery({ q, page: opts?.page, limit: opts?.limit });
  const res = await fetch(`${apiUrl}/forums/${forumId}/search${suffix}`, { headers: authHeaders(token) });
  return okJson<SearchResponse<SearchResult>>(res);
}

export type UserSearchListResult = { results: UserSearchResult[]; total: number; page: number; limit: number };

export async function searchUsers(
  apiUrl: string,
  forumId: string,
  q: string,
  opts?: SearchOpts,
  token?: string,
): Promise<UserSearchListResult> {
  const suffix = buildQuery({ q, page: opts?.page, limit: opts?.limit });
  const res = await fetch(`${apiUrl}/forums/${forumId}/search/users${suffix}`, { headers: authHeaders(token) });
  return okJson<UserSearchListResult>(res);
}

// ── Drafts (list / get / delete / update; createDraft is above) ────

export async function listDrafts(apiUrl: string, forumId: string, token?: string): Promise<Draft[]> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/drafts`, { headers: authHeaders(token) });
  const data = await okJson<{ drafts: Draft[] }>(res);
  return data.drafts;
}

export async function getDraft(apiUrl: string, forumId: string, draftId: string, token?: string): Promise<Draft> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/drafts/${draftId}`, { headers: authHeaders(token) });
  return okJson<Draft>(res);
}

export async function updateDraft(
  apiUrl: string,
  forumId: string,
  draftId: string,
  fields: { title?: string; content?: DraftContent },
  token?: string,
): Promise<Draft> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/drafts/${draftId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(fields),
  });
  return unwrapJson<Draft>(res);
}

export async function deleteDraft(apiUrl: string, forumId: string, draftId: string, token?: string): Promise<void> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/drafts/${draftId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return okVoid(res);
}

// ── Moderation (admin/moderator only; not forum-scoped in the URL — the
// backend derives the forum from the authenticated session) ──────────

export type ModerationQueueResult = { items: ModerationQueueItem[]; total: number; page: number; limit: number };

export async function getModerationQueue(
  apiUrl: string,
  params?: { page?: number; limit?: number },
  token?: string,
): Promise<ModerationQueueResult> {
  const suffix = buildQuery({ page: params?.page, limit: params?.limit });
  const res = await fetch(`${apiUrl}/moderation/queue${suffix}`, { headers: authHeaders(token) });
  return unwrapJson<ModerationQueueResult>(res);
}

export async function resolveModerationItem(
  apiUrl: string,
  itemId: string,
  action: 'approved' | 'removed',
  token?: string,
): Promise<ModerationQueueItem> {
  const res = await fetch(`${apiUrl}/moderation/queue/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ action }),
  });
  return unwrapJson<ModerationQueueItem>(res);
}
