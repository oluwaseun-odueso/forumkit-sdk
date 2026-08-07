import type { Config } from './config';
import type { DB } from './db';
import type { AIAdapters } from '@forumkit/ai';
import type { StorageAdapter } from '@forumkit/storage';
import type { AuthPayload } from '@forumkit/types';

declare module 'fastify' {
  interface FastifyInstance {
    db: DB;
    config: Config;
    ai: AIAdapters;
    storage: StorageAdapter;
  }
  interface FastifyRequest {
    jwtPayload: AuthPayload;
  }
}
