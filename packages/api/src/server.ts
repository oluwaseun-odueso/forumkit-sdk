import { loadConfig } from './config';
import { getDb, closeDb } from './db';
import { buildApp } from './app';

const config = loadConfig();
const db = getDb(config);
const app = await buildApp(config, db);

const shutdown = async (): Promise<void> => {
  app.log.info('Shutting down...');
  await app.close();
  await closeDb();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

try {
  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info(`ForumKit API running on port ${config.port}`);
} catch (err) {
  app.log.error(err);
  await closeDb();
  process.exit(1);
}
