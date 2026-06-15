import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import * as moderationRepo from '../repositories/moderation';
import type { HostJWTPayload } from '@forumkit/types';

const queueQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const resolveBodySchema = z.object({
  action: z.enum(['approved', 'removed']),
});

export async function moderationRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /moderation/queue
   * Moderator or admin only — lists pending moderation items oldest-first.
   */
  app.get(
    '/queue',
    { preHandler: [authenticate, requireRole('admin', 'moderator')] },
    async (request, reply) => {
      const parsed = queueQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'invalid_query',
          message: parsed.error.issues.map((i) => i.message).join(', '),
          statusCode: 400,
        });
      }

      const { page, limit } = parsed.data;
      const { items, total } = await moderationRepo.listPendingQueue(
        request.server.db,
        { page, limit },
      );

      return reply.status(200).send({ items, total, page, limit });
    },
  );

  /**
   * PATCH /moderation/queue/:id
   * Moderator or admin only — approves or removes a flagged post.
   * 409 if the item is already resolved.
   */
  app.patch(
    '/queue/:id',
    { preHandler: [authenticate, requireRole('admin', 'moderator')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const parsed = resolveBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'invalid_body',
          message: parsed.error.issues.map((i) => i.message).join(', '),
          statusCode: 400,
        });
      }

      const existing = await moderationRepo.getModerationItem(request.server.db, id);
      if (!existing) {
        return reply.status(404).send({
          error: 'item_not_found',
          message: 'Moderation item not found',
          statusCode: 404,
        });
      }
      if (existing.status !== 'pending') {
        return reply.status(409).send({
          error: 'already_resolved',
          message: 'This moderation item has already been resolved',
          statusCode: 409,
        });
      }

      const payload = request.jwtPayload as HostJWTPayload;

      type UserRow = { id: string };
      const reviewer = await request.server.db<UserRow[]>`
        SELECT id FROM users WHERE external_id = ${payload.sub} LIMIT 1
      `.then((rows) => rows[0]);

      if (!reviewer) {
        return reply.status(401).send({
          error: 'session_not_initialised',
          message: 'Call POST /auth/session first',
          statusCode: 401,
        });
      }

      const updated = await moderationRepo.resolveItem(
        request.server.db,
        id,
        reviewer.id,
        parsed.data.action,
      );

      if (!updated) {
        return reply.status(409).send({
          error: 'already_resolved',
          message: 'This moderation item has already been resolved',
          statusCode: 409,
        });
      }

      return reply.status(200).send(updated);
    },
  );
}
