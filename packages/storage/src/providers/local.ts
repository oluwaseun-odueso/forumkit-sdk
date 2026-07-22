import { createHmac, timingSafeEqual } from 'crypto';
import { stat, unlink } from 'fs/promises';
import { join } from 'path';
import type { StorageAdapter } from '../index';

const UPLOAD_TTL_MS = 15 * 60 * 1000;

type LocalConfig = {
  basePath: string;
  publicUrlBase: string;
  signingSecret: string;
};

type UploadTokenPayload = { storageKey: string; exp: number };

function signUploadToken(payload: UploadTokenPayload, secret: string): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

/**
 * Verifies a signed upload token against the storage key it was issued
 * for. Used by the local-mode upload route (packages/api) to authorize
 * a PUT before it accepts bytes — this is the local-disk stand-in for
 * S3 presigned URL verification, which S3 itself handles for us.
 */
export function verifyUploadToken(token: string, storageKey: string, secret: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, signatureB64] = parts as [string, string];

  const expected = createHmac('sha256', secret).update(payloadB64).digest('base64url');
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureB64);
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return false;
  }

  let payload: UploadTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as UploadTokenPayload;
  } catch {
    return false;
  }

  return payload.storageKey === storageKey && Date.now() < payload.exp;
}

/** Rejects storage keys that could escape the storage root via path traversal. */
export function isSafeStorageKey(storageKey: string): boolean {
  return storageKey.length > 0 && !storageKey.includes('..') && !storageKey.startsWith('/');
}

export function resolveLocalStoragePath(basePath: string, storageKey: string): string {
  return join(basePath, storageKey);
}

export function localStorage(config: LocalConfig): StorageAdapter {
  return {
    async getUploadUrl({ storageKey }) {
      const exp = Date.now() + UPLOAD_TTL_MS;
      const token = signUploadToken({ storageKey, exp }, config.signingSecret);
      return {
        uploadUrl: `${config.publicUrlBase}/storage/local/upload/${storageKey}?token=${token}`,
        uploadMethod: 'PUT',
        uploadHeaders: {},
        expiresAt: new Date(exp),
      };
    },

    async getObjectMetadata(storageKey) {
      try {
        const stats = await stat(resolveLocalStoragePath(config.basePath, storageKey));
        return { exists: true, byteSize: stats.size };
      } catch {
        return { exists: false, byteSize: null };
      }
    },

    async getDownloadUrl(storageKey) {
      return `${config.publicUrlBase}/storage/local/download/${storageKey}`;
    },

    async deleteObject(storageKey) {
      try {
        await unlink(resolveLocalStoragePath(config.basePath, storageKey));
      } catch {
        // already gone — nothing to do
      }
    },
  };
}
