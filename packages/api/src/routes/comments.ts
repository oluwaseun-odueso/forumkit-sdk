import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { SocketStream } from '@fastify/websocket';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import * as commentService from '../services/comment';
import type { CommentError } from '../services/comment';
import * as voteService from '../services/vote';
import * as saveService from '../services/save';
import { broadcast, joinRoom, leaveRoom } from '../lib/ws-rooms';
import type { ReactionType } from '@forumkit/types';

// ── Schemas ───────────────────────────────────────────────────────────

const createBodySchema = z.object({
  body: z.string().min(1),
  parentCommentId: z.string().uuid().optional(),
  attachmentIds: z.array(z.string().uuid()).max(10).optional(),
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

const voteBodySchema = z.object({ direction: z.union([z.literal(1), z.literal(-1)]) });

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

function sendCommentError(code: CommentError, reply: FastifyReply): void {
  const map: Record<CommentError, [number, string]> = {
    comment_not_found:   [404, 'Comment not found'],
    thread_not_found: [404, 'Thread not found'],
    thread_locked:    [403, 'Thread is locked and no longer accepting comments'],
    forbidden:        [403, 'You do not have permission to perform this action'],
  };
  const [status, message] = map[code];
  void reply.status(status).send({ error: code, message, statusCode: status });
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

// ── Routes ────────────────────────────────────────────────────────────

export async function commentsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /threads/:tid/comments
   */
  app.post('/:tid/comments', { preHandler: authenticate }, async (request, reply) => {
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
        message: `Comment body must not exceed ${request.server.config.maxPostLength} characters`,
        statusCode: 422,
      });
    }

    const result = await commentService.createComment(
      request.server.db,
      request.server.ai.embed,
      request.server.ai.moderate,
      {
        threadId: tid,
        authorId: user.id,
        body: parsed.data.body,
        parentCommentId: parsed.data.parentCommentId,
        attachmentIds: parsed.data.attachmentIds,
      },
    );

    if (!result.ok) return sendCommentError(result.code, reply);

    broadcast(tid, { type: 'comment.created', payload: result.value });
    return reply.status(201).send(result.value);
  });

  /**
   * PATCH /threads/:tid/comments/:cid
   */
  app.patch('/:tid/comments/:cid', { preHandler: authenticate }, async (request, reply) => {
    const { tid, cid } = request.params as { tid: string; cid: string };

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

    const result = await commentService.updateComment(
      request.server.db,
      cid,
      user.id,
      user.role as Parameters<typeof commentService.updateComment>[3],
      parsed.data.body,
    );
    if (!result.ok) return sendCommentError(result.code, reply);

    broadcast(tid, { type: 'comment.updated', payload: result.value });
    return reply.status(200).send(result.value);
  });

  /**
   * DELETE /threads/:tid/comments/:cid
   */
  app.delete('/:tid/comments/:cid', { preHandler: authenticate }, async (request, reply) => {
    const { tid, cid } = request.params as { tid: string; cid: string };

    const user = await resolveUser(request);
    if (!user) return reply.status(401).send({ error: 'session_not_initialised', message: 'Call POST /auth/session first', statusCode: 401 });

    const result = await commentService.deleteComment(
      request.server.db,
      cid,
      user.id,
      user.role as Parameters<typeof commentService.deleteComment>[3],
    );
    if (!result.ok) return sendCommentError(result.code, reply);

    broadcast(tid, { type: 'comment.deleted', payload: { commentId: cid } });
    return reply.status(204).send();
  });

  /**
   * POST /threads/:tid/comments/:cid/react
   */
  app.post('/:tid/comments/:cid/react', { preHandler: authenticate }, async (request, reply) => {
    const { tid, cid } = request.params as { tid: string; cid: string };

    const parsed = reactBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_body', message: parsed.error.issues.map((i) => i.message).join(', '), statusCode: 400 });
    }

    const user = await resolveUser(request);
    if (!user) return reply.status(401).send({ error: 'session_not_initialised', message: 'Call POST /auth/session first', statusCode: 401 });

    const result = await commentService.reactToComment(request.server.db, cid, user.id, parsed.data.type as ReactionType);
    if (!result.ok) return sendCommentError(result.code, reply);

    broadcast(tid, { type: 'reaction.updated', payload: { commentId: cid, reactionCounts: result.value } });
    return reply.status(200).send({ reactionCounts: result.value });
  });

  /**
   * DELETE /threads/:tid/comments/:cid/react
   */
  app.delete('/:tid/comments/:cid/react', { preHandler: authenticate }, async (request, reply) => {
    const { tid, cid } = request.params as { tid: string; cid: string };

    const parsed = reactBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_body', message: parsed.error.issues.map((i) => i.message).join(', '), statusCode: 400 });
    }

    const user = await resolveUser(request);
    if (!user) return reply.status(401).send({ error: 'session_not_initialised', message: 'Call POST /auth/session first', statusCode: 401 });

    const result = await commentService.removeReaction(request.server.db, cid, user.id, parsed.data.type as ReactionType);
    if (!result.ok) return sendCommentError(result.code, reply);

    broadcast(tid, { type: 'reaction.updated', payload: { commentId: cid, reactionCounts: result.value } });
    return reply.status(200).send({ reactionCounts: result.value });
  });

  /**
   * POST /threads/:tid/comments/:cid/vote
   * Toggles: voting the same direction again clears the vote; voting the
   * opposite direction flips it.
   */
  app.post('/:tid/comments/:cid/vote', { preHandler: authenticate }, async (request, reply) => {
    const { tid, cid } = request.params as { tid: string; cid: string };

    const parsed = voteBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_body', message: parsed.error.issues.map((i) => i.message).join(', '), statusCode: 400 });
    }

    const user = await resolveUser(request);
    if (!user) return reply.status(401).send({ error: 'session_not_initialised', message: 'Call POST /auth/session first', statusCode: 401 });

    const result = await voteService.voteOnComment(request.server.db, cid, user.id, parsed.data.direction);
    if (!result.ok) return sendVoteError(result.code, reply);

    broadcast(tid, { type: 'vote.updated', payload: { targetType: 'comment', targetId: cid, voteCounts: result.value.voteCounts } });
    return reply.status(200).send(result.value);
  });

  /**
   * DELETE /threads/:tid/comments/:cid/vote
   * Unconditionally clears the caller's vote.
   */
  app.delete('/:tid/comments/:cid/vote', { preHandler: authenticate }, async (request, reply) => {
    const { tid, cid } = request.params as { tid: string; cid: string };

    const user = await resolveUser(request);
    if (!user) return reply.status(401).send({ error: 'session_not_initialised', message: 'Call POST /auth/session first', statusCode: 401 });

    const result = await voteService.removeVoteFromComment(request.server.db, cid, user.id);
    if (!result.ok) return sendVoteError(result.code, reply);

    broadcast(tid, { type: 'vote.updated', payload: { targetType: 'comment', targetId: cid, voteCounts: result.value.voteCounts } });
    return reply.status(200).send(result.value);
  });

  /**
   * POST /threads/:tid/comments/:cid/save
   */
  app.post('/:tid/comments/:cid/save', { preHandler: authenticate }, async (request, reply) => {
    const { cid } = request.params as { tid: string; cid: string };

    const user = await resolveUser(request);
    if (!user) return reply.status(401).send({ error: 'session_not_initialised', message: 'Call POST /auth/session first', statusCode: 401 });

    const result = await saveService.saveComment(request.server.db, cid, user.id);
    if (!result.ok) return sendSaveError(result.code, reply);

    return reply.status(200).send({ saved: true });
  });

  /**
   * DELETE /threads/:tid/comments/:cid/save
   * Unsaves the comment.
   */
  app.delete('/:tid/comments/:cid/save', { preHandler: authenticate }, async (request, reply) => {
    const { cid } = request.params as { tid: string; cid: string };

    const user = await resolveUser(request);
    if (!user) return reply.status(401).send({ error: 'session_not_initialised', message: 'Call POST /auth/session first', statusCode: 401 });

    const result = await saveService.unsaveComment(request.server.db, cid, user.id);
    if (!result.ok) return sendSaveError(result.code, reply);

    return reply.status(200).send({ saved: false });
  });

  /**
   * POST /threads/:tid/comments/:cid/report
   */
  app.post('/:tid/comments/:cid/report', { preHandler: authenticate }, async (request, reply) => {
    const { cid } = request.params as { tid: string; cid: string };

    const parsed = reportBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_body', message: parsed.error.issues.map((i) => i.message).join(', '), statusCode: 400 });
    }

    const user = await resolveUser(request);
    if (!user) return reply.status(401).send({ error: 'session_not_initialised', message: 'Call POST /auth/session first', statusCode: 401 });

    const result = await commentService.reportComment(request.server.db, cid, user.id, parsed.data.reason);
    if (!result.ok) return sendCommentError(result.code, reply);

    return reply.status(204).send();
  });

  /**
   * POST /threads/:tid/comments/:cid/accept
   */
  app.post('/:tid/comments/:cid/accept', { preHandler: authenticate }, async (request, reply) => {
    const { tid, cid } = request.params as { tid: string; cid: string };

    const user = await resolveUser(request);
    if (!user) return reply.status(401).send({ error: 'session_not_initialised', message: 'Call POST /auth/session first', statusCode: 401 });

    const result = await commentService.acceptAnswer(request.server.db, {
      commentId: cid,
      threadId: tid,
      requesterId: user.id,
      requesterRole: user.role as Parameters<typeof commentService.acceptAnswer>[1]['requesterRole'],
    });
    if (!result.ok) return sendCommentError(result.code, reply);

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
