import type { FastifyInstance } from 'fastify';

// TODO: implement posts routes
export async function postsRoutes(app: FastifyInstance): Promise<void> {
  app.log.info('posts routes registered (stub)');
}
