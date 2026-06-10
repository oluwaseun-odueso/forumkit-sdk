import type { FastifyInstance } from 'fastify';

// TODO: implement moderation routes
export async function moderationRoutes(app: FastifyInstance): Promise<void> {
  app.log.info('moderation routes registered (stub)');
}
