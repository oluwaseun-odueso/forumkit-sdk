import { createHmac, timingSafeEqual } from 'crypto';
import type { SessionTokenPayload, UserRole } from '@forumkit/types';

const HEADER_B64 = Buffer.from(
  JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
).toString('base64url');

type SignOpts = {
  sub: string;
  forumId: string;
  role: UserRole;
  exp: number;
};

export function signSessionToken(opts: SignOpts, secret: string): string {
  const payload: SessionTokenPayload = {
    ...opts,
    iss: 'forumkit',
    iat: Math.floor(Date.now() / 1000),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret)
    .update(`${HEADER_B64}.${payloadB64}`)
    .digest('base64url');
  return `${HEADER_B64}.${payloadB64}.${sig}`;
}

export function verifySessionToken(
  token: string,
  secret: string,
): SessionTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
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
    return null;
  }

  let payload: SessionTokenPayload;
  try {
    payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    ) as SessionTokenPayload;
  } catch {
    return null;
  }

  if (payload.iss !== 'forumkit') return null;
  if (Date.now() / 1000 > payload.exp) return null;
  return payload;
}
