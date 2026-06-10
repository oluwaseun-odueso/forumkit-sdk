import type { FastifyInstance } from 'fastify';

// TODO: implement threads routes
export async function threadsRoutes(app: FastifyInstance): Promise<void> {
  app.log.info('threads routes registered (stub)');
}
