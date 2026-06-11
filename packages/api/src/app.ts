import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { createRequire } from 'module';
import type { Config } from './config';
import type { DB } from './db';
import { buildAdapters } from '@forumkit/ai';

const require = createRequire(import.meta.url);
import { authRoutes } from './routes/auth';
import { forumsRoutes } from './routes/forums';
import { threadsRoutes } from './routes/threads';
import { postsRoutes } from './routes/posts';
import { searchRoutes } from './routes/search';
import { aiRoutes } from './routes/ai';
import { moderationRoutes } from './routes/moderation';

export async function buildApp(config: Config, db: DB): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify({
    logger:
      config.nodeEnv === 'development'
        ? { level: config.logLevel, transport: { target: require.resolve('pino-pretty'), options: { colorize: true } } }
        : { level: config.logLevel },
  });

  // ── Plugins ──────────────────────────────────────────────────────
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(websocket);

  // ── Decorators — make db, config, and AI adapters available on every request ───
  app.decorate('db', db);
  app.decorate('config', config);
  app.decorate('ai', await buildAdapters(config));

  // ── Routes ───────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(forumsRoutes, { prefix: '/forums' });
  await app.register(threadsRoutes, { prefix: '/forums' });
  await app.register(postsRoutes, { prefix: '/threads' });
  await app.register(searchRoutes, { prefix: '/forums' });
  await app.register(aiRoutes, { prefix: '/threads' });
  await app.register(moderationRoutes, { prefix: '/moderation' });

  // ── Health check ─────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // ── Global error handlers ────────────────────────────────────────
  // Ensures every error response — Fastify-generated or unhandled — uses
  // the standard ErrorResponse shape: { error, message, statusCode }.
  app.setNotFoundHandler((_request, reply) => {
    void reply.status(404).send({
      error: 'not_found',
      message: 'The requested route does not exist',
      statusCode: 404,
    });
  });

  app.setErrorHandler((err, request, reply) => {
    const statusCode = err.statusCode ?? 500;

    if (statusCode >= 500) {
      request.log.error({ err }, 'Unhandled server error');
    }

    void reply.status(statusCode).send({
      error: err.code ?? 'internal_error',
      message: statusCode >= 500 ? 'An unexpected error occurred' : err.message,
      statusCode,
    });
  });

  return app;
}
