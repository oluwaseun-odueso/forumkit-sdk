import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('fs/promises', () => ({
  stat: jest.fn(),
  unlink: jest.fn(),
}));

import { stat, unlink } from 'fs/promises';
import { localStorage, verifyUploadToken, isSafeStorageKey } from './local';

const mockedStat = stat as jest.MockedFunction<typeof stat>;
const mockedUnlink = unlink as jest.MockedFunction<typeof unlink>;

const config = {
  basePath: '/tmp/forumkit-uploads',
  publicUrlBase: 'http://localhost:3000',
  signingSecret: 'test-secret',
};

function extractToken(uploadUrl: string): string {
  const token = new URL(uploadUrl).searchParams.get('token');
  if (!token) throw new Error('uploadUrl did not include a token');
  return token;
}

describe('localStorage adapter', () => {
  const adapter = localStorage(config);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUploadUrl', () => {
    it('returns a token that verifies against the same storage key', async () => {
      const upload = await adapter.getUploadUrl({ storageKey: 'forum-1/abc.png', mimeType: 'image/png', byteSize: 100 });
      const token = extractToken(upload.uploadUrl);
      expect(verifyUploadToken(token, 'forum-1/abc.png', config.signingSecret)).toBe(true);
    });

    it('rejects the token when verified against a different storage key', async () => {
      const upload = await adapter.getUploadUrl({ storageKey: 'forum-1/abc.png', mimeType: 'image/png', byteSize: 100 });
      const token = extractToken(upload.uploadUrl);
      expect(verifyUploadToken(token, 'forum-1/other.png', config.signingSecret)).toBe(false);
    });

    it('rejects the token when verified with a different secret', async () => {
      const upload = await adapter.getUploadUrl({ storageKey: 'forum-1/abc.png', mimeType: 'image/png', byteSize: 100 });
      const token = extractToken(upload.uploadUrl);
      expect(verifyUploadToken(token, 'forum-1/abc.png', 'wrong-secret')).toBe(false);
    });

    it('rejects an expired token', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2020-01-01T00:00:00Z'));
      const upload = await adapter.getUploadUrl({ storageKey: 'forum-1/abc.png', mimeType: 'image/png', byteSize: 100 });
      const token = extractToken(upload.uploadUrl);

      jest.setSystemTime(new Date('2020-01-01T01:00:00Z')); // +1h, past the 15 minute TTL
      expect(verifyUploadToken(token, 'forum-1/abc.png', config.signingSecret)).toBe(false);
      jest.useRealTimers();
    });
  });

  describe('getObjectMetadata', () => {
    it('reports exists=true with the file size when present', async () => {
      mockedStat.mockResolvedValue({ size: 1234 } as Awaited<ReturnType<typeof stat>>);
      const meta = await adapter.getObjectMetadata('forum-1/abc.png');
      expect(meta).toEqual({ exists: true, byteSize: 1234 });
    });

    it('reports exists=false when the file is missing', async () => {
      mockedStat.mockRejectedValue(new Error('ENOENT'));
      const meta = await adapter.getObjectMetadata('forum-1/missing.png');
      expect(meta).toEqual({ exists: false, byteSize: null });
    });
  });

  describe('deleteObject', () => {
    it('swallows errors from an already-missing file', async () => {
      mockedUnlink.mockRejectedValue(new Error('ENOENT'));
      await expect(adapter.deleteObject('forum-1/abc.png')).resolves.toBeUndefined();
    });
  });
});

describe('isSafeStorageKey', () => {
  it.each([
    ['forum-1/abc.png', true],
    ['', false],
    ['../etc/passwd', false],
    ['/etc/passwd', false],
  ])('%s -> %s', (key, expected) => {
    expect(isSafeStorageKey(key as string)).toBe(expected);
  });
});
