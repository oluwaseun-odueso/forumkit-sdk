import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { SocketStream } from '@fastify/websocket';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import * as postService from '../services/post';
import type { PostError } from '../services/post';
import { broadcast, joinRoom, leaveRoom } from '../lib/ws-rooms';
import type { ReactionType } from '@forumkit/types';

// ── Schemas ───────────────────────────────────────────────────────────

const createBodySchema = z.object({
  body: z.string().min(1),
  parentPostId: z.string().uuid().optional(),
});

const editBodySchema = z.object({
  body: z.string().min(1),
});

const reactBodySchema = z.object({
  type: z.enum(['like', 'helpful', 'insightful', 'funny']),
});

const reportBodySchema = z.object({
  reason: z.string().min(1).max(500),
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

function sendPostError(code: PostError, reply: FastifyReply): void {
  const map: Record<PostError, [number, string]> = {
    post_not_found:   [404, 'Post not found'],
    thread_not_found: [404, 'Thread not found'],
    thread_locked:    [403, 'Thread is locked and no longer accepting posts'],
    forbidden:        [403, 'You do not have permission to perform this action'],
  };
  const [status, message] = map[code];
  void reply.status(status).send({ error: code, message, statusCode: status });
}

// ── Routes ────────────────────────────────────────────────────────────

export async function postsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /threads/:tid/posts
   */
  app.post('/:tid/posts', { preHandler: authenticate }, async (request, reply) => {
    const { tid } = request.params as { tid: string };

    const parsed = createBodySchema.safeParse(request.body);
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
        message: 'Call POST /auth/session before posting',
        statusCode: 401,
      });
    }

    if (parsed.data.body.length > request.server.config.maxPostLength) {
      return reply.status(422).send({
        error: 'body_too_long',
        message: `Post body must not exceed ${request.server.config.maxPostLength} characters`,
        statusCode: 422,
      });
    }

    const result = await postService.createPost(
      request.server.db,
      request.server.ai.embed,
      request.server.ai.moderate,
      { threadId: tid, authorId: user.id, body: parsed.data.body, parentPostId: parsed.data.parentPostId },
    );

    if (!result.ok) return sendPostError(result.code, reply);

    broadcast(tid, { type: 'post.created', payload: result.value });
    return reply.status(201).send(result.value);
  });

  /**
   * PATCH /threads/:tid/posts/:pid
   */
  app.patch('/:tid/posts/:pid', { preHandler: authenticate }, async (request, reply) => {
    const { tid, pid } = request.params as { tid: string; pid: string };

    const parsed = editBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'invalid_body',
        message: parsed.error.issues.map((i) => i.message).join(', '),
        statusCode: 400,
      });
    }

    const user = await resolveUser(request);
    if (!user) return reply.status(401).send({ error: 'session_not_initialised', message: 'Call POST /auth/session first', statusCode: 401 });

    const result = await postService.updatePost(
      request.server.db,
      pid,
      user.id,
      user.role as Parameters<typeof postService.updatePost>[3],
      parsed.data.body,
    );
    if (!result.ok) return sendPostError(result.code, reply);

    broadcast(tid, { type: 'post.updated', payload: result.value });
    return reply.status(200).send(result.value);
  });

  /**
   * DELETE /threads/:tid/posts/:pid
   */
  app.delete('/:tid/posts/:pid', { preHandler: authenticate }, async (request, reply) => {
    const { tid, pid } = request.params as { tid: string; pid: string };

    const user = await resolveUser(request);
    if (!user) return reply.status(401).send({ error: 'session_not_initialised', message: 'Call POST /auth/session first', statusCode: 401 });

    const result = await postService.deletePost(
      request.server.db,
      pid,
      user.id,
      user.role as Parameters<typeof postService.deletePost>[3],
    );
    if (!result.ok) return sendPostError(result.code, reply);

    broadcast(tid, { type: 'post.deleted', payload: { postId: pid } });
    return reply.status(204).send();
  });

  /**
   * POST /threads/:tid/posts/:pid/react
   */
  app.post('/:tid/posts/:pid/react', { preHandler: authenticate }, async (request, reply) => {
    const { tid, pid } = request.params as { tid: string; pid: string };

    const parsed = reactBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_body', message: parsed.error.issues.map((i) => i.message).join(', '), statusCode: 400 });
    }

    const user = await resolveUser(request);
    if (!user) return reply.status(401).send({ error: 'session_not_initialised', message: 'Call POST /auth/session first', statusCode: 401 });

    const result = await postService.reactToPost(request.server.db, pid, user.id, parsed.data.type as ReactionType);
    if (!result.ok) return sendPostError(result.code, reply);

    broadcast(tid, { type: 'reaction.updated', payload: { postId: pid, reactionCounts: result.value } });
    return reply.status(200).send({ reactionCounts: result.value });
  });

  /**
   * DELETE /threads/:tid/posts/:pid/react
   */
  app.delete('/:tid/posts/:pid/react', { preHandler: authenticate }, async (request, reply) => {
    const { tid, pid } = request.params as { tid: string; pid: string };

    const parsed = reactBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_body', message: parsed.error.issues.map((i) => i.message).join(', '), statusCode: 400 });
    }

    const user = await resolveUser(request);
    if (!user) return reply.status(401).send({ error: 'session_not_initialised', message: 'Call POST /auth/session first', statusCode: 401 });

    const result = await postService.removeReaction(request.server.db, pid, user.id, parsed.data.type as ReactionType);
    if (!result.ok) return sendPostError(result.code, reply);

    broadcast(tid, { type: 'reaction.updated', payload: { postId: pid, reactionCounts: result.value } });
    return reply.status(200).send({ reactionCounts: result.value });
  });

  /**
   * POST /threads/:tid/posts/:pid/report
   */
  app.post('/:tid/posts/:pid/report', { preHandler: authenticate }, async (request, reply) => {
    const { pid } = request.params as { tid: string; pid: string };

    const parsed = reportBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_body', message: parsed.error.issues.map((i) => i.message).join(', '), statusCode: 400 });
    }

    const user = await resolveUser(request);
    if (!user) return reply.status(401).send({ error: 'session_not_initialised', message: 'Call POST /auth/session first', statusCode: 401 });

    const result = await postService.reportPost(request.server.db, pid, user.id, parsed.data.reason);
    if (!result.ok) return sendPostError(result.code, reply);

    return reply.status(204).send();
  });

  /**
   * POST /threads/:tid/posts/:pid/accept
   */
  app.post('/:tid/posts/:pid/accept', { preHandler: authenticate }, async (request, reply) => {
    const { tid, pid } = request.params as { tid: string; pid: string };

    const user = await resolveUser(request);
    if (!user) return reply.status(401).send({ error: 'session_not_initialised', message: 'Call POST /auth/session first', statusCode: 401 });

    const result = await postService.acceptAnswer(request.server.db, {
      postId: pid,
      threadId: tid,
      requesterId: user.id,
      requesterRole: user.role as Parameters<typeof postService.acceptAnswer>[1]['requesterRole'],
    });
    if (!result.ok) return sendPostError(result.code, reply);

    return reply.status(200).send(result.value);
  });

  /**
   * GET /threads/:tid/ws — WebSocket subscription for live thread updates
   */
  app.get('/:tid/ws', { websocket: true }, (connection: SocketStream, request: FastifyRequest) => {
    const { tid } = request.params as { tid: string };
    joinRoom(tid, connection.socket);
    connection.socket.on('close', () => leaveRoom(tid, connection.socket));
  });
}
