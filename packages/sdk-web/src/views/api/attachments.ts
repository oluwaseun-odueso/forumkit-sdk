import type { Attachment, AttachmentPurpose, UploadUrlResponse } from '@forumkit/types';
import {
  requestUploadUrl as sharedRequestUploadUrl,
  confirmUpload as sharedConfirmUpload,
  deleteAttachment as sharedDeleteAttachment,
} from '@forumkit/shared';

function getApiBase(): string {
  return typeof window !== 'undefined'
    ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
    : '';
}

export type RequestUploadUrlOptions = {
  forumId: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  purpose: AttachmentPurpose;
  token?: string | undefined;
};

export function requestUploadUrl(opts: RequestUploadUrlOptions): Promise<UploadUrlResponse> {
  return sharedRequestUploadUrl(
    getApiBase(),
    opts.forumId,
    { filename: opts.filename, mimeType: opts.mimeType, byteSize: opts.byteSize, purpose: opts.purpose },
    opts.token,
  );
}

// Raw byte upload stays platform-specific (web PUTs a File; mobile uses
// expo-file-system) — not part of the shared client.
export async function putFile(uploadUrl: string, uploadHeaders: Record<string, string>, file: File): Promise<void> {
  const res = await fetch(uploadUrl, { method: 'PUT', headers: uploadHeaders, body: file });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export function confirmUpload(
  forumId: string,
  attachmentId: string,
  dimensions: { width: number | null; height: number | null },
  token?: string,
): Promise<Attachment & { downloadUrl: string }> {
  return sharedConfirmUpload(getApiBase(), forumId, attachmentId, dimensions, token);
}

export function deleteAttachment(forumId: string, attachmentId: string, token?: string): Promise<void> {
  return sharedDeleteAttachment(getApiBase(), forumId, attachmentId, token);
}
