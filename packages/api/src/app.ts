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

  return app;
}
