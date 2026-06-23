import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { DB } from '../../src/db';
import type { EmbedFn, LLMFn } from '@forumkit/ai';

// ── Mocks must be declared before the module under test is imported ──────────

jest.unstable_mockModule('../../src/repositories/thread', () => ({
  listThreads: jest.fn(),
  getThreadById: jest.fn(),
  createThread: jest.fn(),
  updateThread: jest.fn(),
  softDeleteThread: jest.fn(),
  setThreadLocked: jest.fn(),
  setThreadPinned: jest.fn(),
  findSimilarThreads: jest.fn(),
  updateThreadEmbedding: jest.fn(),
  incrementViewCount: jest.fn(),
}));

jest.unstable_mockModule('../../src/repositories/post', () => ({
  listPostsByThread: jest.fn(),
}));

jest.unstable_mockModule('../../src/repositories/tags', () => ({
  listTagsByForum: jest.fn(),
  upsertTagByName: jest.fn(),
}));

jest.unstable_mockModule('@forumkit/ai', () => ({
  embedOne: jest.fn(),
  safeEmbed: jest.fn(),
  safeModerate: jest.fn(),
  suggestTags: jest.fn(),
  summariseThread: jest.fn(),
  suggestAnswer: jest.fn(),
}));

const threadRepo = await import('../../src/repositories/thread');
const postRepo = await import('../../src/repositories/post');
const ai = await import('@forumkit/ai');
const svc = await import('../../src/services/thread');

const db = {} as DB;
const embedFn = jest.fn<EmbedFn>();
const llmFn = jest.fn<LLMFn>();

const mockThread = {
  id: 'thread-1',
  forumId: 'forum-1',
  authorId: 'user-1',
  title: 'Test thread',
  body: 'Body text',
  status: 'open' as const,
  pinned: false,
  viewCount: 0,
  postCount: 0,
  reactionCount: 0,
  tags: [],
  embedding: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listThreads', () => {
  it('delegates to the repo with default pagination', async () => {
    jest.mocked(threadRepo.listThreads).mockResolvedValue({ threads: [], total: 0 });
    await svc.listThreads(db, 'forum-1', {});
    expect(threadRepo.listThreads).toHaveBeenCalledWith(db, 'forum-1', {
      tagId: undefined,
      sort: 'latest',
      page: 1,
      limit: 20,
    });
  });

  it('clamps limit to MAX_LIMIT=50', async () => {
    jest.mocked(threadRepo.listThreads).mockResolvedValue({ threads: [], total: 0 });
    await svc.listThreads(db, 'forum-1', { limit: 999 });
    const call = jest.mocked(threadRepo.listThreads).mock.calls[0]?.[2];
    expect(call?.limit).toBe(50);
  });

  it('returns page and limit in the response', async () => {
    jest.mocked(threadRepo.listThreads).mockResolvedValue({ threads: [], total: 5 });
    const result = await svc.listThreads(db, 'forum-1', { page: 2, limit: 10 });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
  });
});

describe('getThread', () => {
  it('returns ok with thread and posts when found', async () => {
    jest.mocked(threadRepo.getThreadById).mockResolvedValue(mockThread);
    jest.mocked(postRepo.listPostsByThread).mockResolvedValue([]);
    jest.mocked(threadRepo.incrementViewCount).mockResolvedValue(undefined);

    const result = await svc.getThread(db, 'forum-1', 'thread-1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.thread.id).toBe('thread-1');
      expect(result.value.posts).toEqual([]);
    }
  });

  it('returns err when thread not found', async () => {
    jest.mocked(threadRepo.getThreadById).mockResolvedValue(null);
    const result = await svc.getThread(db, 'forum-1', 'missing');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('thread_not_found');
  });

  it('returns err when thread belongs to a different forum', async () => {
    jest.mocked(threadRepo.getThreadById).mockResolvedValue({ ...mockThread, forumId: 'other-forum' });
    const result = await svc.getThread(db, 'forum-1', 'thread-1');
    expect(result.ok).toBe(false);
  });
});

describe('updateThread', () => {
  it('allows the author to update their thread', async () => {
    jest.mocked(threadRepo.getThreadById).mockResolvedValue(mockThread);
    jest.mocked(threadRepo.updateThread).mockResolvedValue({ ...mockThread, title: 'New title' });

    const result = await svc.updateThread(db, 'forum-1', 'thread-1', 'user-1', 'member', { title: 'New title' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.title).toBe('New title');
  });

  it('allows a moderator to update any thread', async () => {
    jest.mocked(threadRepo.getThreadById).mockResolvedValue(mockThread);
    jest.mocked(threadRepo.updateThread).mockResolvedValue(mockThread);

    const result = await svc.updateThread(db, 'forum-1', 'thread-1', 'mod-1', 'moderator', { title: 'x' });
    expect(result.ok).toBe(true);
  });

  it('returns forbidden when a non-author member tries to edit', async () => {
    jest.mocked(threadRepo.getThreadById).mockResolvedValue(mockThread);

    const result = await svc.updateThread(db, 'forum-1', 'thread-1', 'other-user', 'member', { title: 'x' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('forbidden');
  });

  it('returns thread_not_found when thread does not exist', async () => {
    jest.mocked(threadRepo.getThreadById).mockResolvedValue(null);
    const result = await svc.updateThread(db, 'forum-1', 'missing', 'user-1', 'member', {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('thread_not_found');
  });
});

describe('deleteThread', () => {
  it('allows the author to delete their thread', async () => {
    jest.mocked(threadRepo.getThreadById).mockResolvedValue(mockThread);
    jest.mocked(threadRepo.softDeleteThread).mockResolvedValue(undefined);

    const result = await svc.deleteThread(db, 'forum-1', 'thread-1', 'user-1', 'member');
    expect(result.ok).toBe(true);
  });

  it('returns forbidden for a non-author non-moderator', async () => {
    jest.mocked(threadRepo.getThreadById).mockResolvedValue(mockThread);
    const result = await svc.deleteThread(db, 'forum-1', 'thread-1', 'stranger', 'member');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('forbidden');
  });
});

describe('lockThread / pinThread', () => {
  it('locks a thread', async () => {
    jest.mocked(threadRepo.getThreadById).mockResolvedValue(mockThread);
    jest.mocked(threadRepo.setThreadLocked).mockResolvedValue({ ...mockThread, status: 'locked' });

    const result = await svc.lockThread(db, 'forum-1', 'thread-1', true);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe('locked');
  });

  it('pins a thread', async () => {
    jest.mocked(threadRepo.getThreadById).mockResolvedValue(mockThread);
    jest.mocked(threadRepo.setThreadPinned).mockResolvedValue({ ...mockThread, pinned: true });

    const result = await svc.pinThread(db, 'forum-1', 'thread-1', true);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.pinned).toBe(true);
  });

  it('returns thread_not_found when thread does not exist', async () => {
    jest.mocked(threadRepo.getThreadById).mockResolvedValue(null);
    const result = await svc.lockThread(db, 'forum-1', 'missing', true);
    expect(result.ok).toBe(false);
  });
});

describe('findDuplicates', () => {
  it('returns similar threads when embedding succeeds', async () => {
    const mockVector = [0.1, 0.2, 0.3];
    jest.mocked(ai.embedOne).mockResolvedValue(mockVector);
    jest.mocked(threadRepo.findSimilarThreads).mockResolvedValue([]);

    const result = await svc.findDuplicates(db, embedFn, 'forum-1', 'title', 'body');
    expect(ai.embedOne).toHaveBeenCalled();
    expect(threadRepo.findSimilarThreads).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('returns [] when embedding fails (graceful degradation)', async () => {
    jest.mocked(ai.embedOne).mockResolvedValue(null);

    const result = await svc.findDuplicates(db, embedFn, 'forum-1', 'title', 'body');
    expect(result).toEqual([]);
    expect(threadRepo.findSimilarThreads).not.toHaveBeenCalled();
  });
});

describe('createThread', () => {
  it('returns the created thread immediately without awaiting AI jobs', async () => {
    jest.mocked(threadRepo.createThread).mockResolvedValue(mockThread);
    jest.mocked(ai.embedOne).mockResolvedValue(null);

    const result = await svc.createThread(db, embedFn, llmFn, 'forum-1', 'user-1', {
      title: 'Test',
      body: 'Body',
      tagIds: [],
    });
    expect(result.id).toBe('thread-1');
    expect(threadRepo.createThread).toHaveBeenCalledTimes(1);
  });
});
