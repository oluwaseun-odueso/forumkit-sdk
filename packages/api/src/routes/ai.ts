import type { FastifyInstance } from 'fastify';

// TODO: implement ai routes
export async function aiRoutes(app: FastifyInstance): Promise<void> {
  app.log.info('ai routes registered (stub)');
}
