import type { FastifyInstance } from 'fastify';
import type { HostJWTPayload, UserRole } from '@forumkit/types';
import { authenticate } from '../middleware/auth';
import { signSessionToken } from '../lib/session';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /auth/session
   * Exchange a host-application JWT for a ForumKit session token.
   */
  app.post(
    '/session',
    { preHandler: authenticate },
    async (request, reply) => {
      // This endpoint only accepts host JWTs — session tokens cannot be exchanged
      // for new session tokens (that would be circular). Guard against misuse.
      const rawPayload = request.jwtPayload as unknown;
      if (!('name' in (rawPayload as object))) {
        return reply.status(400).send({
          error: 'host_jwt_required',
          message: 'This endpoint requires a host application JWT, not a session token',
          statusCode: 400,
        });
      }
      const payload = rawPayload as HostJWTPayload;

      type UserRow = { id: string; role: string; banned_at: Date | null };

      // Upsert user from JWT claims
      const user = await request.server.db<UserRow[]>`
        INSERT INTO users (external_id, forum_id, display_name, email, role)
        VALUES (
          ${payload.sub},
          ${payload.forumId},
          ${payload.name},
          ${payload.email},
          ${payload.role}
        )
        ON CONFLICT (external_id, forum_id)
        DO UPDATE SET
          display_name = EXCLUDED.display_name,
          email        = EXCLUDED.email,
          role         = EXCLUDED.role
        RETURNING id, role, banned_at
      `.then((rows) => rows[0]);

      if (!user) {
        return reply.status(500).send({
          error: 'session_creation_failed',
          message: 'Failed to create session',
          statusCode: 500,
        });
      }

      if (user.banned_at) {
        return reply.status(403).send({
          error: 'user_banned',
          message: 'This account has been banned',
          statusCode: 403,
        });
      }

      const sessionToken = signSessionToken(
        {
          sub: payload.sub,
          forumId: payload.forumId,
          role: user.role as UserRole,
          exp: Math.floor(Date.now() / 1000) + request.server.config.sessionTtlMinutes * 60,
        },
        request.server.config.forumSecretKey,
      );

      return reply.status(200).send({
        sessionToken,
        userId: user.id,
        role: user.role,
        expiresIn: request.server.config.sessionTtlMinutes * 60,
      });
    },
  );

  /**
   * DELETE /auth/session
   * Invalidate current session (client-side operation — tokens are stateless).
   */
  app.delete('/session', async (_request, reply) => {
    return reply.status(204).send();
  });
}
