import type { FastifyInstance, FastifyReply } from 'fastify';
import { authenticate } from '../middleware/auth';
import { tryConsumeAiLimit } from '../lib/ai-rate-limit';
import * as aiService from '../services/ai';
import type { AICommandError } from '../services/ai';

function sendAIError(
  code: AICommandError | 'rate_limit_exceeded',
  reply: FastifyReply,
): void {
  if (code === 'thread_not_found') {
    void reply.status(404).send({
      error: 'thread_not_found',
      message: 'Thread not found',
      statusCode: 404,
    });
  } else if (code === 'rate_limit_exceeded') {
    void reply.status(429).send({
      error: 'rate_limit_exceeded',
      message: 'Max 50 AI commands per hour per forum',
      statusCode: 429,
    });
  } else {
    void reply.status(503).send({
      error: 'ai_unavailable',
      message: 'AI assistant is not available for this deployment',
      statusCode: 503,
    });
  }
}

export async function aiRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /threads/:threadId/ai/summarise
   * Summarises a thread discussion using the configured LLM.
   */
  app.post(
    '/:threadId/ai/summarise',
    { preHandler: authenticate },
    async (request, reply) => {
      const { threadId } = request.params as { threadId: string };
      const payload = request.jwtPayload;

      type ThreadRow = { forum_id: string };
      const row = await request.server.db<ThreadRow[]>`
        SELECT forum_id FROM threads
        WHERE id = ${threadId} AND status != 'deleted'
        LIMIT 1
      `.then((rows) => rows[0]);

      if (!row) {
        return sendAIError('thread_not_found', reply);
      }

      const rateLimitKey = `ai:${payload.sub}:${row.forum_id}`;
      if (!tryConsumeAiLimit(rateLimitKey)) {
        return sendAIError('rate_limit_exceeded', reply);
      }

      const result = await aiService.summarise(
        request.server.db,
        row.forum_id,
        threadId,
        request.server.ai.llm,
      );

      if (!result.ok) {
        return sendAIError(result.code, reply);
      }

      return reply.status(200).send({ summary: result.value });
    },
  );

  /**
   * POST /threads/:threadId/ai/suggest
   * Suggests an answer for the thread using the configured LLM.
   */
  app.post(
    '/:threadId/ai/suggest',
    { preHandler: authenticate },
    async (request, reply) => {
      const { threadId } = request.params as { threadId: string };
      const payload = request.jwtPayload;

      type ThreadRow = { forum_id: string };
      const row = await request.server.db<ThreadRow[]>`
        SELECT forum_id FROM threads
        WHERE id = ${threadId} AND status != 'deleted'
        LIMIT 1
      `.then((rows) => rows[0]);

      if (!row) {
        return sendAIError('thread_not_found', reply);
      }

      const rateLimitKey = `ai:${payload.sub}:${row.forum_id}`;
      if (!tryConsumeAiLimit(rateLimitKey)) {
        return sendAIError('rate_limit_exceeded', reply);
      }

      const result = await aiService.suggest(
        request.server.db,
        row.forum_id,
        threadId,
        request.server.ai.llm,
      );

      if (!result.ok) {
        return sendAIError(result.code, reply);
      }

      return reply.status(200).send({ suggestion: result.value });
    },
  );
}
