import type { Config } from './config';
import type { DB } from './db';
import type { AIAdapters } from '@forumkit/ai';

declare module 'fastify' {
  interface FastifyInstance {
    db: DB;
    config: Config;
    ai: AIAdapters;
  }
}
