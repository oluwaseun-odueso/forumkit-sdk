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
  storageS3Endpoint: string | null;
  storageS3Bucket: string | null;
  storageS3Region: string | null;
  storageS3AccessKeyId: string | null;
  storageS3SecretAccessKey: string | null;
};

/**
 * Builds the storage adapter. There is no local-disk fallback: every
 * integrator must provide their own S3-compatible bucket (AWS S3, R2,
 * MinIO, B2, Supabase Storage, ...). Missing credentials throw at
 * startup rather than silently falling back to something that would
 * behave differently in production.
 */
export async function buildStorageAdapter(config: StorageAdapterConfig): Promise<StorageAdapter> {
  if (!config.storageS3Bucket || !config.storageS3AccessKeyId || !config.storageS3SecretAccessKey) {
    if (process.env['NODE_ENV'] === 'test') {
      return {
        async getUploadUrl(): Promise<PresignedUpload> {
          return { uploadUrl: 'http://stub', uploadMethod: 'PUT', uploadHeaders: {}, expiresAt: new Date() };
        },
        async getObjectMetadata(): Promise<ObjectMetadata> { return { exists: false, byteSize: null }; },
        async getDownloadUrl(): Promise<string> { return 'http://stub'; },
        async deleteObject(): Promise<void> {},
      };
    }
    throw new Error(
      'Remote storage is required: set STORAGE_S3_BUCKET, STORAGE_S3_ACCESS_KEY_ID, and STORAGE_S3_SECRET_ACCESS_KEY',
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
