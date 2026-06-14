import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import * as threadService from '../services/thread';
import type { ThreadError } from '../services/thread';
import type { HostJWTPayload } from '@forumkit/types';

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

const updateBodySchema = z.object({
  title: z.string().min(1).max(300).optional(),
  body: z.string().min(1).optional(),
  tagIds: z.array(z.string().uuid()).max(5).optional(),
});

const duplicatesQuerySchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().max(2000).optional(),
});

const lockBodySchema = z.object({ locked: z.boolean() });
const pinBodySchema = z.object({ pinned: z.boolean() });

function sendThreadError(code: ThreadError | 'thread_not_found', reply: FastifyReply): void {
  if (code === 'thread_not_found') {
    void reply.status(404).send({
      error: 'thread_not_found',
      message: 'Thread not found',
      statusCode: 404,
    });
  } else if (code === 'forbidden') {
    void reply.status(403).send({
      error: 'forbidden',
      message: 'You do not have permission to perform this action',
      statusCode: 403,
    });
  }
}

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
          request.server.ai.llm,
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

  /**
   * GET /forums/:forumId/threads/duplicates
   * Public — must be registered before /:threadId to avoid param shadowing.
   */
  app.get('/:forumId/threads/duplicates', async (request, reply) => {
    const { forumId } = request.params as { forumId: string };

    const parsed = duplicatesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'invalid_query',
        message: parsed.error.issues.map((i) => i.message).join(', '),
        statusCode: 400,
      });
    }

    const results = await threadService.findDuplicates(
      request.server.db,
      request.server.ai.embed,
      forumId,
      parsed.data.title,
      parsed.data.body ?? '',
    );

    return reply.status(200).send(results);
  });

  /**
   * GET /forums/:forumId/threads/:threadId
   * Public.
   */
  app.get('/:forumId/threads/:threadId', async (request, reply) => {
    const { forumId, threadId } = request.params as { forumId: string; threadId: string };

    const result = await threadService.getThread(request.server.db, forumId, threadId);
    if (!result.ok) {
      sendThreadError(result.code, reply);
      return;
    }
    return reply.status(200).send(result.value);
  });

  /**
   * PATCH /forums/:forumId/threads/:threadId
   * Author or admin/moderator.
   */
  app.patch(
    '/:forumId/threads/:threadId',
    { preHandler: authenticate },
    async (request, reply) => {
      const { forumId, threadId } = request.params as { forumId: string; threadId: string };

      const parsed = updateBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'invalid_body',
          message: parsed.error.issues.map((i) => i.message).join(', '),
          statusCode: 400,
        });
      }

      // @ts-expect-error — extended via declaration merging
      const payload = request.jwtPayload as HostJWTPayload;

      type UserRow = { id: string };
      const user = await request.server.db<UserRow[]>`
        SELECT id FROM users WHERE external_id = ${payload.sub} AND forum_id = ${forumId}
      `.then((rows) => rows[0]);

      if (!user) {
        return reply.status(401).send({
          error: 'session_not_initialised',
          message: 'Call POST /auth/session before editing threads',
          statusCode: 401,
        });
      }

      const result = await threadService.updateThread(
        request.server.db,
        forumId,
        threadId,
        user.id,
        payload.role,
        parsed.data,
      );
      if (!result.ok) {
        sendThreadError(result.code, reply);
        return;
      }
      return reply.status(200).send(result.value);
    },
  );

  /**
   * DELETE /forums/:forumId/threads/:threadId
   * Author or admin/moderator.
   */
  app.delete(
    '/:forumId/threads/:threadId',
    { preHandler: authenticate },
    async (request, reply) => {
      const { forumId, threadId } = request.params as { forumId: string; threadId: string };

      // @ts-expect-error — extended via declaration merging
      const payload = request.jwtPayload as HostJWTPayload;

      type UserRow = { id: string };
      const user = await request.server.db<UserRow[]>`
        SELECT id FROM users WHERE external_id = ${payload.sub} AND forum_id = ${forumId}
      `.then((rows) => rows[0]);

      if (!user) {
        return reply.status(401).send({
          error: 'session_not_initialised',
          message: 'Call POST /auth/session before deleting threads',
          statusCode: 401,
        });
      }

      const result = await threadService.deleteThread(
        request.server.db,
        forumId,
        threadId,
        user.id,
        payload.role,
      );
      if (!result.ok) {
        sendThreadError(result.code, reply);
        return;
      }
      return reply.status(204).send();
    },
  );

  /**
   * POST /forums/:forumId/threads/:threadId/lock
   * Admin or moderator only.
   */
  app.post(
    '/:forumId/threads/:threadId/lock',
    { preHandler: [authenticate, requireRole('admin', 'moderator')] },
    async (request, reply) => {
      const { forumId, threadId } = request.params as { forumId: string; threadId: string };

      const parsed = lockBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'invalid_body',
          message: parsed.error.issues.map((i) => i.message).join(', '),
          statusCode: 400,
        });
      }

      const result = await threadService.lockThread(
        request.server.db,
        forumId,
        threadId,
        parsed.data.locked,
      );
      if (!result.ok) {
        sendThreadError(result.code, reply);
        return;
      }
      return reply.status(200).send(result.value);
    },
  );

  /**
   * POST /forums/:forumId/threads/:threadId/pin
   * Admin or moderator only.
   */
  app.post(
    '/:forumId/threads/:threadId/pin',
    { preHandler: [authenticate, requireRole('admin', 'moderator')] },
    async (request, reply) => {
      const { forumId, threadId } = request.params as { forumId: string; threadId: string };

      const parsed = pinBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'invalid_body',
          message: parsed.error.issues.map((i) => i.message).join(', '),
          statusCode: 400,
        });
      }

      const result = await threadService.pinThread(
        request.server.db,
        forumId,
        threadId,
        parsed.data.pinned,
      );
      if (!result.ok) {
        sendThreadError(result.code, reply);
        return;
      }
      return reply.status(200).send(result.value);
    },
  );
}
