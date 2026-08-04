import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import * as threadService from '../services/thread';
import * as voteService from '../services/vote';
import * as saveService from '../services/save';
import type { ThreadError } from '../services/thread';
import type { HostJWTPayload } from '@forumkit/types';
import { broadcast } from '../lib/ws-rooms';

const listQuerySchema = z.object({
  tagId: z.string().uuid().optional(),
  tagName: z.string().min(1).max(100).optional(),
  pinned: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  sort: z.enum(['best', 'hot', 'new', 'top', 'rising']).optional(),
  topWindow: z.enum(['hour', 'day', 'week', 'month', 'year', 'all']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const similarQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).optional(),
});

const createBodySchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().min(1),
  tagIds: z.array(z.string().uuid()).max(5).default([]),
  tagNames: z.array(z.string().min(2).max(40)).max(5).optional(),
  attachmentIds: z.array(z.string().uuid()).max(10).optional(),
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
const voteBodySchema = z.object({ direction: z.union([z.literal(1), z.literal(-1)]) });

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

function sendVoteError(code: voteService.VoteError, reply: FastifyReply): void {
  const map: Record<voteService.VoteError, [number, string]> = {
    thread_not_found: [404, 'Thread not found'],
    comment_not_found:   [404, 'Comment not found'],
  };
  const [status, message] = map[code];
  void reply.status(status).send({ error: code, message, statusCode: status });
}

function sendSaveError(code: saveService.SaveError, reply: FastifyReply): void {
  const map: Record<saveService.SaveError, [number, string]> = {
    thread_not_found: [404, 'Thread not found'],
    comment_not_found: [404, 'Comment not found'],
  };
  const [status, message] = map[code];
  void reply.status(status).send({ error: code, message, statusCode: status });
}

export async function threadsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /forums/:forumId/threads
   * Requires authentication — no ForumKit endpoint is public.
   */
  app.get('/:forumId/threads', { preHandler: authenticate }, async (request, reply) => {
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

    const result = await threadService.listThreads(
      request.server.db,
      request.server.config.publicApiUrl,
      forumId,
      parsed.data,
      user.id,
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
          request.server.config.publicApiUrl,
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
   * Requires authentication. Must be registered before /:threadId to avoid
   * param shadowing.
   */
  app.get('/:forumId/threads/duplicates', { preHandler: authenticate }, async (request, reply) => {
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
   * Requires authentication.
   */
  app.get('/:forumId/threads/:threadId', { preHandler: authenticate }, async (request, reply) => {
    const { forumId, threadId } = request.params as { forumId: string; threadId: string };

    const user = await resolveUser(request, forumId);
    if (!user) return sendSessionRequired(reply);

    const result = await threadService.getThreadWithAttachments(
      request.server.db,
      request.server.config.publicApiUrl,
      forumId,
      threadId,
      user.id,
    );
    if (!result.ok) {
      sendThreadError(result.code, reply);
      return;
    }
    return reply.status(200).send(result.value);
  });

  /**
   * GET /forums/:forumId/threads/:threadId/similar
   * Requires authentication. Backs the right rail's "Similar Posts" card —
   * reads the thread's already-computed embedding, never calls the
   * embedding model live.
   */
  app.get('/:forumId/threads/:threadId/similar', { preHandler: authenticate }, async (request, reply) => {
    const { forumId, threadId } = request.params as { forumId: string; threadId: string };

    const parsed = similarQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'invalid_query',
        message: parsed.error.issues.map((i) => i.message).join(', '),
        statusCode: 400,
      });
    }

    const result = await threadService.getSimilarThreadsForRail(
      request.server.db,
      request.server.config.publicApiUrl,
      forumId,
      threadId,
      parsed.data.limit ?? 5,
    );
    if (!result.ok) {
      sendThreadError(result.code, reply);
      return;
    }
    return reply.status(200).send({ threads: result.value });
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

  /**
   * POST /forums/:forumId/threads/:threadId/vote
   * Requires authentication. Toggles: voting the same direction again
   * clears the vote; voting the opposite direction flips it.
   */
  app.post(
    '/:forumId/threads/:threadId/vote',
    { preHandler: authenticate },
    async (request, reply) => {
      const { forumId, threadId } = request.params as { forumId: string; threadId: string };

      const parsed = voteBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'invalid_body',
          message: parsed.error.issues.map((i) => i.message).join(', '),
          statusCode: 400,
        });
      }

      const user = await resolveUser(request, forumId);
      if (!user) return sendSessionRequired(reply);

      const result = await voteService.voteOnThread(request.server.db, threadId, user.id, parsed.data.direction);
      if (!result.ok) {
        sendVoteError(result.code, reply);
        return;
      }
      broadcast(threadId, {
        type: 'vote.updated',
        payload: { targetType: 'thread', targetId: threadId, voteCounts: result.value.voteCounts },
      });
      return reply.status(200).send(result.value);
    },
  );

  /**
   * DELETE /forums/:forumId/threads/:threadId/vote
   * Requires authentication. Unconditionally clears the caller's vote.
   */
  app.delete(
    '/:forumId/threads/:threadId/vote',
    { preHandler: authenticate },
    async (request, reply) => {
      const { forumId, threadId } = request.params as { forumId: string; threadId: string };

      const user = await resolveUser(request, forumId);
      if (!user) return sendSessionRequired(reply);

      const result = await voteService.removeVoteFromThread(request.server.db, threadId, user.id);
      if (!result.ok) {
        sendVoteError(result.code, reply);
        return;
      }
      broadcast(threadId, {
        type: 'vote.updated',
        payload: { targetType: 'thread', targetId: threadId, voteCounts: result.value.voteCounts },
      });
      return reply.status(200).send(result.value);
    },
  );

  /**
   * POST /forums/:forumId/threads/:threadId/save
   */
  app.post(
    '/:forumId/threads/:threadId/save',
    { preHandler: authenticate },
    async (request, reply) => {
      const { forumId, threadId } = request.params as { forumId: string; threadId: string };

      const user = await resolveUser(request, forumId);
      if (!user) return sendSessionRequired(reply);

      const result = await saveService.saveThread(request.server.db, threadId, user.id);
      if (!result.ok) {
        sendSaveError(result.code, reply);
        return;
      }
      return reply.status(200).send({ saved: true });
    },
  );

  /**
   * DELETE /forums/:forumId/threads/:threadId/save
   * Unsaves the thread.
   */
  app.delete(
    '/:forumId/threads/:threadId/save',
    { preHandler: authenticate },
    async (request, reply) => {
      const { forumId, threadId } = request.params as { forumId: string; threadId: string };

      const user = await resolveUser(request, forumId);
      if (!user) return sendSessionRequired(reply);

      const result = await saveService.unsaveThread(request.server.db, threadId, user.id);
      if (!result.ok) {
        sendSaveError(result.code, reply);
        return;
      }
      return reply.status(200).send({ saved: false });
    },
  );
}
