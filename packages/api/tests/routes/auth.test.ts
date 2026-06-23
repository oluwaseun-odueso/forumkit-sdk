import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import type { DB } from '../../src/db';
import { buildTestApp, createTestForum, makeHostToken, makeSessionToken, auth, cleanupForum } from '../helpers';

let app: FastifyInstance;
let db: DB;
let forumId: string;

beforeAll(async () => {
  ({ app, db } = await buildTestApp());
  const forum = await createTestForum(app);
  forumId = forum.id;
});

afterAll(async () => {
  await cleanupForum(db, forumId);
  await app.close();
  await db.end();
});

describe('POST /auth/session', () => {
  it('exchanges a valid admin host JWT for a session token', async () => {
    const token = makeHostToken({ sub: 'admin-001', name: 'Admin', role: 'admin', forumId });
    const res = await app.inject({
      method: 'POST',
      url: '/auth/session',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(typeof body['sessionToken']).toBe('string');
    expect((body['sessionToken'] as string).split('.').length).toBe(3);
    expect(body['role']).toBe('admin');
    expect(typeof body['userId']).toBe('string');
    expect(typeof body['expiresIn']).toBe('number');
  });

  it('exchanges a valid member host JWT for a session token', async () => {
    const token = makeHostToken({ sub: 'user-001', name: 'Alice', role: 'member', forumId });
    const res = await app.inject({
      method: 'POST',
      url: '/auth/session',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(body['role']).toBe('member');
  });

  it('rejects a session token (not a host JWT)', async () => {
    const sessionTok = makeSessionToken({ sub: 'admin-001', forumId, role: 'admin' });
    const res = await app.inject({
      method: 'POST',
      url: '/auth/session',
      headers: { authorization: `Bearer ${sessionTok}` },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(body['error']).toBe('host_jwt_required');
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/session' });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(body['error']).toBe('missing_token');
  });

  it('returns 401 for a tampered token', async () => {
    const token = makeHostToken({ sub: 'admin-001', name: 'Admin', role: 'admin', forumId });
    const parts = token.split('.');
    const tampered = `${parts[0]}.${parts[1]}.invalidsig`;
    const res = await app.inject({
      method: 'POST',
      url: '/auth/session',
      headers: { authorization: `Bearer ${tampered}` },
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body) as Record<string, unknown>;
    expect(body['error']).toBe('invalid_token');
  });
});

describe('DELETE /auth/session', () => {
  it('returns 204 (stateless logout)', async () => {
    const sessionTok = makeSessionToken({ sub: 'admin-001', forumId, role: 'admin' });
    const res = await app.inject({
      method: 'DELETE',
      url: '/auth/session',
      headers: auth(sessionTok),
    });
    expect(res.statusCode).toBe(204);
  });
});

describe('session token on a protected route', () => {
  it('returns 404 (not 401) when session token is used on a protected route', async () => {
    const sessionTok = makeSessionToken({ sub: 'admin-001', forumId, role: 'admin' });
    const res = await app.inject({
      method: 'PATCH',
      url: '/forums/00000000-0000-0000-0000-000000000000',
      headers: auth(sessionTok),
      payload: {},
    });
    expect(res.statusCode).toBe(404);
  });
});
