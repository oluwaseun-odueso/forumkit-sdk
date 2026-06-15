import type { FastifyRequest, FastifyReply } from 'fastify';
import { createHmac, timingSafeEqual } from 'crypto';
import type { HostJWTPayload, UserRole } from '@forumkit/types';
import { verifySessionToken } from '../lib/session';

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
