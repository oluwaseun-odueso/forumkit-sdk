import { describe, it, expect } from '@jest/globals';
import { s3Storage } from './s3';

// Unlike s3.test.ts, this exercises the real @aws-sdk/client-s3 and
// @aws-sdk/s3-request-presigner (no mocks) - the regression this guards
// against is in the SDK's own default behavior, so a mocked getSignedUrl
// would never catch it. Fake credentials are fine: presigning only signs a
// URL locally, no network call.
const config = {
  endpoint: 'https://example.storage.supabase.co/storage/v1/s3',
  bucket: 'forumkit-dev',
  region: 'eu-west-1',
  accessKeyId: 'FAKEKEY',
  secretAccessKey: 'FAKESECRET',
};

describe('s3Storage adapter (real SDK, no mocks)', () => {
  it('presigned upload and download URLs carry no checksum params', async () => {
    const adapter = s3Storage(config);

    const upload = await adapter.getUploadUrl({
      storageKey: 'forum-1/abc.png',
      mimeType: 'image/png',
      byteSize: 100,
    });
    const downloadUrl = await adapter.getDownloadUrl('forum-1/abc.png');

    for (const url of [upload.uploadUrl, downloadUrl]) {
      expect(url).not.toMatch(/x-amz-checksum/i);
      expect(url).not.toMatch(/x-amz-sdk-checksum-algorithm/i);
    }
  });
});
