import { createHmac } from 'crypto';

// ── Config ────────────────────────────────────────────────────────────────────
// Must match FORUM_SECRET_KEY in your .env
const SECRET = "9buh8u238HNU00082blMyh8898jna0cnU£b249noIMDlaiubnkUIUBCBlmubUfiom";

// Run `POST /forums` first (using the bootstrap token below), then paste the
// returned forum `id` here and re-run this script.
const FORUM_ID = "0e53b554-16b0-47cf-983a-db68c02b362e";

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
const admin = makeJWT({
  sub: 'admin-001',
  name: 'Admin User',
  email: 'admin@test.com',
  role: 'admin',
  forumId: FORUM_ID,
  iat: now,
  exp,
});

const moderator = makeJWT({
  sub: 'mod-001',
  name: 'Mod User',
  email: 'mod@test.com',
  role: 'moderator',
  forumId: FORUM_ID,
  iat: now,
  exp,
});

const member = makeJWT({
  sub: 'user-001',
  name: 'Alice',
  email: 'alice@test.com',
  role: 'member',
  forumId: FORUM_ID,
  iat: now,
  exp,
});

const member2 = makeJWT({
  sub: 'user-002',
  name: 'Bob',
  email: 'bob@test.com',
  role: 'member',
  forumId: FORUM_ID,
  iat: now,
  exp,
});

// ── Output ────────────────────────────────────────────────────────────────────
console.log('BOOTSTRAP (use for POST /forums):');
console.log(bootstrap);
console.log();
console.log('ADMIN:');
console.log(admin);
console.log();
console.log('MODERATOR:');
console.log(moderator);
console.log();
console.log('MEMBER (Alice):');
console.log(member);
console.log();
console.log('MEMBER2 (Bob):');
console.log(member2);
