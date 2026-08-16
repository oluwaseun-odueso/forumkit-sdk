import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import * as gifService from '../services/gif';

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(24),
});

export async function gifsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /forums/:forumId/gifs/search
   * Proxies GIPHY search so the API key never ships in the frontend bundle.
   * Requires GIPHY_API_KEY to be configured; returns 503 (not a 500) when
   * it isn't, since that's an expected, recoverable "feature not enabled
   * yet" state rather than a server error.
   */
  app.get('/:forumId/gifs/search', { preHandler: authenticate }, async (request, reply) => {
    const parsed = searchQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'invalid_query',
        message: parsed.error.issues.map((i) => i.message).join(', '),
        statusCode: 400,
      });
    }

    const apiKey = request.server.config.giphyApiKey;
    if (!apiKey) {
      return reply.status(503).send({
        error: 'gif_search_not_configured',
        message: 'GIF search is not configured for this forum yet.',
        statusCode: 503,
      });
    }

    const { q, limit } = parsed.data;
    const result = await gifService.searchGifs(apiKey, q, limit);
    if ('error' in result) {
      return reply.status(502).send({
        error: 'gif_provider_error',
        message: 'Could not reach the GIF provider. Try again.',
        statusCode: 502,
      });
    }

    return reply.status(200).send({ results: result });
  });
}
