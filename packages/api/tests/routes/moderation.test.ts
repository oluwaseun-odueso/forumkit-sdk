import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import type { DB } from '../../src/db';
import { buildTestApp, createTestForum, exchangeForSession, auth, cleanupForum } from '../helpers';

let app: FastifyInstance;
let db: DB;
let forumId: string;
let memberSession: string;
let modSession: string;
let queueItemId: string;

beforeAll(async () => {
  ({ app, db } = await buildTestApp());
  const forum = await createTestForum(app);
  forumId = forum.id;

  memberSession = await exchangeForSession(app, forumId, 'member', 'user-001');
  modSession = await exchangeForSession(app, forumId, 'moderator', 'mod-001');

  // Create a thread + post + report to seed the queue
  const t = await app.inject({
    method: 'POST',
    url: `/forums/${forumId}/threads`,
    headers: auth(memberSession),
    payload: { title: 'Moderation test thread', body: 'Content.', tagIds: [] },
  });
  const threadId = (JSON.parse(t.body) as { id: string }).id;

  const p = await app.inject({
    method: 'POST',
    url: `/threads/${threadId}/posts`,
    headers: auth(memberSession),
    payload: { body: 'Reported post content.' },
  });
  const postId = (JSON.parse(p.body) as { id: string }).id;

  await app.inject({
    method: 'POST',
    url: `/threads/${threadId}/posts/${postId}/report`,
    headers: auth(memberSession),
    payload: { reason: 'Test report' },
  });
});

afterAll(async () => {
  await cleanupForum(db, forumId);
  await app.close();
  await db.end();
});

describe('GET /moderation/queue', () => {
  it('returns queue items for a moderator', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/moderation/queue',
      headers: auth(modSession),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { items: { id: string }[]; total: number };
    expect(typeof body.total).toBe('number');
    expect(Array.isArray(body.items)).toBe(true);
    if (body.items.length > 0) {
      queueItemId = body.items[0]!.id;
    }
  });

  it('returns 403 for a member', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/moderation/queue',
      headers: auth(memberSession),
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('PATCH /moderation/queue/:id', () => {
  it('approves a pending item', async () => {
    if (!queueItemId) return;
    const res = await app.inject({
      method: 'PATCH',
      url: `/moderation/queue/${queueItemId}`,
      headers: auth(modSession),
      payload: { action: 'approved' },
    });
    expect(res.statusCode).toBe(200);
    expect((JSON.parse(res.body) as { status: string }).status).toBe('approved');
  });

  it('returns 409 when resolving an already-resolved item', async () => {
    if (!queueItemId) return;
    const res = await app.inject({
      method: 'PATCH',
      url: `/moderation/queue/${queueItemId}`,
      headers: auth(modSession),
      payload: { action: 'removed' },
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body)['error']).toBe('already_resolved');
  });
});
