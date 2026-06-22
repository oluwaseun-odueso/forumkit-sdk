import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import type { DB } from '../../src/db';
import { buildTestApp, createTestForum, exchangeForSession, auth, cleanupForum } from '../helpers';

let app: FastifyInstance;
let db: DB;
let forumId: string;

beforeAll(async () => {
  ({ app, db } = await buildTestApp());
  const forum = await createTestForum(app);
  forumId = forum.id;

  const memberSession = await exchangeForSession(app, forumId, 'member', 'user-001');

  await app.inject({
    method: 'POST',
    url: `/forums/${forumId}/threads`,
    headers: auth(memberSession),
    payload: { title: 'How to reverse a string in Python', body: 'Use slicing: s[::-1]', tagIds: [] },
  });

  await app.inject({
    method: 'POST',
    url: `/forums/${forumId}/threads`,
    headers: auth(memberSession),
    payload: { title: 'Python string reversal techniques', body: 'reversed() or slicing', tagIds: [] },
  });
});

afterAll(async () => {
  await cleanupForum(db, forumId);
  await app.close();
  await db.end();
});

describe('GET /forums/:fid/search', () => {
  it('returns results and a mode field', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/forums/${forumId}/search?q=python+reverse`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { results: unknown[]; mode: string; total: number };
    expect(['semantic', 'keyword']).toContain(body.mode);
    expect(typeof body.total).toBe('number');
    expect(Array.isArray(body.results)).toBe(true);
  });

  it('returns empty results for an unrelated keyword query', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/forums/${forumId}/search?q=astrophysics+dark+matter+neutrinos`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { results: unknown[]; mode: string };
    // keyword search has no match; semantic search ranks all threads so skip the length check
    if (body.mode === 'keyword') {
      expect(body.results).toHaveLength(0);
    }
  });

  it('returns 400 when query param is missing', async () => {
    const res = await app.inject({ method: 'GET', url: `/forums/${forumId}/search` });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)['error']).toBe('invalid_query');
  });
});
