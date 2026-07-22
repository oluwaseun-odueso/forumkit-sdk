import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import type { FastifyInstance } from 'fastify';
import { verifyUploadToken, isSafeStorageKey, resolveLocalStoragePath } from '@forumkit/storage';

/**
 * Local-disk mode's stand-in for S3 presigned URLs. The signed token in
 * the query string IS the auth mechanism here, not the session/host
 * JWT — this route is registered without the `authenticate` preHandler
 * and is only meaningful when STORAGE_PROVIDER=local.
 */
export async function storageLocalRoutes(app: FastifyInstance): Promise<void> {
  // Accept any content-type as a raw stream instead of trying to parse
  // it (images/video aren't JSON). Scoped to this plugin's encapsulation
  // context only — it does not affect JSON parsing elsewhere in the app.
  app.addContentTypeParser('*', (_request, payload, done) => {
    done(null, payload);
  });

  app.put('/storage/local/upload/*', async (request, reply) => {
    const storageKey = (request.params as { '*': string })['*'];
    const { token } = request.query as { token?: string };

    if (!token || !isSafeStorageKey(storageKey)) {
      return reply.status(400).send({ error: 'invalid_upload_key', message: 'Invalid or missing storage key', statusCode: 400 });
    }

    const { forumSecretKey, storageLocalPath, storageMaxFileSizeBytes } = request.server.config;
    if (!verifyUploadToken(token, storageKey, forumSecretKey)) {
      return reply.status(401).send({ error: 'invalid_token', message: 'Upload token is invalid or has expired', statusCode: 401 });
    }

    const destPath = resolveLocalStoragePath(resolve(storageLocalPath), storageKey);
    await mkdir(dirname(destPath), { recursive: true });

    let bytesWritten = 0;
    const source = request.raw;
    const dest = createWriteStream(destPath);

    await new Promise<void>((resolvePromise, rejectPromise) => {
      source.on('data', (chunk: Buffer) => {
        bytesWritten += chunk.length;
        if (bytesWritten > storageMaxFileSizeBytes) {
          source.destroy();
          dest.destroy();
          rejectPromise(new Error('file_too_large'));
        }
      });
      source.pipe(dest);
      dest.on('finish', () => resolvePromise());
      dest.on('error', rejectPromise);
      source.on('error', rejectPromise);
    }).catch((error: Error) => {
      if (error.message === 'file_too_large') {
        return reply.status(422).send({ error: 'file_too_large', message: 'File exceeds the maximum allowed size', statusCode: 422 });
      }
      request.log.error({ err: error }, 'Local upload failed');
      return reply.status(500).send({ error: 'upload_failed', message: 'Failed to store upload', statusCode: 500 });
    });

    if (reply.sent) return;
    return reply.status(200).send({ ok: true });
  });
}
