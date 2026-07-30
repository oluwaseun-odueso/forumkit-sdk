import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Reddit's public "hot" formula. Pure function of its inputs -> IMMUTABLE.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION fk_hot_score(up_count bigint, down_count bigint, created_at timestamptz)
    RETURNS double precision
    LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
      SELECT sign((up_count - down_count)::numeric)::double precision
           * log(10, greatest(abs(up_count - down_count), 1)::numeric)::double precision
           + extract(epoch FROM created_at) / 45000.0;
    $$
  `);

  // Wilson score lower bound, 95% confidence (z ~= 1.96) - avoids a 2-upvote
  // post outranking a 500-up/50-down post just because its ratio looks
  // better on a tiny sample.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION fk_wilson_lower_bound(up_count bigint, down_count bigint)
    RETURNS double precision
    LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
      WITH v AS (
        SELECT
          (up_count + down_count)::double precision AS n,
          CASE WHEN (up_count + down_count) = 0 THEN 0::double precision
               ELSE up_count::double precision / (up_count + down_count) END AS phat,
          1.96::double precision AS z
      )
      SELECT CASE WHEN n = 0 THEN 0::double precision
        ELSE (phat + z*z/(2*n) - z*sqrt((phat*(1-phat) + z*z/(4*n))/n)) / (1 + z*z/n)
      END
      FROM v;
    $$
  `);

  // Reddit-style vote velocity: net votes per hour since posting. Depends on
  // now() -> STABLE, not IMMUTABLE (order legitimately shifts between
  // requests as age advances, even with zero new votes). Paired with a hard
  // "created within the last 48 hours" filter at the query level (see
  // repositories/thread.ts) - old threads are excluded as candidates
  // entirely, not merely down-ranked, matching Reddit's actual Rising tab.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION fk_rising_score(up_count bigint, down_count bigint, created_at timestamptz)
    RETURNS double precision
    LANGUAGE sql STABLE PARALLEL SAFE AS $$
      SELECT (up_count - down_count)::double precision
           / GREATEST(extract(epoch FROM (now() - created_at)) / 3600.0, 1);
    $$
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DROP FUNCTION IF EXISTS fk_hot_score(bigint, bigint, timestamptz)`);
  pgm.sql(`DROP FUNCTION IF EXISTS fk_wilson_lower_bound(bigint, bigint)`);
  pgm.sql(`DROP FUNCTION IF EXISTS fk_rising_score(bigint, bigint, timestamptz)`);
}
