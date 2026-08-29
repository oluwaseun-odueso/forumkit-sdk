import type { FastifyInstance, FastifyReply } from 'fastify';
import { authenticate } from '../middleware/auth';
import { tryConsumeAiLimit } from '../lib/ai-rate-limit';
import { getCachedAsk, setCachedAsk } from '../lib/ask-cache';
import * as aiService from '../services/ai';
import * as searchService from '../services/search';
import { askSearchQuestion, askSearchQuestionStream } from '@forumkit/ai';
import type { AICommandError } from '../services/ai';

export async function composeAiRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /forums/:forumId/ai/suggest-metadata
   * Suggests a title and tags for a not-yet-created thread (compose modal).
   * Authenticated; rate-limited by user+forum (shared budget with thread AI commands).
   */
  app.post(
    '/:forumId/ai/suggest-metadata',
    { preHandler: authenticate },
    async (request, reply) => {
      const { forumId } = request.params as { forumId: string };
      const payload = request.jwtPayload;

      if (forumId !== payload.forumId) {
        return reply.status(403).send({
          error: 'forbidden',
          message: 'Forum ID does not match session',
          statusCode: 403,
        });
      }

      const rateLimitKey = `ai:${payload.sub}:${forumId}`;
      if (!tryConsumeAiLimit(rateLimitKey)) {
        return reply.status(429).send({
          error: 'rate_limit_exceeded',
          message: 'Max 50 AI commands per hour per forum',
          statusCode: 429,
        });
      }

      const { llm } = request.server.ai;
      if (!llm) {
        return reply.status(503).send({
          error: 'ai_not_configured',
          message: 'No AI provider is configured for this deployment',
          statusCode: 503,
        });
      }

      const reqBody = request.body as { title?: string; body?: string; existingTags?: string[] };
      const result = await aiService.suggestMetadata(
        {
          title: reqBody.title ?? '',
          body: reqBody.body ?? '',
          existingTagNames: Array.isArray(reqBody.existingTags) ? reqBody.existingTags : [],
        },
        llm,
      );

      return reply.status(200).send(result);
    },
  );

  /**
   * GET /forums/:forumId/ai/available
   * Returns whether LLM-powered AI features are configured for this deployment.
   * Authenticated; no DB queries, no rate limit — just checks the adapter.
   */
  app.get('/:forumId/ai/available', { preHandler: authenticate }, async (request, reply) => {
    return reply.send({ available: request.server.ai.llm !== null });
  });

  /**
   * POST /forums/:forumId/ai/ask
   * Runs a forum search for the query, feeds the top results to the LLM, and
   * returns a categorised summary with each bullet attributed to a source thread.
   * Authenticated; shares the existing 50-req/hr rate-limit bucket.
   */
  app.post('/:forumId/ai/ask', { preHandler: authenticate }, async (request, reply) => {
    const { forumId } = request.params as { forumId: string };
    const payload = request.jwtPayload;

    if (forumId !== payload.forumId) {
      return reply.status(403).send({ error: 'forbidden', message: 'Forum ID does not match session', statusCode: 403 });
    }

    const rateLimitKey = `ai:${payload.sub}:${forumId}`;
    if (!tryConsumeAiLimit(rateLimitKey)) {
      return reply.status(429).send({ error: 'rate_limit_exceeded', message: "You've reached the AI limit for this hour. Please try again later.", statusCode: 429 });
    }

    const { askLlm, embed } = request.server.ai;
    if (!askLlm) {
      return reply.status(503).send({ error: 'ai_not_configured', message: 'No AI provider is configured for this deployment', statusCode: 503 });
    }

    const reqBody = request.body as { q?: string };
    const q = typeof reqBody.q === 'string' ? reqBody.q.trim() : '';
    if (!q || q.length > 500) {
      return reply.status(400).send({ error: 'invalid_query', message: 'q must be 1–500 characters', statusCode: 400 });
    }

    // Cache check — skip search + LLM if we already have a fresh answer.
    const cached = getCachedAsk(forumId, q);
    if (cached) return reply.status(200).send(cached);

    const { results } = await searchService.searchThreads(
      request.server.db,
      request.server.config.publicApiUrl,
      forumId,
      q,
      { page: 1, limit: 8 },
      embed,
    );
    const sources = results.slice(0, 6);
    const context = sources.map(r => ({ title: r.title, bodySnippet: r.bodySnippet }));

    const answer = await askSearchQuestion(q, context, askLlm);
    if (!answer) {
      return reply.status(503).send({ error: 'ai_unavailable', message: 'Could not generate summary', statusCode: 503 });
    }

    setCachedAsk(forumId, q, { answer: { ...answer, suggestions: answer.suggestions ?? [] }, sources, suggestions: answer.suggestions ?? [] });
    return reply.status(200).send({ answer, sources });
  });

  /**
   * POST /forums/:forumId/ai/ask/stream
   * Same as /ask but streams the LLM response as Server-Sent Events (SSE).
   * Events: sources → intro → category×N → [DONE]
   */
  app.post('/:forumId/ai/ask/stream', { preHandler: authenticate }, async (request, reply) => {
    const { forumId } = request.params as { forumId: string };
    const payload = request.jwtPayload;

    if (forumId !== payload.forumId) {
      return reply.status(403).send({ error: 'forbidden', message: 'Forum ID does not match session', statusCode: 403 });
    }

    const rateLimitKey = `ai:${payload.sub}:${forumId}`;
    if (!tryConsumeAiLimit(rateLimitKey)) {
      return reply.status(429).send({ error: 'rate_limit_exceeded', message: "You've reached the AI limit for this hour. Please try again later.", statusCode: 429 });
    }

    const { askLlmStream, embed } = request.server.ai;
    if (!askLlmStream) {
      return reply.status(503).send({ error: 'ai_not_configured', message: 'No AI provider is configured for this deployment', statusCode: 503 });
    }

    const reqBody = request.body as { q?: string };
    const q = typeof reqBody.q === 'string' ? reqBody.q.trim() : '';
    if (!q || q.length > 500) {
      return reply.status(400).send({ error: 'invalid_query', message: 'q must be 1–500 characters', statusCode: 400 });
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const sendSSE = (data: object) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Everything after writeHead must be caught locally — once headers are
    // written Fastify's error handler can't send a 500, and an unhandled
    // rejection would crash the process with ERR_HTTP_HEADERS_SENT.
    try {
      // Cache hit — replay stored events and close.
      const cached = getCachedAsk(forumId, q);
      if (cached) {
        sendSSE({ type: 'sources', sources: cached.sources });
        sendSSE({ type: 'intro', text: cached.answer.intro });
        for (const cat of cached.answer.categories) {
          sendSSE({ type: 'category', title: cat.title, bullets: cat.bullets });
        }
        if (cached.suggestions.length > 0) {
          sendSSE({ type: 'suggestions', prompts: cached.suggestions });
        }
        reply.raw.write('data: [DONE]\n\n');
        reply.raw.end();
        return reply;
      }

      // Search
      const { results } = await searchService.searchThreads(
        request.server.db,
        request.server.config.publicApiUrl,
        forumId,
        q,
        { page: 1, limit: 8 },
        embed,
      );
      const sources = results.slice(0, 6);
      sendSSE({ type: 'sources', sources });

      // Stream LLM response — accumulate events to populate cache afterward.
      const accumulatedCategories: { title: string; bullets: { fact: string; quote: string; sourceIndex: number }[] }[] = [];
      let intro = '';
      let suggestions: string[] = [];

      const context = sources.map(r => ({ title: r.title, bodySnippet: r.bodySnippet }));
      try {
        await askSearchQuestionStream(q, context, askLlmStream, (event) => {
          sendSSE(event);
          if (event.type === 'intro') intro = event.text;
          if (event.type === 'category') accumulatedCategories.push(event);
          if (event.type === 'suggestions') suggestions = event.prompts;
        });
      } catch (err) {
        sendSSE({ type: 'error', message: 'Could not generate summary' });
        request.log.error({ err }, '[ai/ask/stream] LLM stream failed');
      }

      if (intro) {
        setCachedAsk(forumId, q, {
          answer: { intro, categories: accumulatedCategories, suggestions },
          sources,
          suggestions,
        });
      }
    } catch (err) {
      sendSSE({ type: 'error', message: 'Search failed' });
      request.log.error({ err }, '[ai/ask/stream] search failed');
    }

    reply.raw.write('data: [DONE]\n\n');
    reply.raw.end();
    return reply;
  });
}

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
   * POST /threads/:threadId/ai/surface-related
   * Finds threads with similar embeddings using pgvector cosine similarity.
   */
  app.post(
    '/:threadId/ai/surface-related',
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

      if (!row) return sendAIError('thread_not_found', reply);

      const rateLimitKey = `ai:${payload.sub}:${row.forum_id}`;
      if (!tryConsumeAiLimit(rateLimitKey)) return sendAIError('rate_limit_exceeded', reply);

      const result = await aiService.surfaceRelated(
        request.server.db,
        row.forum_id,
        threadId,
        request.server.ai.embed,
      );

      if (!result.ok) return sendAIError(result.code, reply);

      return reply.status(200).send({ related: result.value });
    },
  );

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

      const { llm: summariseLlm } = request.server.ai;
      if (!summariseLlm) {
        return reply.status(503).send({
          error: 'ai_not_configured',
          message: 'No AI provider is configured for this deployment',
          statusCode: 503,
        });
      }

      const result = await aiService.summarise(
        request.server.db,
        request.server.config.publicApiUrl,
        row.forum_id,
        threadId,
        summariseLlm,
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

      const { llm: suggestLlm } = request.server.ai;
      if (!suggestLlm) {
        return reply.status(503).send({
          error: 'ai_not_configured',
          message: 'No AI provider is configured for this deployment',
          statusCode: 503,
        });
      }

      const result = await aiService.suggest(
        request.server.db,
        request.server.config.publicApiUrl,
        row.forum_id,
        threadId,
        suggestLlm,
      );

      if (!result.ok) {
        return sendAIError(result.code, reply);
      }

      return reply.status(200).send({ suggestion: result.value });
    },
  );
}
