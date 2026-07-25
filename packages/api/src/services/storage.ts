import { randomUUID } from 'crypto';
import type { DB } from '../db';
import type { Attachment, UserRole } from '@forumkit/types';
import type { StorageAdapter, PresignedUpload } from '@forumkit/storage';
import { ok, err } from '../lib/result';
import type { Result } from '../lib/result';
import * as repo from '../repositories/attachment';

export type StorageError =
  | 'mime_not_allowed'
  | 'file_too_large'
  | 'attachment_not_found'
  | 'forbidden'
  | 'not_pending'
  | 'object_missing';

type RequestUploadOptions = {
  forumId: string;
  uploaderId: string;
  filename: string;
  mimeType: string;
  byteSize: number;
};

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
}

function buildStorageKey(forumId: string, filename: string): string {
  return `${forumId}/${randomUUID()}-${sanitizeFilename(filename)}`;
}

export async function requestUpload(
  db: DB,
  adapter: StorageAdapter,
  config: { storageMaxFileSizeBytes: number; storageAllowedMimeTypes: string[] },
  opts: RequestUploadOptions,
): Promise<Result<{ attachment: Attachment; upload: PresignedUpload }, StorageError>> {
  if (!config.storageAllowedMimeTypes.includes(opts.mimeType)) return err('mime_not_allowed');
  if (opts.byteSize > config.storageMaxFileSizeBytes) return err('file_too_large');

  const storageKey = buildStorageKey(opts.forumId, opts.filename);
  const attachment = await repo.insertPendingAttachment(db, {
    forumId: opts.forumId,
    uploaderId: opts.uploaderId,
    storageKey,
    mimeType: opts.mimeType,
    byteSize: opts.byteSize,
  });
  const upload = await adapter.getUploadUrl({ storageKey, mimeType: opts.mimeType, byteSize: opts.byteSize });
  return ok({ attachment, upload });
}

type ConfirmUploadDimensions = { width: number | null; height: number | null };

export async function confirmUpload(
  db: DB,
  adapter: StorageAdapter,
  attachmentId: string,
  requesterId: string,
  dimensions: ConfirmUploadDimensions,
): Promise<Result<Attachment, StorageError>> {
  const attachment = await repo.getAttachmentById(db, attachmentId);
  if (!attachment) return err('attachment_not_found');
  if (attachment.uploaderId !== requesterId) return err('forbidden');
  if (attachment.status !== 'pending') return err('not_pending');

  const meta = await adapter.getObjectMetadata(attachment.storageKey);
  if (!meta.exists) return err('object_missing');

  const updated = await repo.markConfirmed(db, attachmentId, {
    byteSize: meta.byteSize ?? attachment.byteSize,
    width: dimensions.width,
    height: dimensions.height,
  });
  if (!updated) return err('attachment_not_found');
  return ok(updated);
}

// Links a confirmed attachment to a post — called once per id, whether
// that's right after post creation (attachmentIds on CreatePostBody)
// or when adding media to an existing post later. A post can have many
// attachments (several images plus a video), so this operates on one
// attachment at a time and the caller loops.
export async function attachToExistingPost(
  db: DB,
  attachmentId: string,
  postId: string,
  requesterId: string,
): Promise<Result<void, StorageError>> {
  const attachment = await repo.getAttachmentById(db, attachmentId);
  if (!attachment) return err('attachment_not_found');
  if (attachment.uploaderId !== requesterId) return err('forbidden');
  if (attachment.status !== 'confirmed') return err('not_pending');

  await repo.attachToPost(db, attachmentId, postId);
  return ok(undefined);
}

// Same as attachToExistingPost, but for a thread's own body — threads
// carry content directly (no post row required), so their media links
// here instead. Called once per id in the thread's attachmentIds.
export async function attachToExistingThread(
  db: DB,
  attachmentId: string,
  threadId: string,
  requesterId: string,
): Promise<Result<void, StorageError>> {
  const attachment = await repo.getAttachmentById(db, attachmentId);
  if (!attachment) return err('attachment_not_found');
  if (attachment.uploaderId !== requesterId) return err('forbidden');
  if (attachment.status !== 'confirmed') return err('not_pending');

  await repo.attachToThread(db, attachmentId, threadId);
  return ok(undefined);
}

export async function deleteAttachment(
  db: DB,
  adapter: StorageAdapter,
  attachmentId: string,
  requesterId: string,
  requesterRole: UserRole,
): Promise<Result<void, StorageError>> {
  const attachment = await repo.getAttachmentById(db, attachmentId);
  if (!attachment) return err('attachment_not_found');

  const canDelete =
    attachment.uploaderId === requesterId || requesterRole === 'moderator' || requesterRole === 'admin';
  if (!canDelete) return err('forbidden');

  await repo.softDeleteAttachment(db, attachmentId);
  await adapter.deleteObject(attachment.storageKey).catch(() => {});
  return ok(undefined);
}
