import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import type { DB } from '../../src/db';
import { buildTestApp, createTestForum, exchangeForSession, auth, cleanupForum, testConfig } from '../helpers';

let app: FastifyInstance;
let db: DB;
let forumId: string;
let threadId: string;
let memberSession: string;

const hasLLM = testConfig.aiProvider !== 'local';

beforeAll(async () => {
  ({ app, db } = await buildTestApp());
  const forum = await createTestForum(app);
  forumId = forum.id;
  memberSession = await exchangeForSession(app, forumId, 'member', 'user-001');

  const t = await app.inject({
    method: 'POST',
    url: `/forums/${forumId}/threads`,
    headers: auth(memberSession),
    payload: { title: 'AI test thread', body: 'How do I sort a list in Python?', tagIds: [] },
  });
  threadId = (JSON.parse(t.body) as { id: string }).id;

  // Add a couple of posts so AI has content to work with
  await app.inject({
    method: 'POST',
    url: `/threads/${threadId}/posts`,
    headers: auth(memberSession),
    payload: { body: 'You can use list.sort() or sorted().' },
  });
});

afterAll(async () => {
  await cleanupForum(db, forumId);
  await app.close();
  await db.end();
});

describe('POST /threads/:tid/ai/summarise', () => {
  it('returns 401 without a token', async () => {
    const res = await app.inject({ method: 'POST', url: `/threads/${threadId}/ai/summarise` });
    expect(res.statusCode).toBe(401);
  });

  it('returns 404 for a non-existent thread', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/threads/00000000-0000-0000-0000-000000000000/ai/summarise',
      headers: auth(memberSession),
    });
    expect(res.statusCode).toBe(404);
  });

  it(hasLLM ? 'returns 200 with summary' : 'returns 503 when no LLM is configured', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/threads/${threadId}/ai/summarise`,
      headers: auth(memberSession),
    });
    if (hasLLM) {
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { summary: { keyPoints: string[] } };
      expect(Array.isArray(body.summary.keyPoints)).toBe(true);
    } else {
      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.body)['error']).toBe('ai_unavailable');
    }
  });
});

describe('POST /threads/:tid/ai/suggest', () => {
  it('returns 401 without a token', async () => {
    const res = await app.inject({ method: 'POST', url: `/threads/${threadId}/ai/suggest` });
    expect(res.statusCode).toBe(401);
  });

  it(hasLLM ? 'returns 200 with suggestion' : 'returns 503 when no LLM is configured', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/threads/${threadId}/ai/suggest`,
      headers: auth(memberSession),
    });
    if (hasLLM) {
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { suggestion: { confidence: string } };
      expect(['high', 'medium', 'low']).toContain(body.suggestion.confidence);
    } else {
      expect(res.statusCode).toBe(503);
    }
  });
});
