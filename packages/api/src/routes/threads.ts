import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import * as threadService from '../services/thread';

const listQuerySchema = z.object({
  tagId: z.string().uuid().optional(),
  sort: z.enum(['latest', 'oldest', 'most_posts', 'most_reactions']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const createBodySchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().min(1),
  tagIds: z.array(z.string().uuid()).max(5).default([]),
});

export async function threadsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /forums/:forumId/threads
   * Public — no authentication required.
   */
  app.get('/:forumId/threads', async (request, reply) => {
    const { forumId } = request.params as { forumId: string };

    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'invalid_query',
        message: parsed.error.issues.map((i) => i.message).join(', '),
        statusCode: 400,
      });
    }

    const result = await threadService.listThreads(
      request.server.db,
      forumId,
      parsed.data,
    );

    return reply.status(200).send(result);
  });

  /**
   * POST /forums/:forumId/threads
   * Requires authentication.
   */
  app.post(
    '/:forumId/threads',
    { preHandler: authenticate },
    async (request, reply) => {
      const { forumId } = request.params as { forumId: string };

      const parsed = createBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'invalid_body',
          message: parsed.error.issues.map((i) => i.message).join(', '),
          statusCode: 400,
        });
      }

      // @ts-expect-error — extended via declaration merging
      const payload = request.jwtPayload;

      type UserRow = { id: string };
      const user = await request.server.db<UserRow[]>`
        SELECT id FROM users
        WHERE external_id = ${payload.sub}
          AND forum_id = ${forumId}
      `.then((rows) => rows[0]);

      if (!user) {
        return reply.status(401).send({
          error: 'session_not_initialised',
          message: 'Call POST /auth/session before creating threads',
          statusCode: 401,
        });
      }

      if (parsed.data.body.length > request.server.config.maxPostLength) {
        return reply.status(422).send({
          error: 'body_too_long',
          message: `Thread body must not exceed ${request.server.config.maxPostLength} characters`,
          statusCode: 422,
        });
      }

      try {
        const thread = await threadService.createThread(
          request.server.db,
          request.server.ai.embed,
          forumId,
          user.id,
          parsed.data,
        );
        return reply.status(201).send(thread);
      } catch (err: unknown) {
        // Foreign key violation — one or more tagIds don't exist in this forum
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code: string }).code === '23503'
        ) {
          return reply.status(422).send({
            error: 'invalid_tag',
            message: 'One or more tagIds do not exist in this forum',
            statusCode: 422,
          });
        }
        request.log.error({ err }, 'Failed to create thread');
        return reply.status(500).send({
          error: 'internal_error',
          message: 'An unexpected error occurred',
          statusCode: 500,
        });
      }
    },
  );
}
