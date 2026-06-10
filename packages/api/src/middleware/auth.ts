import type { FastifyRequest, FastifyReply } from 'fastify';
import { createHmac, timingSafeEqual } from 'crypto';
import type { HostJWTPayload, UserRole } from '@forumkit/types';

/**
 * Decodes and verifies a host-application JWT.
 * The JWT is signed with HMAC-SHA256 using the FORUM_SECRET_KEY.
 * We verify manually rather than using a library to keep the dependency surface small.
 */
function verifyHostJWT(token: string, secret: string): HostJWTPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWT');

  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  // Verify signature
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

  // Decode payload
  const payload = JSON.parse(
    Buffer.from(payloadB64, 'base64url').toString('utf8'),
  ) as HostJWTPayload;

  // Check expiry
  if (Date.now() / 1000 > payload.exp) {
    throw new Error('JWT has expired');
  }

  return payload;
}

/**
 * Prehandler: authenticates the request using either:
 * 1. A host-app JWT (for SDK initialisation)
 * 2. A ForumKit session token (for subsequent API calls)
 *
 * Attaches `request.user` on success.
 */
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
  const config = request.server.config;

  try {
    const payload = verifyHostJWT(token, config.forumSecretKey);
    // Attach to request for downstream handlers
    // @ts-expect-error — we extend FastifyRequest via declaration merging in types
    request.jwtPayload = payload;
  } catch {
    return reply.status(401).send({
      error: 'invalid_token',
      message: 'Token is invalid or has expired',
      statusCode: 401,
    });
  }
}

/**
 * Factory: returns a prehandler that requires one of the specified roles.
 */
export function requireRole(...roles: UserRole[]) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // @ts-expect-error — extended via declaration merging
    const payload = request.jwtPayload as HostJWTPayload | undefined;
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
