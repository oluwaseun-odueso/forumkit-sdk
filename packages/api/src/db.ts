import postgres from 'postgres';
import type { Config } from './config';

export type DB = ReturnType<typeof postgres>;

let _db: DB | null = null;

export function getDb(config: Config): DB {
  if (!_db) {
    _db = postgres(config.databasePoolUrl, {
      max: 10,
      idle_timeout: 30,
      connect_timeout: 10,
      onnotice: () => {},   // suppress notice logs
      // databasePoolUrl is Supabase's transaction-mode pooler (port 6543) —
      // successive queries in the same session can land on different
      // backend connections, so a statement prepared on one connection may
      // not exist when the next query is routed elsewhere ("prepared
      // statement ... does not exist"). Prepared statements are only safe
      // over a direct/session connection (databaseUrl, port 5432).
      prepare: false,
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
