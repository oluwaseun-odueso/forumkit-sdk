import type { Config } from './config.js';
import type { DB } from './db.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: DB;
    config: Config;
  }
}
