import { createHmac } from 'crypto';

// ── Config ────────────────────────────────────────────────────────────────────
// Must match FORUM_SECRET_KEY in your .env
const SECRET = "9buh8u238HNU00082blMyh8898jna0cnU£b249noIMDlaiubnkUIUBCBlmubUfiom";

// "ForumKit Dev Forum" — the one with real seeded content (80 threads), not
// one of the empty scratch forums created by earlier test runs.
const FORUM_ID = "581e35a0-0ede-40bd-bc42-c9aea66dc11f";

// Token TTL in seconds (900 = 15 minutes — re-run script when they expire)
const TTL = 900;

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeJWT(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

const now = Math.floor(Date.now() / 1000);
const exp = now + TTL;

// ── Bootstrap token ───────────────────────────────────────────────────────────
// Use this ONCE to call POST /forums (forumId doesn't need to exist yet).
const bootstrap = makeJWT({
  sub: 'admin-001',
  name: 'Admin User',
  email: 'admin@test.com',
  role: 'admin',
  forumId: 'bootstrap',
  iat: now,
  exp,
});

// ── Role tokens ───────────────────────────────────────────────────────────────
// Use these for all other test steps (after FORUM_ID is set above).
// sub/name/email match the real seeded rows for this forum exactly — the
// session-exchange route upserts on (external_id, forum_id) and overwrites
// display_name/email/role from whatever the JWT claims on every login, so a
// placeholder email here would silently clobber the real seeded value.
const admin = makeJWT({
  sub: 'seed-user-1',
  name: 'Alice Dev',
  email: 'alice@example.com',
  role: 'admin',
  forumId: FORUM_ID,
  iat: now,
  exp,
});

// No moderator was seeded for this forum — this sub doesn't exist yet, so
// logging in with it creates a fresh moderator with no history. Fine for
// permission-flow testing, just don't expect any content under this user.
const moderator = makeJWT({
  sub: 'seed-mod-test',
  name: 'Mod User',
  email: 'mod@test.com',
  role: 'moderator',
  forumId: FORUM_ID,
  iat: now,
  exp,
});

const member = makeJWT({
  sub: 'seed-user-2',
  name: 'Bob Engineer',
  email: 'bob@example.com',
  role: 'member',
  forumId: FORUM_ID,
  iat: now,
  exp,
});

const member2 = makeJWT({
  sub: 'seed-user-3',
  name: 'Carol Tester',
  email: 'carol@example.com',
  role: 'member',
  forumId: FORUM_ID,
  iat: now,
  exp,
});

// ── Output ────────────────────────────────────────────────────────────────────
console.log('BOOTSTRAP (use for POST /forums):');
console.log(bootstrap);
console.log();
console.log('ADMIN (Alice Dev):');
console.log(admin);
console.log();
console.log('MODERATOR (fresh, no history):');
console.log(moderator);
console.log();
console.log('MEMBER (Bob Engineer):');
console.log(member);
console.log();
console.log('MEMBER2 (Carol Tester):');
console.log(member2);
console.log();
console.log(`FORUM_ID: ${FORUM_ID}`);
