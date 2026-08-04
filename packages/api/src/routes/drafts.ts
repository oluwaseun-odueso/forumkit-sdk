import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import * as draftService from '../services/draft';
import type { HostJWTPayload } from '@forumkit/types';

// body/title minimums mirror threadsRoutes.createBodySchema exactly — a
// draft that can be saved but can't later be posted as a real thread would
// just be a bug waiting to surface at submit time.
const draftContentSchema = z.object({
  activeTab: z.enum(['text', 'images', 'link']),
  tags: z.string(),
  body: z.string().min(1),
  linkUrl: z.string(),
  attachments: z.array(
    z.object({
      attachmentId: z.string().uuid(),
      attachmentUrl: z.string(),
      caption: z.string(),
      kind: z.enum(['image', 'video', 'file']),
      name: z.string(),
      sizeLabel: z.string(),
    }),
  ),
});

const createBodySchema = z.object({
  title: z.string().min(1).max(300),
  content: draftContentSchema,
});

const updateBodySchema = z.object({
  title: z.string().min(1).max(300).optional(),
  content: draftContentSchema.optional(),
});

type UserRow = { id: string };

async function resolveUser(request: FastifyRequest, forumId: string): Promise<UserRow | null> {
  const payload = request.jwtPayload;
  const rows = await request.server.db<UserRow[]>`
    SELECT id FROM users
    WHERE external_id = ${payload.sub}
      AND forum_id = ${forumId}
  `;
  return rows[0] ?? null;
}

function sendSessionRequired(reply: FastifyReply): FastifyReply {
  return reply.status(401).send({
    error: 'session_not_initialised',
    message: 'Call POST /auth/session first',
    statusCode: 401,
  });
}

function sendDraftError(code: draftService.DraftError, reply: FastifyReply): void {
  const map: Record<draftService.DraftError, [number, string]> = {
    draft_not_found: [404, 'Draft not found'],
    forbidden: [403, 'You do not have permission to perform this action'],
  };
  const [status, message] = map[code];
  void reply.status(status).send({ error: code, message, statusCode: status });
}

export async function draftsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /forums/:forumId/drafts
   * Lists the caller's own drafts, most recently updated first.
   */
  app.get('/:forumId/drafts', { preHandler: authenticate }, async (request, reply) => {
    const { forumId } = request.params as { forumId: string };

    const user = await resolveUser(request, forumId);
    if (!user) return sendSessionRequired(reply);

    const drafts = await draftService.listDrafts(request.server.db, forumId, user.id);
    return reply.status(200).send({ drafts });
  });

  /**
   * POST /forums/:forumId/drafts
   */
  app.post('/:forumId/drafts', { preHandler: authenticate }, async (request, reply) => {
    const { forumId } = request.params as { forumId: string };

    const parsed = createBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'invalid_body',
        message: parsed.error.issues.map((i) => i.message).join(', '),
        statusCode: 400,
      });
    }

    const user = await resolveUser(request, forumId);
    if (!user) return sendSessionRequired(reply);

    const draft = await draftService.createDraft(request.server.db, forumId, user.id, parsed.data.title, parsed.data.content);
    return reply.status(201).send(draft);
  });

  /**
   * GET /forums/:forumId/drafts/:draftId
   * Fetches one draft, for resuming it in the composer.
   */
  app.get('/:forumId/drafts/:draftId', { preHandler: authenticate }, async (request, reply) => {
    const { forumId, draftId } = request.params as { forumId: string; draftId: string };

    const user = await resolveUser(request, forumId);
    if (!user) return sendSessionRequired(reply);

    const result = await draftService.getDraft(request.server.db, forumId, draftId, user.id);
    if (!result.ok) {
      sendDraftError(result.code, reply);
      return;
    }
    return reply.status(200).send(result.value);
  });

  /**
   * PATCH /forums/:forumId/drafts/:draftId
   * Used both for explicit saves and periodic autosave from the composer.
   */
  app.patch('/:forumId/drafts/:draftId', { preHandler: authenticate }, async (request, reply) => {
    const { forumId, draftId } = request.params as { forumId: string; draftId: string };

    const parsed = updateBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'invalid_body',
        message: parsed.error.issues.map((i) => i.message).join(', '),
        statusCode: 400,
      });
    }

    const user = await resolveUser(request, forumId);
    if (!user) return sendSessionRequired(reply);

    const payload = request.jwtPayload as HostJWTPayload;

    const result = await draftService.updateDraft(
      request.server.db,
      request.server.storage,
      forumId,
      draftId,
      user.id,
      payload.role,
      parsed.data,
    );
    if (!result.ok) {
      sendDraftError(result.code, reply);
      return;
    }
    return reply.status(200).send(result.value);
  });

  /**
   * DELETE /forums/:forumId/drafts/:draftId
   */
  app.delete('/:forumId/drafts/:draftId', { preHandler: authenticate }, async (request, reply) => {
    const { forumId, draftId } = request.params as { forumId: string; draftId: string };

    const user = await resolveUser(request, forumId);
    if (!user) return sendSessionRequired(reply);

    const payload = request.jwtPayload as HostJWTPayload;

    const result = await draftService.deleteDraft(request.server.db, request.server.storage, forumId, draftId, user.id, payload.role);
    if (!result.ok) {
      sendDraftError(result.code, reply);
      return;
    }
    return reply.status(204).send();
  });
}
