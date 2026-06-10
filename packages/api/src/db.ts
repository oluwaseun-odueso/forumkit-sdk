import postgres from 'postgres';
import type { Config } from './config.js';

export type DB = ReturnType<typeof postgres>;

let _db: DB | null = null;

export function getDb(config: Config): DB {
  if (!_db) {
    _db = postgres(config.databasePoolUrl, {
      max: 10,
      idle_timeout: 30,
      connect_timeout: 10,
      onnotice: () => {},   // suppress notice logs
    });
  }
  return _db;
}

export async function closeDb(): Promise<void> {
  if (_db) {
    await _db.end();
    _db = null;
  }
}
