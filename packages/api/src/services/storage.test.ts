import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../repositories/attachment');

import * as repo from '../repositories/attachment';
import { requestUpload, confirmUpload, attachToExistingComment, deleteAttachment } from './storage';
import type { StorageAdapter } from '@forumkit/storage';
import type { Attachment } from '@forumkit/types';
import type { DB } from '../db';

const db = {} as DB; // repository calls are mocked below; the service never touches db directly

const baseAttachment: Attachment = {
  id: 'att-1',
  forumId: 'forum-1',
  commentId: null,
  threadId: null,
  uploaderId: 'user-1',
  storageKey: 'forum-1/abc.png',
  mimeType: 'image/png',
  byteSize: 100,
  width: null,
  height: null,
  status: 'pending',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

function fakeAdapter(overrides: Partial<StorageAdapter> = {}): StorageAdapter {
  return {
    getUploadUrl: jest.fn(async () => ({
      uploadUrl: 'http://storage.test/upload',
      uploadMethod: 'PUT' as const,
      uploadHeaders: {},
      expiresAt: new Date('2026-01-01T00:15:00Z'),
    })),
    getObjectMetadata: jest.fn(async () => ({ exists: true, byteSize: 100 })),
    getDownloadUrl: jest.fn(async () => 'http://storage.test/download'),
    deleteObject: jest.fn(async () => undefined),
    ...overrides,
  };
}

const mockedRepo = jest.mocked(repo);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('requestUpload', () => {
  const config = { storageMaxFileSizeBytes: 1000, storageAllowedMimeTypes: ['image/png'] };
  const input = { forumId: 'forum-1', uploaderId: 'user-1', filename: 'a.png', mimeType: 'image/png', byteSize: 10, purpose: 'attachment' as const };

  it('rejects a disallowed mime type', async () => {
    const result = await requestUpload(db, fakeAdapter(), config, { ...input, mimeType: 'image/gif' });
    expect(result).toEqual({ ok: false, code: 'mime_not_allowed' });
  });

  it('rejects a file over the size limit', async () => {
    const result = await requestUpload(db, fakeAdapter(), config, { ...input, byteSize: 5000 });
    expect(result).toEqual({ ok: false, code: 'file_too_large' });
  });

  it('inserts a pending row and returns a presigned upload', async () => {
    mockedRepo.insertPendingAttachment.mockResolvedValue(baseAttachment);
    const adapter = fakeAdapter();

    const result = await requestUpload(db, adapter, config, input);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.attachment).toEqual(baseAttachment);
    expect(adapter.getUploadUrl).toHaveBeenCalledWith({
      storageKey: expect.stringContaining('forum-1/posts/'),
      mimeType: 'image/png',
      byteSize: 10,
    });
  });
});

describe('confirmUpload', () => {
  it('returns attachment_not_found when the attachment does not exist', async () => {
    mockedRepo.getAttachmentById.mockResolvedValue(null);
    const result = await confirmUpload(db, fakeAdapter(), 'att-1', 'user-1', { width: null, height: null });
    expect(result).toEqual({ ok: false, code: 'attachment_not_found' });
  });

  it('returns forbidden when the requester did not upload it', async () => {
    mockedRepo.getAttachmentById.mockResolvedValue(baseAttachment);
    const result = await confirmUpload(db, fakeAdapter(), 'att-1', 'someone-else', { width: null, height: null });
    expect(result).toEqual({ ok: false, code: 'forbidden' });
  });

  it('returns not_pending when the attachment is already confirmed', async () => {
    mockedRepo.getAttachmentById.mockResolvedValue({ ...baseAttachment, status: 'confirmed' });
    const result = await confirmUpload(db, fakeAdapter(), 'att-1', 'user-1', { width: null, height: null });
    expect(result).toEqual({ ok: false, code: 'not_pending' });
  });

  it('returns object_missing when the object never landed in storage', async () => {
    mockedRepo.getAttachmentById.mockResolvedValue(baseAttachment);
    const adapter = fakeAdapter({ getObjectMetadata: jest.fn(async () => ({ exists: false, byteSize: null })) });

    const result = await confirmUpload(db, adapter, 'att-1', 'user-1', { width: null, height: null });
    expect(result).toEqual({ ok: false, code: 'object_missing' });
  });

  it('marks the attachment confirmed with the real object size and client-reported dimensions', async () => {
    mockedRepo.getAttachmentById.mockResolvedValue(baseAttachment);
    const confirmed = { ...baseAttachment, status: 'confirmed' as const };
    mockedRepo.markConfirmed.mockResolvedValue(confirmed);

    const result = await confirmUpload(db, fakeAdapter(), 'att-1', 'user-1', { width: 10, height: 20 });

    expect(result).toEqual({ ok: true, value: confirmed });
    expect(mockedRepo.markConfirmed).toHaveBeenCalledWith(db, 'att-1', { byteSize: 100, width: 10, height: 20 });
  });
});

describe('attachToExistingComment', () => {
  it('refuses to link an attachment that has not been confirmed yet', async () => {
    mockedRepo.getAttachmentById.mockResolvedValue(baseAttachment); // status: pending
    const result = await attachToExistingComment(db, 'att-1', 'comment-1', 'user-1');
    expect(result).toEqual({ ok: false, code: 'not_pending' });
  });

  it('links a confirmed attachment owned by the requester', async () => {
    mockedRepo.getAttachmentById.mockResolvedValue({ ...baseAttachment, status: 'confirmed' });

    const result = await attachToExistingComment(db, 'att-1', 'comment-1', 'user-1');

    expect(result).toEqual({ ok: true, value: undefined });
    expect(mockedRepo.attachToComment).toHaveBeenCalledWith(db, 'att-1', 'comment-1');
  });

  it('refuses to link someone else\'s attachment', async () => {
    mockedRepo.getAttachmentById.mockResolvedValue({ ...baseAttachment, status: 'confirmed' });
    const result = await attachToExistingComment(db, 'att-1', 'comment-1', 'someone-else');
    expect(result).toEqual({ ok: false, code: 'forbidden' });
  });
});

describe('deleteAttachment', () => {
  it('allows the uploader to delete their own attachment', async () => {
    mockedRepo.getAttachmentById.mockResolvedValue(baseAttachment);
    const adapter = fakeAdapter();

    const result = await deleteAttachment(db, adapter, 'att-1', 'user-1', 'member');

    expect(result).toEqual({ ok: true, value: undefined });
    expect(mockedRepo.softDeleteAttachment).toHaveBeenCalledWith(db, 'att-1');
    expect(adapter.deleteObject).toHaveBeenCalledWith('forum-1/abc.png');
  });

  it('allows a moderator to delete someone else\'s attachment', async () => {
    mockedRepo.getAttachmentById.mockResolvedValue(baseAttachment);
    const result = await deleteAttachment(db, fakeAdapter(), 'att-1', 'moderator-1', 'moderator');
    expect(result).toEqual({ ok: true, value: undefined });
  });

  it('forbids a non-owner, non-moderator from deleting', async () => {
    mockedRepo.getAttachmentById.mockResolvedValue(baseAttachment);
    const result = await deleteAttachment(db, fakeAdapter(), 'att-1', 'someone-else', 'member');
    expect(result).toEqual({ ok: false, code: 'forbidden' });
  });
});
