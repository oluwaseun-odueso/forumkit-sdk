import type { FastifyRequest, FastifyReply } from 'fastify';
import { createHmac, timingSafeEqual } from 'crypto';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { HostJWTPayload, UserRole } from '@forumkit/types';
import type { DB } from '../db';
import { verifySessionToken } from '../lib/session';

// Built once, cached by userPoolId rather than on first call unconditionally.
let cognitoVerifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;
let cachedUserPoolId: string | null = null;

function getCognitoVerifier(
  userPoolId: string | null,
  clientId: string | null,
): ReturnType<typeof CognitoJwtVerifier.create> | null {
  if (userPoolId === cachedUserPoolId) return cognitoVerifier;
  cachedUserPoolId = userPoolId;
  cognitoVerifier = userPoolId
    ? CognitoJwtVerifier.create({
        userPoolId,
        tokenUse: 'access', // AWS's documented purpose for API authorization, not the ID token
        clientId,
      })
    : null;
  return cognitoVerifier;
}

// Cognito's token has no room for a forumId claim — the caller
// (authenticate/optionalAuthenticate) resolves it from the users table,
// since the external_id is already known at that point.
async function verifyCognitoJWT(
  token: string,
  verifier: NonNullable<ReturnType<typeof getCognitoVerifier>>,
): Promise<Omit<HostJWTPayload, 'forumId'>> {
  const claims = await verifier.verify(token);
  const externalId = claims['custom:psos_user_id'] as string | undefined;
  if (!externalId) throw new Error('Cognito token missing custom:psos_user_id');

  return {
    sub: externalId, // NOT claims.sub — Cognito's own sub is unrelated to ForumKit's external_id
    name: (claims['name'] as string) ?? (claims['email'] as string) ?? 'Member',
    email: (claims['email'] as string) ?? '',
    role: 'member', // matches the current host-JWT bridge's existing default
    iat: claims.iat,
    exp: claims.exp,
  };
}

// Resolves forumId from the users table, since Cognito's token carries
// none. Undefined means a brand-new user — caller falls back to a
// client-supplied forumId for that case.
async function resolveCognitoForumId(
  db: DB,
  externalId: string,
): Promise<string | undefined> {
  const rows = await db<{ forum_id: string }[]>`
    SELECT DISTINCT forum_id FROM users WHERE external_id = ${externalId}
  `;
  if (rows.length > 1) {
    throw new Error(`Ambiguous forumId: external_id ${externalId} belongs to multiple forums`);
  }
  return rows[0]?.forum_id;
}

// Full Cognito auth attempt: verify the token, resolve forumId from the
// users table, and fall back to a client-supplied forumId in the request
// body for a brand-new user (no row yet). Throws on any failure; callers
// turn that into a 401.
async function authenticateViaCognito(
  token: string,
  verifier: NonNullable<ReturnType<typeof getCognitoVerifier>>,
  request: FastifyRequest,
): Promise<HostJWTPayload> {
  const payload = await verifyCognitoJWT(token, verifier);
  const forumId =
    (await resolveCognitoForumId(request.server.db, payload.sub)) ??
    (request.body as { forumId?: string } | undefined)?.forumId;
  if (!forumId) throw new Error('No forumId resolved and none supplied in request body');
  return { ...payload, forumId };
}

function verifyHostJWT(token: string, secret: string): HostJWTPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWT');

  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  const expected = createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureB64);

  if (
    expectedBuf.length !== actualBuf.length ||
    !timingSafeEqual(expectedBuf, actualBuf)
  ) {
    throw new Error('Invalid JWT signature');
  }

  const payload = JSON.parse(
    Buffer.from(payloadB64, 'base64url').toString('utf8'),
  ) as HostJWTPayload;

  if (Date.now() / 1000 > payload.exp) {
    throw new Error('JWT has expired');
  }

  return payload;
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: 'missing_token',
      message: 'Authorization header with Bearer token is required',
      statusCode: 401,
    });
  }

  const token = authHeader.slice(7);
  const { forumSecretKey } = request.server.config;

  // Peek at the JWT payload to decide which verifier to use
  let iss: string | undefined;
  const parts = token.split('.');
  if (parts.length === 3) {
    try {
      const raw = JSON.parse(
        Buffer.from(parts[1]!, 'base64url').toString('utf8'),
      ) as { iss?: string };
      iss = raw.iss;
    } catch {
      // ignore — verifier will reject the token below
    }
  }

  const cognito = getCognitoVerifier(
    request.server.config.cognitoUserPoolId,
    request.server.config.cognitoClientId,
  );

  if (iss === 'forumkit') {
    const session = verifySessionToken(token, forumSecretKey);
    if (!session) {
      return reply.status(401).send({
        error: 'invalid_token',
        message: 'Token is invalid or has expired',
        statusCode: 401,
      });
    }
    request.jwtPayload = session;
  } else if (cognito && iss?.startsWith('https://cognito-idp.')) {
    try {
      request.jwtPayload = await authenticateViaCognito(token, cognito, request);
    } catch {
      return reply.status(401).send({
        error: 'invalid_token',
        message: 'Token is invalid or has expired',
        statusCode: 401,
      });
    }
  } else {
    try {
      const payload = verifyHostJWT(token, forumSecretKey);
      request.jwtPayload = payload;
    } catch {
      return reply.status(401).send({
        error: 'invalid_token',
        message: 'Token is invalid or has expired',
        statusCode: 401,
      });
    }
  }
}

export async function optionalAuthenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return;

  const token = authHeader.slice(7);
  const { forumSecretKey } = request.server.config;

  let iss: string | undefined;
  const parts = token.split('.');
  if (parts.length === 3) {
    try {
      const raw = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as { iss?: string };
      iss = raw.iss;
    } catch { /* ignore */ }
  }

  const cognito = getCognitoVerifier(
    request.server.config.cognitoUserPoolId,
    request.server.config.cognitoClientId,
  );

  if (iss === 'forumkit') {
    const session = verifySessionToken(token, forumSecretKey);
    if (!session) {
      return reply.status(401).send({ error: 'invalid_token', message: 'Token is invalid or has expired', statusCode: 401 });
    }
    request.jwtPayload = session;
  } else if (cognito && iss?.startsWith('https://cognito-idp.')) {
    try {
      request.jwtPayload = await authenticateViaCognito(token, cognito, request);
    } catch {
      return reply.status(401).send({ error: 'invalid_token', message: 'Token is invalid or has expired', statusCode: 401 });
    }
  } else {
    try {
      const payload = verifyHostJWT(token, forumSecretKey);
      request.jwtPayload = payload;
    } catch {
      return reply.status(401).send({ error: 'invalid_token', message: 'Token is invalid or has expired', statusCode: 401 });
    }
  }
}

export function requireRole(...roles: UserRole[]) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const payload = request.jwtPayload as { role: UserRole } | undefined;
    if (!payload) {
      return reply.status(401).send({
        error: 'not_authenticated',
        message: 'Authentication required',
        statusCode: 401,
      });
    }
    if (!roles.includes(payload.role)) {
      return reply.status(403).send({
        error: 'insufficient_permissions',
        message: `This action requires one of the following roles: ${roles.join(', ')}`,
        statusCode: 403,
      });
    }
  };
}
