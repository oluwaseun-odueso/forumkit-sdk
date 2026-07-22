import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import * as storageService from '../services/storage';
import type { StorageError } from '../services/storage';
import type { UploadUrlResponse } from '@forumkit/types';

// ── Schemas ───────────────────────────────────────────────────────────

const uploadUrlBodySchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  byteSize: z.number().int().positive(),
});

const confirmBodySchema = z.object({
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
});

// ── Shared helpers ────────────────────────────────────────────────────

type UserRow = { id: string; role: string };

async function resolveUser(request: FastifyRequest): Promise<UserRow | null> {
  const payload = request.jwtPayload;
  const rows = await request.server.db<UserRow[]>`
    SELECT id, role FROM users
    WHERE external_id = ${payload.sub}
      AND forum_id = ${payload.forumId}
  `;
  return rows[0] ?? null;
}

function sendStorageError(code: StorageError, reply: FastifyReply): void {
  const map: Record<StorageError, [number, string]> = {
    mime_not_allowed: [422, 'This file type is not allowed'],
    file_too_large: [422, 'This file exceeds the maximum allowed size'],
    attachment_not_found: [404, 'Attachment not found'],
    forbidden: [403, 'You do not have permission to perform this action'],
    not_pending: [409, 'Attachment is not awaiting upload'],
    object_missing: [409, 'Upload was not found in storage — retry the upload before confirming'],
  };
  const [status, message] = map[code];
  void reply.status(status).send({ error: code, message, statusCode: status });
}

// ── Routes ────────────────────────────────────────────────────────────

export async function attachmentsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /forums/:forumId/attachments/upload-url
   */
  app.post('/:forumId/attachments/upload-url', { preHandler: authenticate }, async (request, reply) => {
    const { forumId } = request.params as { forumId: string };

    const parsed = uploadUrlBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'invalid_body',
        message: parsed.error.issues.map((i) => i.message).join(', '),
        statusCode: 400,
      });
    }

    const user = await resolveUser(request);
    if (!user) {
      return reply.status(401).send({
        error: 'session_not_initialised',
        message: 'Call POST /auth/session before uploading',
        statusCode: 401,
      });
    }

    const result = await storageService.requestUpload(
      request.server.db,
      request.server.storage,
      request.server.config,
      { forumId, uploaderId: user.id, ...parsed.data },
    );
    if (!result.ok) return sendStorageError(result.code, reply);

    const response: UploadUrlResponse = {
      attachmentId: result.value.attachment.id,
      uploadUrl: result.value.upload.uploadUrl,
      uploadMethod: result.value.upload.uploadMethod,
      uploadHeaders: result.value.upload.uploadHeaders,
      expiresAt: result.value.upload.expiresAt.toISOString(),
    };
    return reply.status(201).send(response);
  });

  /**
   * POST /forums/:forumId/attachments/:id/confirm
   */
  app.post('/:forumId/attachments/:id/confirm', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { forumId: string; id: string };

    const parsed = confirmBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'invalid_body',
        message: parsed.error.issues.map((i) => i.message).join(', '),
        statusCode: 400,
      });
    }

    const user = await resolveUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'session_not_initialised', message: 'Call POST /auth/session first', statusCode: 401 });
    }

    const result = await storageService.confirmUpload(request.server.db, request.server.storage, id, user.id, {
      width: parsed.data.width ?? null,
      height: parsed.data.height ?? null,
    });
    if (!result.ok) return sendStorageError(result.code, reply);

    return reply.status(200).send(result.value);
  });

  /**
   * DELETE /forums/:forumId/attachments/:id
   */
  app.delete('/:forumId/attachments/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { forumId: string; id: string };

    const user = await resolveUser(request);
    if (!user) {
      return reply.status(401).send({ error: 'session_not_initialised', message: 'Call POST /auth/session first', statusCode: 401 });
    }

    const result = await storageService.deleteAttachment(
      request.server.db,
      request.server.storage,
      id,
      user.id,
      user.role as Parameters<typeof storageService.deleteAttachment>[4],
    );
    if (!result.ok) return sendStorageError(result.code, reply);

    return reply.status(204).send();
  });
}
