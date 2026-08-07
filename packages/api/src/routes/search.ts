import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as searchService from '../services/search';
import * as userRepo from '../repositories/user';

const searchQuerySchema = z.object({
  q:     z.string().min(1).max(500),
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function searchRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /forums/:fid/search
   * Public — runs semantic (meaning) and keyword+fuzzy (spelling/typo-
   * tolerant) search together and merges them into one ranked list (see
   * services/search.ts's searchThreads for the merge logic). Falls back to
   * keyword+fuzzy only if generating an embedding for the query fails.
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
    const { results, total, mode } = await searchService.searchThreads(
      request.server.db, fid, q, { page, limit }, request.server.ai.embed,
    );
    return reply.status(200).send({ results, total, page, limit, mode });
  });

  /**
   * GET /forums/:fid/search/comments
   * Same hybrid semantic + keyword+fuzzy merge as thread search above, but
   * searches every comment in the forum (not scoped to one thread) — backs
   * the search-results page's Comments section. See routes/comments.ts's
   * GET /:tid/comments/search for the thread-scoped version of this same
   * query, used by the in-thread "Search Comments" pill.
   */
  app.get('/:fid/search/comments', async (request, reply) => {
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
    const { results, total, mode } = await searchService.searchComments(
      request.server.db, fid, q, { page, limit }, request.server.ai.embed,
    );
    return reply.status(200).send({ results, total, page, limit, mode });
  });

  /**
   * GET /forums/:fid/search/users
   * Fuzzy-only (trigram similarity on display_name, see userRepo.searchUsers)
   * — backs the search-results page's People section. No semantic mode:
   * matching a name is about spelling, not meaning, and there's no stored
   * embedding for display names to compare against.
   */
  app.get('/:fid/search/users', async (request, reply) => {
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
    const { results, total } = await userRepo.searchUsers(request.server.db, fid, q, { page, limit });
    return reply.status(200).send({ results, total, page, limit });
  });
}
