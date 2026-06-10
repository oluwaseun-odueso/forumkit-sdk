import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { createRequire } from 'module';
import type { Config } from './config.js';
import type { DB } from './db.js';

const require = createRequire(import.meta.url);
import { authRoutes } from './routes/auth.js';
import { forumsRoutes } from './routes/forums.js';
import { threadsRoutes } from './routes/threads.js';
import { postsRoutes } from './routes/posts.js';
import { searchRoutes } from './routes/search.js';
import { aiRoutes } from './routes/ai.js';
import { moderationRoutes } from './routes/moderation.js';

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

  // ── Decorators — make db and config available on every request ───
  app.decorate('db', db);
  app.decorate('config', config);

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
