import type { FastifyInstance } from 'fastify';

// TODO: implement search routes
export async function searchRoutes(app: FastifyInstance): Promise<void> {
  app.log.info('search routes registered (stub)');
}
