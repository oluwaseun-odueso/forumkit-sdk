import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Postgres has no ALTER TYPE ... DROP VALUE, so removing an enum value
  // means: rename the old type out of the way, create the new one, migrate
  // any existing rows, swap the column over, then drop the old type.
  pgm.sql(`ALTER TYPE user_role RENAME TO user_role_old`);

  // 'guest' was never behaviourally distinct from 'member' anywhere in the
  // application — no permission check ever branched on it. Any existing
  // guest rows become ordinary members rather than being left dangling.
  pgm.sql(`UPDATE users SET role = 'member' WHERE role::text = 'guest'`);

  pgm.sql(`CREATE TYPE user_role AS ENUM ('member', 'moderator', 'admin')`);
  pgm.sql(`ALTER TABLE users ALTER COLUMN role DROP DEFAULT`);
  pgm.sql(`ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::text::user_role`);
  pgm.sql(`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'member'`);
  pgm.sql(`DROP TYPE user_role_old`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Re-adds 'guest' to the enum. Cannot restore which rows were originally
  // guest before the up migration converted them to member.
  pgm.sql(`ALTER TYPE user_role RENAME TO user_role_new`);
  pgm.sql(`CREATE TYPE user_role AS ENUM ('guest', 'member', 'moderator', 'admin')`);
  pgm.sql(`ALTER TABLE users ALTER COLUMN role DROP DEFAULT`);
  pgm.sql(`ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::text::user_role`);
  pgm.sql(`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'member'`);
  pgm.sql(`DROP TYPE user_role_new`);
}
