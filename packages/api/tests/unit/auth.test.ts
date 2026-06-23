import { describe, it, expect } from '@jest/globals';
import { createHmac } from 'crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { authenticate, requireRole } from '../../src/middleware/auth';
import { signSessionToken } from '../../src/lib/session';

const SECRET = 'unit-test-secret';

function makeHostJWT(
  payload: object,
  secret = SECRET,
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function makeRequest(token?: string) {
  const req = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    server: { config: { forumSecretKey: SECRET } },
    jwtPayload: undefined as unknown,
  };
  return req as unknown as FastifyRequest & { jwtPayload: unknown };
}

function makeReply() {
  let code = 200;
  let sent: unknown = null;
  const reply = {
    status(c: number) { code = c; return reply; },
    send(b: unknown) { sent = b; return reply; },
    get statusCode() { return code; },
    get body() { return sent; },
  };
  return reply as unknown as FastifyReply & { statusCode: number; body: unknown };
}

const VALID_PAYLOAD = {
  sub: 'user-1',
  name: 'Alice',
  email: 'alice@test.com',
  role: 'member',
  forumId: 'forum-1',
  iat: 1,
  exp: Math.floor(Date.now() / 1000) + 600,
};

describe('authenticate — host JWT', () => {
  it('returns 401 when Authorization header is absent', async () => {
    const req = makeRequest();
    const reply = makeReply();
    await authenticate(req, reply);
    expect(reply.statusCode).toBe(401);
    expect((reply.body as { error: string }).error).toBe('missing_token');
  });

  it('accepts a valid host JWT and sets jwtPayload', async () => {
    const token = makeHostJWT(VALID_PAYLOAD);
    const req = makeRequest(token);
    const reply = makeReply();
    await authenticate(req, reply);
    expect(reply.statusCode).toBe(200);
    expect((req.jwtPayload as { sub: string }).sub).toBe('user-1');
    expect((req.jwtPayload as { role: string }).role).toBe('member');
  });

  it('returns 401 for a tampered signature', async () => {
    const token = makeHostJWT(VALID_PAYLOAD, 'wrong-secret');
    const req = makeRequest(token);
    const reply = makeReply();
    await authenticate(req, reply);
    expect(reply.statusCode).toBe(401);
    expect((reply.body as { error: string }).error).toBe('invalid_token');
  });

  it('returns 401 for an expired host JWT', async () => {
    const token = makeHostJWT({ ...VALID_PAYLOAD, exp: Math.floor(Date.now() / 1000) - 1 });
    const req = makeRequest(token);
    const reply = makeReply();
    await authenticate(req, reply);
    expect(reply.statusCode).toBe(401);
  });

  it('returns 401 for a malformed token (wrong number of parts)', async () => {
    const req = makeRequest('not.a.valid.jwt.here');
    const reply = makeReply();
    await authenticate(req, reply);
    expect(reply.statusCode).toBe(401);
  });
});

describe('authenticate — ForumKit session token', () => {
  it('accepts a valid session token and sets jwtPayload', async () => {
    const token = signSessionToken(
      { sub: 'user-1', forumId: 'forum-1', role: 'member', exp: Math.floor(Date.now() / 1000) + 600 },
      SECRET,
    );
    const req = makeRequest(token);
    const reply = makeReply();
    await authenticate(req, reply);
    expect(reply.statusCode).toBe(200);
    expect((req.jwtPayload as { sub: string }).sub).toBe('user-1');
    expect((req.jwtPayload as { iss: string }).iss).toBe('forumkit');
  });

  it('returns 401 for an expired session token', async () => {
    const token = signSessionToken(
      { sub: 'user-1', forumId: 'forum-1', role: 'member', exp: Math.floor(Date.now() / 1000) - 1 },
      SECRET,
    );
    const req = makeRequest(token);
    const reply = makeReply();
    await authenticate(req, reply);
    expect(reply.statusCode).toBe(401);
  });

  it('returns 401 for a session token signed with the wrong secret', async () => {
    const token = signSessionToken(
      { sub: 'user-1', forumId: 'forum-1', role: 'member', exp: Math.floor(Date.now() / 1000) + 600 },
      'wrong-secret',
    );
    const req = makeRequest(token);
    const reply = makeReply();
    await authenticate(req, reply);
    expect(reply.statusCode).toBe(401);
  });
});

describe('requireRole', () => {
  it('passes through when the role matches', async () => {
    const req = { jwtPayload: { role: 'admin' } } as unknown as FastifyRequest;
    const reply = makeReply();
    await requireRole('admin')(req, reply);
    expect(reply.statusCode).toBe(200);
  });

  it('passes when any of the listed roles matches', async () => {
    const req = { jwtPayload: { role: 'moderator' } } as unknown as FastifyRequest;
    const reply = makeReply();
    await requireRole('admin', 'moderator')(req, reply);
    expect(reply.statusCode).toBe(200);
  });

  it('returns 403 when the role is not in the allowed list', async () => {
    const req = { jwtPayload: { role: 'member' } } as unknown as FastifyRequest;
    const reply = makeReply();
    await requireRole('admin', 'moderator')(req, reply);
    expect(reply.statusCode).toBe(403);
    expect((reply.body as { error: string }).error).toBe('insufficient_permissions');
  });

  it('returns 401 when jwtPayload is missing', async () => {
    const req = { jwtPayload: undefined } as unknown as FastifyRequest;
    const reply = makeReply();
    await requireRole('admin')(req, reply);
    expect(reply.statusCode).toBe(401);
  });
});
