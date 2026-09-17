// Runs pending migrations, then exits. This is the "automatic" trigger
// point for the version-based migrations described in docs/self-hosting.md
// — invoked as a discrete step before the API server starts (see
// deploy/Dockerfile and the root "start" script), never from inside the
// long-running server process itself. That split matters: DATABASE_URL is
// DDL-capable and is only ever handed to this short-lived process, which
// connects, migrates, and exits — the server process it hands off to only
// ever receives the pooled, non-DDL DATABASE_POOL_URL.
import { runMigrations } from '../migrate-runner';

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  console.error('[migrate] DATABASE_URL is required to run migrations');
  process.exit(1);
}

runMigrations(databaseUrl)
  .then(({ applied }) => {
    if (applied.length === 0) {
      console.log('[migrate] up to date, nothing to apply');
    } else {
      console.log(`[migrate] applied ${applied.length} migration(s): ${applied.join(', ')}`);
    }
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error('[migrate] failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
