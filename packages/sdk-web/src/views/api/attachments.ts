import type { Attachment, UploadUrlResponse } from '@forumkit/types';

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function requestUploadUrl(
  forumId: string,
  filename: string,
  mimeType: string,
  byteSize: number,
  token?: string,
): Promise<UploadUrlResponse> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/attachments/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ filename, mimeType, byteSize }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as UploadUrlResponse;
}

export async function putFile(uploadUrl: string, uploadHeaders: Record<string, string>, file: File): Promise<void> {
  const res = await fetch(uploadUrl, { method: 'PUT', headers: uploadHeaders, body: file });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function confirmUpload(
  forumId: string,
  attachmentId: string,
  dimensions: { width: number | null; height: number | null },
  token?: string,
): Promise<Attachment & { downloadUrl: string }> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/attachments/${attachmentId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(dimensions),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Attachment & { downloadUrl: string };
}
