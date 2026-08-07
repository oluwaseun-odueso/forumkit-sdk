// A stable URL requires no signing to construct, unlike a presigned S3 GET
// URL — safe to embed permanently in stored content or return eagerly for
// every attachment on a feed page. The actual signed URL is resolved lazily,
// only when a browser follows the redirect at GET .../attachments/:id/raw.
export function rawAttachmentUrl(publicApiUrl: string, forumId: string, attachmentId: string): string {
  return `${publicApiUrl}/forums/${forumId}/attachments/${attachmentId}/raw`;
}
