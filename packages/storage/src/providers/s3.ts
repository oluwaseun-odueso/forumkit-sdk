import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageAdapter, PresignedUpload, ObjectMetadata } from '../index';

const UPLOAD_EXPIRES_SECONDS = 15 * 60;
const DOWNLOAD_EXPIRES_SECONDS = 60 * 60;

type S3Config = {
  endpoint: string | null;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/**
 * Works unmodified against AWS S3, Cloudflare R2, MinIO, Backblaze B2,
 * and Supabase Storage — all speak the same S3 API. `forcePathStyle`
 * is required whenever a custom endpoint is set (R2/MinIO/B2/Supabase),
 * harmless against real AWS S3.
 */
export function s3Storage(config: S3Config): StorageAdapter {
  const client = new S3Client({
    region: config.region,
    forcePathStyle: !!config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
  });

  return {
    async getUploadUrl({ storageKey, mimeType }): Promise<PresignedUpload> {
      const command = new PutObjectCommand({
        Bucket: config.bucket,
        Key: storageKey,
        ContentType: mimeType,
      });
      const uploadUrl = await getSignedUrl(client, command, { expiresIn: UPLOAD_EXPIRES_SECONDS });
      return {
        uploadUrl,
        uploadMethod: 'PUT',
        uploadHeaders: { 'Content-Type': mimeType },
        expiresAt: new Date(Date.now() + UPLOAD_EXPIRES_SECONDS * 1000),
      };
    },

    async getObjectMetadata(storageKey): Promise<ObjectMetadata> {
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: storageKey }));
        return { exists: true, byteSize: head.ContentLength ?? null };
      } catch {
        return { exists: false, byteSize: null };
      }
    },

    async getDownloadUrl(storageKey): Promise<string> {
      const command = new GetObjectCommand({ Bucket: config.bucket, Key: storageKey });
      return getSignedUrl(client, command, { expiresIn: DOWNLOAD_EXPIRES_SECONDS });
    },

    async deleteObject(storageKey): Promise<void> {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: storageKey }));
      } catch {
        // best-effort delete — the DB row is already soft-deleted regardless
      }
    },
  };
}
