import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { FastifyRequest, FastifyReply } from 'fastify';

// Mocked before the module under test is imported — this test exercises
// *our* branching/fallback logic, not aws-jwt-verify's own crypto, which
// is a separately-maintained AWS library, not something to re-test here.
const verify = jest.fn<(token: string) => Promise<Record<string, unknown>>>();
const create = jest.fn(() => ({ verify }));

jest.unstable_mockModule('aws-jwt-verify', () => ({
  CognitoJwtVerifier: { create },
}));

const { authenticate, optionalAuthenticate } = await import('../../src/middleware/auth');

const TEST_USER_POOL_ID = 'us-east-1_testPool123';

const VALID_CLAIMS = {
  sub: 'cognito-internal-uuid', // deliberately NOT what external_id should become
  'custom:psos_user_id': 'test-user-42',
  email: 'alice@example.test',
  name: 'Alice',
  iat: 1,
  exp: Math.floor(Date.now() / 1000) + 600,
};

const COGNITO_ISS = `https://cognito-idp.us-east-1.amazonaws.com/${TEST_USER_POOL_ID}`;

function makeCognitoToken(claims: object = {}): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  // Signature is never actually checked — the mocked verify() is what
  // decides pass/fail, matching how the real aws-jwt-verify would reject
  // a bad signature before our code ever sees the claims.
  const body = Buffer.from(JSON.stringify({ iss: COGNITO_ISS, ...claims })).toString('base64url');
  return `${header}.${body}.fake-signature`;
}

function makeRequest(opts: {
  token?: string;
  cognitoUserPoolId?: string | null;
  dbRows?: { forum_id: string }[];
  body?: unknown;
}) {
  const db = jest.fn(() => Promise.resolve(opts.dbRows ?? []));
  const req = {
    headers: opts.token ? { authorization: `Bearer ${opts.token}` } : {},
    body: opts.body,
    server: {
      config: {
        forumSecretKey: 'unit-test-secret',
        // 'in' check, not ?? — a test explicitly passing null (meaning
        // "not configured") must not fall back to the default.
        cognitoUserPoolId: 'cognitoUserPoolId' in opts ? opts.cognitoUserPoolId : TEST_USER_POOL_ID,
        cognitoClientId: 'test-client-id',
      },
      db,
    },
    jwtPayload: undefined as unknown,
  };
  return req as unknown as FastifyRequest & { jwtPayload: unknown; body: unknown };
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

beforeEach(() => {
  verify.mockReset();
  create.mockClear();
});

describe('authenticate — Cognito', () => {
  it('accepts a valid Cognito token and resolves forumId from an existing users row', async () => {
    verify.mockResolvedValue(VALID_CLAIMS);
    const req = makeRequest({ token: makeCognitoToken(), dbRows: [{ forum_id: 'forum-existing' }] });
    const reply = makeReply();
    await authenticate(req, reply);

    expect(reply.statusCode).toBe(200);
    const payload = req.jwtPayload as { sub: string; forumId: string; role: string; email: string };
    expect(payload.sub).toBe('test-user-42'); // custom:psos_user_id, NOT claims.sub
    expect(payload.forumId).toBe('forum-existing');
    expect(payload.role).toBe('member');
    expect(payload.email).toBe('alice@example.test');
  });

  it('rejects a token missing custom:psos_user_id', async () => {
    verify.mockResolvedValue({ ...VALID_CLAIMS, 'custom:psos_user_id': undefined });
    const req = makeRequest({ token: makeCognitoToken({ 'custom:psos_user_id': undefined }) });
    const reply = makeReply();
    await authenticate(req, reply);
    expect(reply.statusCode).toBe(401);
  });

  it('falls back to a client-supplied forumId when no users row exists yet', async () => {
    verify.mockResolvedValue(VALID_CLAIMS);
    const req = makeRequest({ token: makeCognitoToken(), dbRows: [], body: { forumId: 'forum-from-body' } });
    const reply = makeReply();
    await authenticate(req, reply);

    expect(reply.statusCode).toBe(200);
    expect((req.jwtPayload as { forumId: string }).forumId).toBe('forum-from-body');
  });

  it('returns 401 when no users row exists and no forumId is in the body either', async () => {
    verify.mockResolvedValue(VALID_CLAIMS);
    const req = makeRequest({ token: makeCognitoToken(), dbRows: [] });
    const reply = makeReply();
    await authenticate(req, reply);
    expect(reply.statusCode).toBe(401);
  });

  it('returns 401 when the same external_id ambiguously belongs to multiple forums', async () => {
    verify.mockResolvedValue(VALID_CLAIMS);
    const req = makeRequest({
      token: makeCognitoToken(),
      dbRows: [{ forum_id: 'forum-a' }, { forum_id: 'forum-b' }],
    });
    const reply = makeReply();
    await authenticate(req, reply);
    expect(reply.statusCode).toBe(401);
  });

  it('returns 401 when aws-jwt-verify rejects the token (bad signature/expired)', async () => {
    verify.mockRejectedValue(new Error('signature verification failed'));
    const req = makeRequest({ token: makeCognitoToken() });
    const reply = makeReply();
    await authenticate(req, reply);
    expect(reply.statusCode).toBe(401);
  });

  it('falls through to the host-JWT path (and fails) when Cognito is not configured', async () => {
    const req = makeRequest({ token: makeCognitoToken(), cognitoUserPoolId: null });
    const reply = makeReply();
    await authenticate(req, reply);
    // Not a Cognito-shaped HS256 host JWT either, so this must fail as invalid —
    // the point is it never reaches the (unconfigured) Cognito path at all.
    expect(reply.statusCode).toBe(401);
    expect(verify).not.toHaveBeenCalled();
  });
});

describe('optionalAuthenticate — Cognito', () => {
  it('accepts a valid Cognito token the same way authenticate does', async () => {
    verify.mockResolvedValue(VALID_CLAIMS);
    const req = makeRequest({ token: makeCognitoToken(), dbRows: [{ forum_id: 'forum-existing' }] });
    const reply = makeReply();
    await optionalAuthenticate(req, reply);
    expect((req.jwtPayload as { forumId: string } | undefined)?.forumId).toBe('forum-existing');
  });

  it('does nothing when no Authorization header is present', async () => {
    const req = makeRequest({});
    const reply = makeReply();
    await optionalAuthenticate(req, reply);
    expect(req.jwtPayload).toBeUndefined();
    expect(reply.statusCode).toBe(200);
  });
});
