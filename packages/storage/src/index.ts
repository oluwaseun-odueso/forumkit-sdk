import type { StorageProvider } from '@forumkit/types';

// ── Adapter interface ──────────────────────────────────────────────
// The contract every provider must satisfy. Swap providers by
// changing config — callers never know the difference.

export type PresignedUpload = {
  uploadUrl: string;
  uploadMethod: 'PUT';
  uploadHeaders: Record<string, string>;
  expiresAt: Date;
};

export type GetUploadUrlFn = (input: {
  storageKey: string;
  mimeType: string;
  byteSize: number;
}) => Promise<PresignedUpload>;

export type ObjectMetadata = {
  exists: boolean;
  byteSize: number | null;
};
export type GetObjectMetadataFn = (storageKey: string) => Promise<ObjectMetadata>;

export type GetDownloadUrlFn = (storageKey: string) => Promise<string>;
export type DeleteObjectFn = (storageKey: string) => Promise<void>;

export type StorageAdapter = {
  getUploadUrl: GetUploadUrlFn;
  getObjectMetadata: GetObjectMetadataFn;
  getDownloadUrl: GetDownloadUrlFn;
  deleteObject: DeleteObjectFn;
};

type StorageAdapterConfig = {
  storageProvider: StorageProvider;
  forumSecretKey: string;
  storageLocalPath: string;
  storageLocalPublicUrlBase: string;
  storageS3Endpoint: string | null;
  storageS3Bucket: string | null;
  storageS3Region: string | null;
  storageS3AccessKeyId: string | null;
  storageS3SecretAccessKey: string | null;
};

/**
 * Builds the storage adapter based on config. Unlike the AI adapters,
 * this never silently falls back — a misconfigured S3 provider throws
 * at startup rather than degrading to local disk, since a container
 * without a persistent volume would silently lose every upload.
 */
export async function buildStorageAdapter(config: StorageAdapterConfig): Promise<StorageAdapter> {
  if (config.storageProvider === 's3') {
    if (!config.storageS3Bucket || !config.storageS3AccessKeyId || !config.storageS3SecretAccessKey) {
      throw new Error(
        'STORAGE_PROVIDER=s3 requires STORAGE_S3_BUCKET, STORAGE_S3_ACCESS_KEY_ID, and STORAGE_S3_SECRET_ACCESS_KEY',
      );
    }
    const { s3Storage } = await import('./providers/s3');
    return s3Storage({
      endpoint: config.storageS3Endpoint,
      bucket: config.storageS3Bucket,
      region: config.storageS3Region ?? 'auto',
      accessKeyId: config.storageS3AccessKeyId,
      secretAccessKey: config.storageS3SecretAccessKey,
    });
  }

  const { localStorage } = await import('./providers/local');
  return localStorage({
    basePath: config.storageLocalPath,
    publicUrlBase: config.storageLocalPublicUrlBase,
    signingSecret: config.forumSecretKey,
  });
}

export * from './providers/local';
