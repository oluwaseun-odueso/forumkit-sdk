import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import * as notificationService from '../services/notification';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

type UserRow = { id: string };

async function resolveUser(request: FastifyRequest, forumId: string): Promise<UserRow | null> {
  const payload = request.jwtPayload;
  const rows = await request.server.db<UserRow[]>`
    SELECT id FROM users
    WHERE external_id = ${payload.sub}
      AND forum_id = ${forumId}
  `;
  return rows[0] ?? null;
}

function sendSessionRequired(reply: FastifyReply): FastifyReply {
  return reply.status(401).send({
    error: 'session_not_initialised',
    message: 'Call POST /auth/session first',
    statusCode: 401,
  });
}

export async function notificationsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /forums/:forumId/notifications
   */
  app.get('/:forumId/notifications', { preHandler: authenticate }, async (request, reply) => {
    const { forumId } = request.params as { forumId: string };

    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'invalid_query',
        message: parsed.error.issues.map((i) => i.message).join(', '),
        statusCode: 400,
      });
    }

    const user = await resolveUser(request, forumId);
    if (!user) return sendSessionRequired(reply);

    const result = await notificationService.listNotifications(
      request.server.db, request.server.config.publicApiUrl, forumId, user.id, parsed.data.page, parsed.data.limit,
    );
    return reply.status(200).send(result);
  });

  /**
   * GET /forums/:forumId/notifications/unread-count
   */
  app.get('/:forumId/notifications/unread-count', { preHandler: authenticate }, async (request, reply) => {
    const { forumId } = request.params as { forumId: string };

    const user = await resolveUser(request, forumId);
    if (!user) return sendSessionRequired(reply);

    const count = await notificationService.getUnreadCount(request.server.db, forumId, user.id);
    return reply.status(200).send({ count });
  });

  /**
   * PATCH /forums/:forumId/notifications/:id/read
   */
  app.patch('/:forumId/notifications/:id/read', { preHandler: authenticate }, async (request, reply) => {
    const { forumId, id } = request.params as { forumId: string; id: string };

    const user = await resolveUser(request, forumId);
    if (!user) return sendSessionRequired(reply);

    const result = await notificationService.markRead(request.server.db, id, user.id);
    if (!result.ok) {
      return reply.status(404).send({ error: 'not_found', message: 'Notification not found', statusCode: 404 });
    }
    return reply.status(204).send();
  });

  /**
   * DELETE /forums/:forumId/notifications/:id
   */
  app.delete('/:forumId/notifications/:id', { preHandler: authenticate }, async (request, reply) => {
    const { forumId, id } = request.params as { forumId: string; id: string };

    const user = await resolveUser(request, forumId);
    if (!user) return sendSessionRequired(reply);

    const result = await notificationService.deleteNotification(request.server.db, id, user.id);
    if (!result.ok) {
      return reply.status(404).send({ error: 'not_found', message: 'Notification not found', statusCode: 404 });
    }
    return reply.status(204).send();
  });

  /**
   * PATCH /forums/:forumId/notifications/read-all
   */
  app.patch('/:forumId/notifications/read-all', { preHandler: authenticate }, async (request, reply) => {
    const { forumId } = request.params as { forumId: string };

    const user = await resolveUser(request, forumId);
    if (!user) return sendSessionRequired(reply);

    await notificationService.markAllRead(request.server.db, forumId, user.id);
    return reply.status(204).send();
  });
}
