import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import * as userRepo from '../repositories/user';
import * as threadRepo from '../repositories/thread';
import * as commentRepo from '../repositories/comment';

type UserRow = { id: string };

async function resolveUser(request: FastifyRequest): Promise<UserRow | null> {
  const payload = request.jwtPayload;
  const rows = await request.server.db<UserRow[]>`
    SELECT id FROM users
    WHERE external_id = ${payload.sub}
      AND forum_id    = ${payload.forumId}
  `;
  return rows[0] ?? null;
}

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100),
  bio: z.string().max(500).nullable().optional(),
  avatarUrl: z.string().max(600).nullable().optional(),
  bannerUrl: z.string().max(600).nullable().optional(),
  socialLinks: z
    .array(z.object({ platform: z.string().max(50), url: z.string().max(600) }))
    .max(20)
    .optional(),
});

const updateThemeSchema = z.object({
  themePreference: z.enum(['light', 'dark']).nullable(),
});

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  app.get('/:forumId/me', { preHandler: authenticate }, async (request, reply) => {
    const { forumId } = request.params as { forumId: string };
    const user = await resolveUser(request);
    if (!user) {
      return reply.status(401).send({
        error: 'session_not_initialised',
        message: 'Call POST /auth/session first',
        statusCode: 401,
      });
    }

    const [profile, postKarma, commentKarma] = await Promise.all([
      userRepo.findProfileById(request.server.db, user.id),
      threadRepo.getThreadKarma(request.server.db, forumId, user.id),
      commentRepo.getCommentKarma(request.server.db, forumId, user.id),
    ]);
    if (!profile) {
      return reply.status(404).send({ error: 'user_not_found', message: 'User not found', statusCode: 404 });
    }

    return reply.status(200).send({ ...profile, postKarma, commentKarma });
  });

  app.patch('/:forumId/me', { preHandler: authenticate }, async (request, reply) => {
    const { forumId } = request.params as { forumId: string };
    const user = await resolveUser(request);
    if (!user) {
      return reply.status(401).send({
        error: 'session_not_initialised',
        message: 'Call POST /auth/session first',
        statusCode: 401,
      });
    }

    const parsed = updateProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'invalid_body',
        message: parsed.error.issues.map(i => i.message).join(', '),
        statusCode: 400,
      });
    }

    const [updated, postKarma, commentKarma] = await Promise.all([
      userRepo.updateProfile(request.server.db, user.id, {
        displayName: parsed.data.displayName,
        bio: parsed.data.bio ?? null,
        avatarUrl: parsed.data.avatarUrl ?? null,
        bannerUrl: parsed.data.bannerUrl ?? null,
        socialLinks: parsed.data.socialLinks ?? [],
      }),
      threadRepo.getThreadKarma(request.server.db, forumId, user.id),
      commentRepo.getCommentKarma(request.server.db, forumId, user.id),
    ]);

    if (!updated) {
      return reply.status(404).send({ error: 'user_not_found', message: 'User not found', statusCode: 404 });
    }

    return reply.status(200).send({ ...updated, postKarma, commentKarma });
  });

  /**
   * PATCH /forums/:forumId/me/theme
   *
   * Separate from the main profile PATCH above so the Display Mode toggle
   * (in the account menu or Settings) can apply instantly on click, rather
   * than being gated behind the profile form's own "Save" button.
   */
  app.patch('/:forumId/me/theme', { preHandler: authenticate }, async (request, reply) => {
    const user = await resolveUser(request);
    if (!user) {
      return reply.status(401).send({
        error: 'session_not_initialised',
        message: 'Call POST /auth/session first',
        statusCode: 401,
      });
    }

    const parsed = updateThemeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'invalid_body',
        message: parsed.error.issues.map(i => i.message).join(', '),
        statusCode: 400,
      });
    }

    await userRepo.updateThemePreference(request.server.db, user.id, parsed.data.themePreference);
    return reply.status(200).send({ themePreference: parsed.data.themePreference });
  });
}
