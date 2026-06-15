import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { embedOne } from '@forumkit/ai';
import * as searchRepo from '../repositories/search';

const searchQuerySchema = z.object({
  q:     z.string().min(1).max(500),
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function searchRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /forums/:fid/search
   * Public. Auto-selects semantic search if an embedding provider is
   * configured, otherwise falls back to keyword (PostgreSQL FTS).
   */
  app.get('/:fid/search', async (request, reply) => {
    const { fid } = request.params as { fid: string };

    const parsed = searchQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'invalid_query',
        message: parsed.error.issues.map((i) => i.message).join(', '),
        statusCode: 400,
      });
    }

    const { q, page, limit } = parsed.data;
    const opts = { page, limit };

    const vector = await embedOne(q, request.server.ai.embed);

    if (vector) {
      const { results, total } = await searchRepo.semanticSearch(request.server.db, fid, vector, opts);
      return reply.status(200).send({ results, total, page, limit, mode: 'semantic' });
    }

    const { results, total } = await searchRepo.keywordSearch(request.server.db, fid, q, opts);
    return reply.status(200).send({ results, total, page, limit, mode: 'keyword' });
  });
}
