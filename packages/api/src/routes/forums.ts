import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import * as forumService from '../services/forum';
import type { ForumError, TagError } from '../services/forum';
import type { ForumConfig } from '@forumkit/types';

const HEX_COLOR = z.string().regex(
  /^#[0-9A-Fa-f]{6}$/,
  'color must be a valid hex code e.g. #6200EE',
);

const createForumBodySchema = z.object({
  name: z.string().min(1).max(200),
  isPublic: z.boolean().optional().default(false),
});

const updateForumConfigSchema = z.object({
  isPublic: z.boolean().optional(),
  moderationThreshold: z.number().min(0).max(1).optional(),
  moderationReviewThreshold: z.number().min(0).max(1).optional(),
  aiEnabled: z.boolean().optional(),
  maxPostLength: z.number().int().min(1).optional(),
  requireApproval: z.boolean().optional(),
});

const createTagBodySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  color: HEX_COLOR.optional(),
});

const updateTagBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(300).optional(),
  color: HEX_COLOR.optional(),
});

function sendForumError(code: ForumError | TagError, reply: FastifyReply): void {
  if (code === 'forum_not_found') {
    void reply.status(404).send({
      error: 'forum_not_found',
      message: 'Forum not found',
      statusCode: 404,
    });
  } else if (code === 'tag_not_found') {
    void reply.status(404).send({
      error: 'tag_not_found',
      message: 'Tag not found',
      statusCode: 404,
    });
  } else if (code === 'tag_conflict') {
    void reply.status(409).send({
      error: 'tag_conflict',
      message: 'A tag with that name already exists in this forum',
      statusCode: 409,
    });
  }
}

export async function forumsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /forums
   * Admin only — creates a new forum. The JWT is verified for signature but
   * the forum referenced in the JWT need not exist yet (bootstrapping).
   */
  app.post(
    '/',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const parsed = createForumBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'invalid_body',
          message: parsed.error.issues.map((i) => i.message).join(', '),
          statusCode: 400,
        });
      }

      const forum = await forumService.createForum(request.server.db, parsed.data.name, parsed.data.isPublic);
      return reply.status(201).send(forum);
    },
  );

  /**
   * GET /forums/:fid
   * Public if the forum's config.isPublic is true.
   * Private forums require a valid token scoped to that forum.
   */
  app.get('/:fid', async (request, reply) => {
    const { fid } = request.params as { fid: string };
    const result = await forumService.getForum(request.server.db, fid);
    if (!result.ok) {
      sendForumError(result.code, reply);
      return;
    }
    if (!result.value.config.isPublic) {
      await authenticate(request, reply);
      if (reply.sent) return;
      if (request.jwtPayload.forumId !== fid) {
        return reply.status(403).send({
          error: 'forbidden',
          message: 'You do not have access to this forum',
          statusCode: 403,
        });
      }
    }
    return reply.status(200).send(result.value);
  });

  /**
   * PATCH /forums/:fid
   * Admin only — merges provided fields into the existing forum config.
   */
  app.patch(
    '/:fid',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { fid } = request.params as { fid: string };

      const parsed = updateForumConfigSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'invalid_body',
          message: parsed.error.issues.map((i) => i.message).join(', '),
          statusCode: 400,
        });
      }

      const patch = Object.fromEntries(
        Object.entries(parsed.data).filter(([, v]) => v !== undefined),
      ) as Partial<ForumConfig>;

      const result = await forumService.updateForumConfig(request.server.db, fid, patch);
      if (!result.ok) {
        sendForumError(result.code, reply);
        return;
      }
      return reply.status(200).send(result.value);
    },
  );

  /**
   * GET /forums/:fid/tags
   * Public.
   */
  app.get('/:fid/tags', async (request, reply) => {
    const { fid } = request.params as { fid: string };
    const result = await forumService.listTags(request.server.db, fid);
    if (!result.ok) {
      sendForumError(result.code, reply);
      return;
    }
    return reply.status(200).send(result.value);
  });

  /**
   * POST /forums/:fid/tags
   * Admin or moderator.
   */
  app.post(
    '/:fid/tags',
    { preHandler: [authenticate, requireRole('admin', 'moderator')] },
    async (request, reply) => {
      const { fid } = request.params as { fid: string };

      const parsed = createTagBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'invalid_body',
          message: parsed.error.issues.map((i) => i.message).join(', '),
          statusCode: 400,
        });
      }

      const result = await forumService.createTag(request.server.db, fid, parsed.data);
      if (!result.ok) {
        sendForumError(result.code, reply);
        return;
      }
      return reply.status(201).send(result.value);
    },
  );

  /**
   * PATCH /forums/:fid/tags/:tagId
   * Admin or moderator.
   */
  app.patch(
    '/:fid/tags/:tagId',
    { preHandler: [authenticate, requireRole('admin', 'moderator')] },
    async (request, reply) => {
      const { fid, tagId } = request.params as { fid: string; tagId: string };

      const parsed = updateTagBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'invalid_body',
          message: parsed.error.issues.map((i) => i.message).join(', '),
          statusCode: 400,
        });
      }

      const result = await forumService.updateTag(request.server.db, fid, tagId, parsed.data);
      if (!result.ok) {
        sendForumError(result.code, reply);
        return;
      }
      return reply.status(200).send(result.value);
    },
  );

  /**
   * DELETE /forums/:fid/tags/:tagId
   * Admin or moderator.
   */
  app.delete(
    '/:fid/tags/:tagId',
    { preHandler: [authenticate, requireRole('admin', 'moderator')] },
    async (request, reply) => {
      const { fid, tagId } = request.params as { fid: string; tagId: string };

      const result = await forumService.deleteTag(request.server.db, fid, tagId);
      if (!result.ok) {
        sendForumError(result.code, reply);
        return;
      }
      return reply.status(204).send();
    },
  );
}
