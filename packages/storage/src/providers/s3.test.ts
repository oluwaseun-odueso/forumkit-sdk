import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const sendMock = jest.fn<() => Promise<unknown>>();
const getSignedUrlMock = jest.fn<() => Promise<string>>();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ input, __type: 'PutObjectCommand' })),
  GetObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ input, __type: 'GetObjectCommand' })),
  HeadObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ input, __type: 'HeadObjectCommand' })),
  DeleteObjectCommand: jest.fn().mockImplementation((input: unknown) => ({ input, __type: 'DeleteObjectCommand' })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: getSignedUrlMock,
}));

import { s3Storage } from './s3';

const config = {
  endpoint: 'http://minio:9000',
  bucket: 'forumkit-dev',
  region: 'auto',
  accessKeyId: 'key',
  secretAccessKey: 'secret',
};

describe('s3Storage adapter', () => {
  beforeEach(() => {
    sendMock.mockReset();
    getSignedUrlMock.mockReset();
  });

  it('getUploadUrl signs a PutObjectCommand and echoes Content-Type in uploadHeaders', async () => {
    getSignedUrlMock.mockResolvedValue('https://signed.example/upload');
    const adapter = s3Storage(config);

    const upload = await adapter.getUploadUrl({ storageKey: 'forum-1/abc.png', mimeType: 'image/png', byteSize: 100 });

    expect(upload).toMatchObject({
      uploadUrl: 'https://signed.example/upload',
      uploadMethod: 'PUT',
      uploadHeaders: { 'Content-Type': 'image/png' },
    });
  });

  it('getObjectMetadata returns exists=false when the object is not found', async () => {
    sendMock.mockRejectedValue(new Error('NotFound'));
    const adapter = s3Storage(config);

    const meta = await adapter.getObjectMetadata('forum-1/missing.png');
    expect(meta).toEqual({ exists: false, byteSize: null });
  });

  it('getObjectMetadata returns exists=true with byteSize when found', async () => {
    sendMock.mockResolvedValue({ ContentLength: 4321 });
    const adapter = s3Storage(config);

    const meta = await adapter.getObjectMetadata('forum-1/abc.png');
    expect(meta).toEqual({ exists: true, byteSize: 4321 });
  });

  it('deleteObject swallows errors rather than throwing', async () => {
    sendMock.mockRejectedValue(new Error('boom'));
    const adapter = s3Storage(config);

    await expect(adapter.deleteObject('forum-1/abc.png')).resolves.toBeUndefined();
  });
});
