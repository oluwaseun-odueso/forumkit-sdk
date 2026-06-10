import type { FastifyInstance } from 'fastify';

// TODO: implement forums routes
export async function forumsRoutes(app: FastifyInstance): Promise<void> {
  app.log.info('forums routes registered (stub)');
}

