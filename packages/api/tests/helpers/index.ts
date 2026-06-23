import { createHmac } from 'crypto';
import type { FastifyInstance } from 'fastify';
import postgres from 'postgres';
import { buildApp } from '../../src/app';
import type { DB } from '../../src/db';
import { signSessionToken } from '../../src/lib/session';
import type { Config } from '../../src/config';
import type { UserRole } from '@forumkit/types';

export const TEST_SECRET = 'test-secret-only-for-automated-tests';

export const testConfig: Config = {
  databaseUrl: process.env['DATABASE_URL'] ?? '',
  databasePoolUrl: process.env['DATABASE_URL'] ?? '',
  forumSecretKey: TEST_SECRET,
  port: 3001,
  logLevel: 'silent',
  nodeEnv: 'test',
  sessionTtlMinutes: 15,
  maxPostLength: 10000,
  aiProvider: 'local',
  openaiApiKey: null,
  anthropicApiKey: process.env['ANTHROPIC_API_KEY'] ?? null,
  moderationProvider: 'local',
  perspectiveApiKey: null,
  embeddingProvider: 'local',
  embeddingDimension: 384,
};

export function makeHostToken(opts: {
  sub: string;
  name: string;
  role: UserRole;
  forumId: string;
  email?: string;
}): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({
    sub: opts.sub,
    name: opts.name,
    email: opts.email ?? `${opts.sub}@test.com`,
    role: opts.role,
    forumId: opts.forumId,
    iat: now,
    exp: now + 900,
  })).toString('base64url');
  const sig = createHmac('sha256', TEST_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function makeSessionToken(opts: {
  sub: string;
  forumId: string;
  role: UserRole;
}): string {
  return signSessionToken(
    { sub: opts.sub, forumId: opts.forumId, role: opts.role, exp: Math.floor(Date.now() / 1000) + 900 },
    TEST_SECRET,
  );
}

export async function buildTestApp(): Promise<{ app: FastifyInstance; db: DB }> {
  const db = postgres(testConfig.databaseUrl, { max: 2, idle_timeout: 5, connect_timeout: 10, onnotice: () => {} });
  const app = await buildApp(testConfig, db);
  await app.ready();
  return { app, db };
}

export async function createTestForum(
  app: FastifyInstance,
  opts: { name?: string; isPublic?: boolean } = {},
): Promise<{ id: string; name: string; config: Record<string, unknown> }> {
  const token = makeHostToken({ sub: 'admin-001', name: 'Admin', role: 'admin', forumId: 'bootstrap' });
  const res = await app.inject({
    method: 'POST',
    url: '/forums',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    payload: { name: opts.name ?? `Test Forum ${Date.now()}`, isPublic: opts.isPublic ?? false },
  });
  if (res.statusCode !== 201) throw new Error(`createTestForum failed ${res.statusCode}: ${res.body}`);
  return JSON.parse(res.body) as { id: string; name: string; config: Record<string, unknown> };
}

export async function exchangeForSession(
  app: FastifyInstance,
  forumId: string,
  role: UserRole,
  sub = 'test-user',
): Promise<string> {
  const token = makeHostToken({ sub, name: `User ${sub}`, role, forumId });
  const res = await app.inject({
    method: 'POST',
    url: '/auth/session',
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.statusCode !== 200) throw new Error(`exchangeForSession failed ${res.statusCode}: ${res.body}`);
  return (JSON.parse(res.body) as { sessionToken: string }).sessionToken;
}

export function auth(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

export async function cleanupForum(db: DB, forumId: string): Promise<void> {
  // threads → posts (CASCADE), must go before forums → users (CASCADE) to avoid FK violation
  await db`DELETE FROM threads WHERE forum_id = ${forumId}`;
  await db`DELETE FROM forums WHERE id = ${forumId}`;
}
