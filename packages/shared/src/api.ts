import type {
  Thread, VoteCounts, VoteDirection, TopWindow, Comment, CreateThreadBody,
  NotificationListResponse, Draft, DraftContent, UserProfile, NotificationPrefs,
  UserRole, ErrorResponse,
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
