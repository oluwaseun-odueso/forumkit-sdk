import { Client } from 'pg';
import { runner } from 'node-pg-migrate';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type MigrationResult = { applied: string[] };

// The one landmine already baked into the schema: 001_init.ts sizes
// `vector(${EMBEDDING_DIMENSION})` from an env var at migration time, and
// self-hosting docs warn it must never change post-migration. A human
// running `npm run db:migrate` by hand was the only thing that would ever
// notice a mismatch; automatic migration removes that person, so this
// guard replaces them. Skips silently on a fresh database (no `threads`
// table yet — nothing to compare against).
async function assertEmbeddingDimensionUnchanged(client: Client): Promise<void> {
  const expected = parseInt(process.env['EMBEDDING_DIMENSION'] ?? '384', 10);

  const { rows } = await client.query<{ type: string | null }>(
    `SELECT format_type(atttypid, atttypmod) AS type
     FROM pg_attribute
     WHERE attrelid = to_regclass('public.threads') AND attname = 'embedding' AND NOT attisdropped`,
  );
  const type = rows[0]?.type;
  if (!type) return; // fresh database — no existing column to compare against

  const match = /vector\((\d+)\)/.exec(type);
  const actual = match?.[1] ? parseInt(match[1], 10) : null;
  if (actual !== null && actual !== expected) {
    throw new Error(
      `EMBEDDING_DIMENSION is set to ${expected}, but the database's existing embedding ` +
        `columns are vector(${actual}). Changing this after the schema was created would ` +
        `corrupt the embedding columns — restore EMBEDDING_DIMENSION to ${actual}, or see ` +
        `docs/self-hosting.md for how to safely re-embed at a new dimension.`,
    );
  }
}

export async function runMigrations(databaseUrl: string): Promise<MigrationResult> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await assertEmbeddingDimensionUnchanged(client);
  } finally {
    await client.end();
  }

  const applied = await runner({
    databaseUrl,
    dir: path.join(__dirname, 'migrations'),
    migrationsTable: 'pgmigrations',
    direction: 'up',
    checkOrder: true,
  });

  return { applied: applied.map((m) => m.name) };
}
