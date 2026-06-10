import type { Config } from './config';
import type { DB } from './db';

declare module 'fastify' {
  interface FastifyInstance {
    db: DB;
    config: Config;
  }
}
