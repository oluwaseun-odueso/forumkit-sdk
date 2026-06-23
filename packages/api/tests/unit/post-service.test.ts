import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { DB } from '../../src/db';
import type { EmbedFn, ModerateFn } from '@forumkit/ai';

// ── Mocks must be declared before the module under test is imported ──────────

jest.unstable_mockModule('../../src/repositories/post', () => ({
  getThreadInfo: jest.fn(),
  getPostById: jest.fn(),
  createPost: jest.fn(),
  updatePost: jest.fn(),
  softDeletePost: jest.fn(),
  upsertReaction: jest.fn(),
  deleteReaction: jest.fn(),
  getReactionCounts: jest.fn(),
  insertReport: jest.fn(),
  setAcceptedAnswer: jest.fn(),
  updatePostEmbedding: jest.fn(),
  updatePostToxicity: jest.fn(),
  insertModerationQueueItem: jest.fn(),
  getForumConfigByThreadId: jest.fn(),
}));

jest.unstable_mockModule('@forumkit/ai', () => ({
  embedOne: jest.fn(),
  safeEmbed: jest.fn(),
  safeModerate: jest.fn(),
  suggestTags: jest.fn(),
  summariseThread: jest.fn(),
  suggestAnswer: jest.fn(),
}));

const repo = await import('../../src/repositories/post');
const svc = await import('../../src/services/post');

const db = {} as DB;
const embedFn = jest.fn<EmbedFn>();
const moderateFn = jest.fn<ModerateFn>();

const mockThread = { id: 'thread-1', status: 'open' as const, authorId: 'user-1' };
const mockPost = {
  id: 'post-1',
  threadId: 'thread-1',
  authorId: 'user-1',
  parentPostId: null,
  body: 'Original body',
  status: 'visible' as const,
  isAcceptedAnswer: false,
  toxicityScore: null,
  reactionCounts: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createPost', () => {
  it('creates a post and returns ok', async () => {
    jest.mocked(repo.getThreadInfo).mockResolvedValue(mockThread);
    jest.mocked(repo.createPost).mockResolvedValue(mockPost);

    const result = await svc.createPost(db, embedFn, moderateFn, {
      threadId: 'thread-1',
      authorId: 'user-1',
      body: 'Hello',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.id).toBe('post-1');
  });

  it('returns thread_not_found when thread does not exist', async () => {
    jest.mocked(repo.getThreadInfo).mockResolvedValue(null);
    const result = await svc.createPost(db, embedFn, moderateFn, {
      threadId: 'missing',
      authorId: 'user-1',
      body: 'Hello',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('thread_not_found');
  });

  it('returns thread_locked when thread status is locked', async () => {
    jest.mocked(repo.getThreadInfo).mockResolvedValue({ ...mockThread, status: 'locked' });
    const result = await svc.createPost(db, embedFn, moderateFn, {
      threadId: 'thread-1',
      authorId: 'user-1',
      body: 'Hello',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('thread_locked');
  });

  it('returns thread_not_found when thread is soft-deleted', async () => {
    jest.mocked(repo.getThreadInfo).mockResolvedValue({ ...mockThread, status: 'deleted' });
    const result = await svc.createPost(db, embedFn, moderateFn, {
      threadId: 'thread-1',
      authorId: 'user-1',
      body: 'Hello',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('thread_not_found');
  });
});

describe('updatePost', () => {
  it('allows the author to edit their post', async () => {
    jest.mocked(repo.getPostById).mockResolvedValue(mockPost);
    jest.mocked(repo.updatePost).mockResolvedValue({ ...mockPost, body: 'Edited' });

    const result = await svc.updatePost(db, 'post-1', 'user-1', 'member', 'Edited');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.body).toBe('Edited');
  });

  it('allows a moderator to edit any post', async () => {
    jest.mocked(repo.getPostById).mockResolvedValue(mockPost);
    jest.mocked(repo.updatePost).mockResolvedValue(mockPost);

    const result = await svc.updatePost(db, 'post-1', 'mod-1', 'moderator', 'Edited by mod');
    expect(result.ok).toBe(true);
  });

  it('returns forbidden when a different member tries to edit', async () => {
    jest.mocked(repo.getPostById).mockResolvedValue(mockPost);

    const result = await svc.updatePost(db, 'post-1', 'other-user', 'member', 'Hijack');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('forbidden');
  });

  it('returns post_not_found when post does not exist', async () => {
    jest.mocked(repo.getPostById).mockResolvedValue(null);
    const result = await svc.updatePost(db, 'missing', 'user-1', 'member', 'x');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('post_not_found');
  });
});

describe('deletePost', () => {
  it('allows the author to delete their post', async () => {
    jest.mocked(repo.getPostById).mockResolvedValue(mockPost);
    jest.mocked(repo.softDeletePost).mockResolvedValue(undefined);

    const result = await svc.deletePost(db, 'post-1', 'user-1', 'member');
    expect(result.ok).toBe(true);
  });

  it('returns forbidden for a stranger', async () => {
    jest.mocked(repo.getPostById).mockResolvedValue(mockPost);
    const result = await svc.deletePost(db, 'post-1', 'stranger', 'member');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('forbidden');
  });

  it('returns post_not_found when post does not exist', async () => {
    jest.mocked(repo.getPostById).mockResolvedValue(null);
    const result = await svc.deletePost(db, 'missing', 'user-1', 'member');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('post_not_found');
  });
});

describe('reactToPost / removeReaction', () => {
  it('upserts a reaction and returns updated counts', async () => {
    jest.mocked(repo.getPostById).mockResolvedValue(mockPost);
    jest.mocked(repo.upsertReaction).mockResolvedValue(undefined);
    jest.mocked(repo.getReactionCounts).mockResolvedValue({ like: 1 });

    const result = await svc.reactToPost(db, 'post-1', 'user-1', 'like');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.like).toBe(1);
  });

  it('deletes a reaction and returns updated counts', async () => {
    jest.mocked(repo.getPostById).mockResolvedValue(mockPost);
    jest.mocked(repo.deleteReaction).mockResolvedValue(undefined);
    jest.mocked(repo.getReactionCounts).mockResolvedValue({});

    const result = await svc.removeReaction(db, 'post-1', 'user-1', 'like');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({});
  });

  it('returns post_not_found when post does not exist', async () => {
    jest.mocked(repo.getPostById).mockResolvedValue(null);
    const result = await svc.reactToPost(db, 'missing', 'user-1', 'like');
    expect(result.ok).toBe(false);
  });
});

describe('acceptAnswer', () => {
  it('allows the thread author to accept an answer', async () => {
    jest.mocked(repo.getPostById).mockResolvedValue(mockPost);
    jest.mocked(repo.getThreadInfo).mockResolvedValue(mockThread);
    jest.mocked(repo.setAcceptedAnswer).mockResolvedValue({ ...mockPost, isAcceptedAnswer: true });

    const result = await svc.acceptAnswer(db, {
      postId: 'post-1',
      threadId: 'thread-1',
      requesterId: 'user-1',
      requesterRole: 'member',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.isAcceptedAnswer).toBe(true);
  });

  it('returns forbidden when a non-author non-moderator tries to accept', async () => {
    jest.mocked(repo.getPostById).mockResolvedValue(mockPost);
    jest.mocked(repo.getThreadInfo).mockResolvedValue(mockThread);

    const result = await svc.acceptAnswer(db, {
      postId: 'post-1',
      threadId: 'thread-1',
      requesterId: 'stranger',
      requesterRole: 'member',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('forbidden');
  });

  it('returns post_not_found when post is in a different thread', async () => {
    jest.mocked(repo.getPostById).mockResolvedValue({ ...mockPost, threadId: 'other-thread' });
    jest.mocked(repo.getThreadInfo).mockResolvedValue(mockThread);

    const result = await svc.acceptAnswer(db, {
      postId: 'post-1',
      threadId: 'thread-1',
      requesterId: 'user-1',
      requesterRole: 'member',
    });
    expect(result.ok).toBe(false);
  });
});
