import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import type { DB } from '../../src/db';
import { buildTestApp, createTestForum, exchangeForSession, auth, cleanupForum } from '../helpers';

let app: FastifyInstance;
let db: DB;
let forumId: string;
let threadId: string;
let memberSession: string;
let member2Session: string;
let adminSession: string;
let post1Id: string;
let post2Id: string;

beforeAll(async () => {
  ({ app, db } = await buildTestApp());
  const forum = await createTestForum(app);
  forumId = forum.id;

  memberSession = await exchangeForSession(app, forumId, 'member', 'user-001');
  member2Session = await exchangeForSession(app, forumId, 'member', 'user-002');
  adminSession = await exchangeForSession(app, forumId, 'admin', 'admin-001');

  const t = await app.inject({
    method: 'POST',
    url: `/forums/${forumId}/threads`,
    headers: auth(memberSession),
    payload: { title: 'Test thread for posts', body: 'Body text.', tagIds: [] },
  });
  threadId = (JSON.parse(t.body) as { id: string }).id;
});

afterAll(async () => {
  await cleanupForum(db, forumId);
  await app.close();
  await db.end();
});

describe('POST /threads/:tid/posts', () => {
  it('creates a top-level post', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/threads/${threadId}/posts`,
      headers: auth(memberSession),
      payload: { body: 'You can use slicing: my_string[::-1]' },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as { id: string; parentPostId: null };
    expect(body.parentPostId).toBeNull();
    post1Id = body.id;
  });

  it('creates a nested reply', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/threads/${threadId}/posts`,
      headers: auth(member2Session),
      payload: { body: 'Or use reversed() and join', parentPostId: post1Id },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as { id: string; parentPostId: string };
    expect(body.parentPostId).toBe(post1Id);
    post2Id = body.id;
  });

  it('returns 401 without a token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/threads/${threadId}/posts`,
      payload: { body: 'should fail' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('PATCH /threads/:tid/posts/:pid', () => {
  it('author can edit their post', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/threads/${threadId}/posts/${post1Id}`,
      headers: auth(memberSession),
      payload: { body: 'Updated body content.' },
    });
    expect(res.statusCode).toBe(200);
    expect((JSON.parse(res.body) as { body: string }).body).toBe('Updated body content.');
  });

  it('returns 403 when a different user tries to edit', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/threads/${threadId}/posts/${post1Id}`,
      headers: auth(member2Session),
      payload: { body: 'Stolen edit' },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('Reactions', () => {
  it('adds a reaction', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/threads/${threadId}/posts/${post1Id}/react`,
      headers: auth(member2Session),
      payload: { type: 'helpful' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { reactionCounts: Record<string, number> };
    expect(body.reactionCounts['helpful']).toBe(1);
  });

  it('adds a second reaction type', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/threads/${threadId}/posts/${post1Id}/react`,
      headers: auth(adminSession),
      payload: { type: 'insightful' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { reactionCounts: Record<string, number> };
    expect(body.reactionCounts['helpful']).toBe(1);
    expect(body.reactionCounts['insightful']).toBe(1);
  });

  it('removes a reaction', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/threads/${threadId}/posts/${post1Id}/react`,
      headers: auth(member2Session),
      payload: { type: 'helpful' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { reactionCounts: Record<string, number> };
    expect(body.reactionCounts['helpful']).toBeUndefined();
    expect(body.reactionCounts['insightful']).toBe(1);
  });
});

describe('POST /threads/:tid/posts/:pid/report', () => {
  it('reports a post and returns 204', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/threads/${threadId}/posts/${post2Id}/report`,
      headers: auth(memberSession),
      payload: { reason: 'Off-topic' },
    });
    expect(res.statusCode).toBe(204);
  });
});

describe('POST /threads/:tid/posts/:pid/accept', () => {
  it('thread author can accept a post as answer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/threads/${threadId}/posts/${post1Id}/accept`,
      headers: auth(memberSession),
    });
    expect(res.statusCode).toBe(200);
    expect((JSON.parse(res.body) as { isAcceptedAnswer: boolean }).isAcceptedAnswer).toBe(true);
  });

  it('accepting a different post flips the previous one to false', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/threads/${threadId}/posts/${post2Id}/accept`,
      headers: auth(memberSession),
    });
    expect(res.statusCode).toBe(200);
    expect((JSON.parse(res.body) as { isAcceptedAnswer: boolean }).isAcceptedAnswer).toBe(true);

    const thread = await app.inject({
      method: 'GET',
      url: `/forums/${forumId}/threads/${threadId}`,
    });
    const posts = (JSON.parse(thread.body) as { posts: { id: string; isAcceptedAnswer: boolean }[] }).posts;
    const p1 = posts.find((p) => p.id === post1Id);
    expect(p1?.isAcceptedAnswer).toBe(false);
  });
});

describe('DELETE /threads/:tid/posts/:pid', () => {
  it('author can soft delete their post', async () => {
    const create = await app.inject({
      method: 'POST',
      url: `/threads/${threadId}/posts`,
      headers: auth(member2Session),
      payload: { body: 'To be deleted' },
    });
    const tempId = (JSON.parse(create.body) as { id: string }).id;

    const del = await app.inject({
      method: 'DELETE',
      url: `/threads/${threadId}/posts/${tempId}`,
      headers: auth(member2Session),
    });
    expect(del.statusCode).toBe(204);
  });

  it('returns 403 when another user tries to delete', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/threads/${threadId}/posts/${post1Id}`,
      headers: auth(member2Session),
    });
    expect(res.statusCode).toBe(403);
  });
});
