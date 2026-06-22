import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import type { DB } from '../../src/db';
import { buildTestApp, createTestForum, makeHostToken, makeSessionToken, exchangeForSession, auth, cleanupForum } from '../helpers';

let app: FastifyInstance;
let db: DB;
let forumId: string;
let memberSession: string;
let member2Session: string;
let modSession: string;
let thread1Id: string;
let thread2Id: string;

beforeAll(async () => {
  ({ app, db } = await buildTestApp());
  const forum = await createTestForum(app);
  forumId = forum.id;

  memberSession = await exchangeForSession(app, forumId, 'member', 'user-001');
  member2Session = await exchangeForSession(app, forumId, 'member', 'user-002');
  modSession = await exchangeForSession(app, forumId, 'moderator', 'mod-001');

  // Create two threads
  const t1 = await app.inject({
    method: 'POST',
    url: `/forums/${forumId}/threads`,
    headers: auth(memberSession),
    payload: { title: 'How do I reverse a string in Python?', body: 'Looking for the best approach.', tagIds: [] },
  });
  thread1Id = (JSON.parse(t1.body) as { id: string }).id;

  const t2 = await app.inject({
    method: 'POST',
    url: `/forums/${forumId}/threads`,
    headers: auth(memberSession),
    payload: { title: 'Python string reversal techniques', body: 'What are the different ways?', tagIds: [] },
  });
  thread2Id = (JSON.parse(t2.body) as { id: string }).id;
});

afterAll(async () => {
  await cleanupForum(db, forumId);
  await app.close();
  await db.end();
});

describe('GET /forums/:fid/threads', () => {
  it('returns threads with pagination metadata', async () => {
    const res = await app.inject({ method: 'GET', url: `/forums/${forumId}/threads` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { threads: unknown[]; total: number };
    expect(body.total).toBe(2);
    expect(body.threads).toHaveLength(2);
  });

  it('sorts by oldest', async () => {
    const res = await app.inject({ method: 'GET', url: `/forums/${forumId}/threads?sort=oldest` });
    const body = JSON.parse(res.body) as { threads: { id: string }[] };
    expect(body.threads[0]?.id).toBe(thread1Id);
  });

  it('sorts by latest', async () => {
    const res = await app.inject({ method: 'GET', url: `/forums/${forumId}/threads?sort=latest` });
    const body = JSON.parse(res.body) as { threads: { id: string }[] };
    expect(body.threads[0]?.id).toBe(thread2Id);
  });
});

describe('POST /forums/:fid/threads', () => {
  it('creates a thread and returns 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/forums/${forumId}/threads`,
      headers: auth(memberSession),
      payload: { title: 'New thread', body: 'Some body text here.', tagIds: [] },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as { id: string; title: string; status: string };
    expect(body.title).toBe('New thread');
    expect(body.status).toBe('open');
    // cleanup
    await db`DELETE FROM threads WHERE id = ${body.id}`;
  });

  it('returns 401 without a token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/forums/${forumId}/threads`,
      headers: { 'content-type': 'application/json' },
      payload: { title: 'x', body: 'y', tagIds: [] },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /forums/:fid/threads/:id', () => {
  it('returns the thread with posts array', async () => {
    const res = await app.inject({ method: 'GET', url: `/forums/${forumId}/threads/${thread1Id}` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { thread: { id: string }; posts: unknown[] };
    expect(body.thread.id).toBe(thread1Id);
    expect(Array.isArray(body.posts)).toBe(true);
  });

  it('returns 404 for a non-existent thread', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/forums/${forumId}/threads/00000000-0000-0000-0000-000000000000`,
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('PATCH /forums/:fid/threads/:id', () => {
  it('allows the author to edit their thread', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/forums/${forumId}/threads/${thread1Id}`,
      headers: auth(memberSession),
      payload: { title: 'Updated title' },
    });
    expect(res.statusCode).toBe(200);
    expect((JSON.parse(res.body) as { title: string }).title).toBe('Updated title');
  });

  it('returns 403 when a different member tries to edit', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/forums/${forumId}/threads/${thread1Id}`,
      headers: auth(member2Session),
      payload: { title: 'Hijacked' },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('Thread lock/unlock', () => {
  it('moderator can lock a thread', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/forums/${forumId}/threads/${thread1Id}/lock`,
      headers: auth(modSession),
      payload: { locked: true },
    });
    expect(res.statusCode).toBe(200);
    expect((JSON.parse(res.body) as { status: string }).status).toBe('locked');
  });

  it('member cannot post to a locked thread', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/threads/${thread1Id}/posts`,
      headers: auth(memberSession),
      payload: { body: 'This should fail' },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body)['error']).toBe('thread_locked');
  });

  it('moderator can unlock a thread', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/forums/${forumId}/threads/${thread1Id}/lock`,
      headers: auth(modSession),
      payload: { locked: false },
    });
    expect(res.statusCode).toBe(200);
    expect((JSON.parse(res.body) as { status: string }).status).toBe('open');
  });
});

describe('Thread pin', () => {
  it('moderator can pin a thread', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/forums/${forumId}/threads/${thread1Id}/pin`,
      headers: auth(modSession),
      payload: { pinned: true },
    });
    expect(res.statusCode).toBe(200);
    expect((JSON.parse(res.body) as { pinned: boolean }).pinned).toBe(true);
  });
});

describe('DELETE /forums/:fid/threads/:id', () => {
  it('author can soft delete their thread', async () => {
    const create = await app.inject({
      method: 'POST',
      url: `/forums/${forumId}/threads`,
      headers: auth(memberSession),
      payload: { title: 'To be deleted', body: 'Throwaway.', tagIds: [] },
    });
    const throwawayId = (JSON.parse(create.body) as { id: string }).id;

    const del = await app.inject({
      method: 'DELETE',
      url: `/forums/${forumId}/threads/${throwawayId}`,
      headers: auth(memberSession),
    });
    expect(del.statusCode).toBe(204);

    const list = await app.inject({ method: 'GET', url: `/forums/${forumId}/threads` });
    const body = JSON.parse(list.body) as { threads: { id: string }[] };
    expect(body.threads.some((t) => t.id === throwawayId)).toBe(false);
  });
});

describe('GET /forums/:fid/threads/duplicates', () => {
  it('returns an array', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/forums/${forumId}/threads/duplicates?title=How+to+reverse+a+string+in+Python`,
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(JSON.parse(res.body))).toBe(true);
  });
});
