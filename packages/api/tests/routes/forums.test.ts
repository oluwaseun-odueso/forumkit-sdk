import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import type { DB } from '../../src/db';
import { buildTestApp, createTestForum, makeHostToken, makeSessionToken, auth, cleanupForum } from '../helpers';

let app: FastifyInstance;
let db: DB;
let forumId: string;
let adminToken: string;
let memberToken: string;
let adminSession: string;

beforeAll(async () => {
  ({ app, db } = await buildTestApp());
  const forum = await createTestForum(app);
  forumId = forum.id;
  adminToken = makeHostToken({ sub: 'admin-001', name: 'Admin', role: 'admin', forumId });
  memberToken = makeHostToken({ sub: 'user-001', name: 'Alice', role: 'member', forumId });
  adminSession = makeSessionToken({ sub: 'admin-001', forumId, role: 'admin' });
});

afterAll(async () => {
  await cleanupForum(db, forumId);
  await app.close();
  await db.end();
});

describe('POST /forums', () => {
  it('creates a forum with isPublic defaulting to false', async () => {
    const token = makeHostToken({ sub: 'admin-001', name: 'Admin', role: 'admin', forumId: 'bootstrap' });
    const res = await app.inject({
      method: 'POST',
      url: '/forums',
      headers: auth(token),
      payload: { name: 'Another Forum' },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as { id: string; config: { isPublic: boolean } };
    expect(body.config.isPublic).toBe(false);
    // cleanup
    await cleanupForum(db, body.id);
  });

  it('creates a public forum when isPublic: true', async () => {
    const token = makeHostToken({ sub: 'admin-001', name: 'Admin', role: 'admin', forumId: 'bootstrap' });
    const res = await app.inject({
      method: 'POST',
      url: '/forums',
      headers: auth(token),
      payload: { name: 'Public Forum', isPublic: true },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as { id: string; config: { isPublic: boolean } };
    expect(body.config.isPublic).toBe(true);
    await cleanupForum(db, body.id);
  });

  it('returns 403 when a member tries to create a forum', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/forums',
      headers: auth(memberToken),
      payload: { name: 'Nope' },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('GET /forums/:fid', () => {
  it('returns the forum with a valid same-forum token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/forums/${forumId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { id: string };
    expect(body.id).toBe(forumId);
  });

  it('returns 401 for a private forum with no token', async () => {
    const res = await app.inject({ method: 'GET', url: `/forums/${forumId}` });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)['error']).toBe('missing_token');
  });

  it('returns 403 for a token scoped to a different forum', async () => {
    const bootstrapToken = makeHostToken({ sub: 'admin-001', name: 'Admin', role: 'admin', forumId: 'bootstrap' });
    const res = await app.inject({
      method: 'GET',
      url: `/forums/${forumId}`,
      headers: { authorization: `Bearer ${bootstrapToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body)['error']).toBe('forbidden');
  });

  it('returns 404 for a non-existent forum', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/forums/00000000-0000-0000-0000-000000000000',
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)['error']).toBe('forum_not_found');
  });

  it('returns 200 without a token when forum is public', async () => {
    // Patch to public first
    await app.inject({
      method: 'PATCH',
      url: `/forums/${forumId}`,
      headers: auth(adminToken),
      payload: { isPublic: true },
    });
    const res = await app.inject({ method: 'GET', url: `/forums/${forumId}` });
    expect(res.statusCode).toBe(200);
    // Restore to private
    await app.inject({
      method: 'PATCH',
      url: `/forums/${forumId}`,
      headers: auth(adminToken),
      payload: { isPublic: false },
    });
  });
});

describe('PATCH /forums/:fid', () => {
  it('updates forum config', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/forums/${forumId}`,
      headers: auth(adminSession),
      payload: { moderationThreshold: 0.8 },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { config: { moderationThreshold: number } };
    expect(body.config.moderationThreshold).toBe(0.8);
  });

  it('returns 404 for a non-existent forum', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/forums/00000000-0000-0000-0000-000000000000',
      headers: auth(adminSession),
      payload: { aiEnabled: false },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('Tags', () => {
  let tagId: string;

  it('GET /forums/:fid/tags returns empty array initially', async () => {
    const res = await app.inject({ method: 'GET', url: `/forums/${forumId}/tags` });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([]);
  });

  it('POST /forums/:fid/tags creates a tag', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/forums/${forumId}/tags`,
      headers: auth(adminToken),
      payload: { name: 'javascript', description: 'JS stuff', color: '#F7DF1E' },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as { id: string; name: string };
    expect(body.name).toBe('javascript');
    tagId = body.id;
  });

  it('POST /forums/:fid/tags returns 409 for a duplicate name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/forums/${forumId}/tags`,
      headers: auth(adminToken),
      payload: { name: 'javascript' },
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body)['error']).toBe('tag_conflict');
  });

  it('PATCH /forums/:fid/tags/:id updates the tag', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/forums/${forumId}/tags/${tagId}`,
      headers: auth(adminToken),
      payload: { color: '#FFD700' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { color: string };
    expect(body.color).toBe('#FFD700');
  });

  it('DELETE /forums/:fid/tags/:id removes the tag', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/forums/${forumId}/tags/${tagId}`,
      headers: auth(adminToken),
    });
    expect(res.statusCode).toBe(204);
  });

  it('DELETE /forums/:fid/tags/:id returns 404 for missing tag', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/forums/${forumId}/tags/00000000-0000-0000-0000-000000000000`,
      headers: auth(adminToken),
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)['error']).toBe('tag_not_found');
  });
});
