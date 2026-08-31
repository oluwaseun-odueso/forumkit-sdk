// A stable URL requires no signing to construct, unlike a presigned S3 GET
// URL — safe to embed permanently in stored content or return eagerly for
// every attachment on a feed page. The actual signed URL is resolved lazily,
// only when a browser follows the redirect at GET .../attachments/:id/raw.
export function rawAttachmentUrl(publicApiUrl: string, forumId: string, attachmentId: string): string {
  return `${publicApiUrl}/forums/${forumId}/attachments/${attachmentId}/raw`;
}

// ── Avatar/banner URLs ──────────────────────────────────────────────────
//
// Post/comment attachment URLs (above) are never persisted — they're built
// fresh on every response from publicApiUrl, so a PUBLIC_API_URL change
// takes effect immediately. Avatar/banner URLs used to be the odd one out:
// PATCH /me stored the *fully resolved* URL a client had just been handed
// (which itself came from rawAttachmentUrl at upload-confirm time), baking
// that request's publicApiUrl permanently into the users table. Any later
// PUBLIC_API_URL change (new LAN IP, a real domain at deploy time, ...)
// silently broke every existing avatar/banner until either a manual data
// fix or a re-upload.
//
// These two helpers close that gap the same way post/comment attachments
// already avoid it: store just the path, resolve it against the *current*
// publicApiUrl on every read.

// Strips a same-origin ForumKit attachment URL down to just its path before
// persisting (called from the PATCH /me handler). A non-ForumKit URL (an
// avatar sourced from somewhere else entirely, or a pre-migration row from
// before this helper existed) has no publicApiUrl prefix to strip, so it's
// left as a full absolute URL — resolveMediaUrl below passes those through
// unchanged rather than mangling them.
export function toRelativeMediaPath(publicApiUrl: string, value: string | null | undefined): string | null | undefined {
  if (value == null) return value;
  return value.startsWith(publicApiUrl) ? value.slice(publicApiUrl.length) : value;
}

// Inverse, called wherever a stored avatar/banner value is returned in an API
// response. A relative path (the new, normal case) is resolved against the
// current publicApiUrl; an already-absolute value (an external avatar URL,
// or a row this instance hasn't re-saved since before this helper existed)
// is returned as-is.
export function resolveMediaUrl(publicApiUrl: string, value: string | null): string | null {
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return `${publicApiUrl}${value}`;
}
