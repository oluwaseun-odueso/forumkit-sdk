import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';

const sessionBodySchema = z.object({
  token: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /auth/session
   * Exchange a host-application JWT for a ForumKit session token.
   */
  app.post(
    '/session',
    {
      preHandler: authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      // @ts-expect-error — extended via declaration merging
      const payload = request.jwtPayload;

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

      // Issue a short-lived session token
      // In production, sign with FORUM_SECRET_KEY + user ID + expiry
      const sessionToken = Buffer.from(
        JSON.stringify({
          userId: user.id,
          forumId: payload.forumId,
          role: user.role,
          exp: Math.floor(Date.now() / 1000) + request.server.config.sessionTtlMinutes * 60,
        }),
      ).toString('base64url');

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
   * Invalidate current session (client-side operation for now).
   */
  app.delete('/session', async (_request, reply) => {
    return reply.status(204).send();
  });
}
