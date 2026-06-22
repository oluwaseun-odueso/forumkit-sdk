import { describe, it, expect } from '@jest/globals';
import { signSessionToken, verifySessionToken } from '../../src/lib/session';

const SECRET = 'test-secret-value';
const BASE_OPTS = {
  sub: 'user-123',
  forumId: 'forum-abc',
  role: 'member' as const,
  exp: Math.floor(Date.now() / 1000) + 900,
};

describe('signSessionToken', () => {
  it('returns a string with exactly 2 dots', () => {
    const token = signSessionToken(BASE_OPTS, SECRET);
    expect(token.split('.').length).toBe(3);
  });

  it('encodes the correct payload', () => {
    const token = signSessionToken(BASE_OPTS, SECRET);
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));
    expect(payload.sub).toBe('user-123');
    expect(payload.forumId).toBe('forum-abc');
    expect(payload.role).toBe('member');
    expect(payload.iss).toBe('forumkit');
  });
});

describe('verifySessionToken', () => {
  it('returns payload for a valid token', () => {
    const token = signSessionToken(BASE_OPTS, SECRET);
    const result = verifySessionToken(token, SECRET);
    expect(result).not.toBeNull();
    expect(result?.sub).toBe('user-123');
    expect(result?.forumId).toBe('forum-abc');
    expect(result?.role).toBe('member');
    expect(result?.iss).toBe('forumkit');
  });

  it('returns null for a tampered signature', () => {
    const token = signSessionToken(BASE_OPTS, SECRET);
    const parts = token.split('.');
    const tampered = `${parts[0]}.${parts[1]}.invalidsignature`;
    expect(verifySessionToken(tampered, SECRET)).toBeNull();
  });

  it('returns null for an expired token', () => {
    const expired = signSessionToken({ ...BASE_OPTS, exp: Math.floor(Date.now() / 1000) - 1 }, SECRET);
    expect(verifySessionToken(expired, SECRET)).toBeNull();
  });

  it('returns null when verified with wrong secret', () => {
    const token = signSessionToken(BASE_OPTS, SECRET);
    expect(verifySessionToken(token, 'wrong-secret')).toBeNull();
  });

  it('returns null for a token with tampered payload', () => {
    const token = signSessionToken(BASE_OPTS, SECRET);
    const parts = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ ...BASE_OPTS, role: 'admin' })).toString('base64url');
    const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    expect(verifySessionToken(tampered, SECRET)).toBeNull();
  });

  it('returns null for a token with missing iss', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'x', forumId: 'y', role: 'member', iat: 0, exp: Date.now() + 999 })).toString('base64url');
    const { createHmac } = await import('crypto');
    const sig = createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url');
    const token = `${header}.${payload}.${sig}`;
    expect(verifySessionToken(token, SECRET)).toBeNull();
  });

  it('returns null for a malformed token (wrong number of parts)', () => {
    expect(verifySessionToken('onlyone', SECRET)).toBeNull();
    expect(verifySessionToken('two.parts', SECRET)).toBeNull();
  });
});
