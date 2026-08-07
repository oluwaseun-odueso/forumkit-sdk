import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { DB } from '../../src/db';
import type { EmbedFn, ModerateFn } from '@forumkit/ai';

// ── Mocks must be declared before the module under test is imported ──────────

jest.unstable_mockModule('../../src/repositories/comment', () => ({
  getThreadInfo: jest.fn(),
  getCommentById: jest.fn(),
  createComment: jest.fn(),
  updateComment: jest.fn(),
  softDeleteComment: jest.fn(),
  upsertReaction: jest.fn(),
  deleteReaction: jest.fn(),
  getReactionCounts: jest.fn(),
  insertReport: jest.fn(),
  setAcceptedAnswer: jest.fn(),
  updateCommentEmbedding: jest.fn(),
  updateCommentToxicity: jest.fn(),
  insertModerationQueueItem: jest.fn(),
  getForumConfigByThreadId: jest.fn(),
}));

jest.unstable_mockModule('../../src/services/storage', () => ({
  attachToExistingComment: jest.fn(),
}));

jest.unstable_mockModule('@forumkit/ai', () => ({
  embedOne: jest.fn(),
  safeEmbed: jest.fn(),
  safeModerate: jest.fn(),
  suggestTags: jest.fn(),
  summariseThread: jest.fn(),
  suggestAnswer: jest.fn(),
}));

const repo = await import('../../src/repositories/comment');
const svc = await import('../../src/services/comment');

const db = {} as DB;
const embedFn = jest.fn<EmbedFn>();
const moderateFn = jest.fn<ModerateFn>();

const mockThread = { id: 'thread-1', status: 'open' as const, authorId: 'user-1' };
const mockComment = {
  id: 'comment-1',
  threadId: 'thread-1',
  authorId: 'user-1',
  parentCommentId: null,
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

describe('createComment', () => {
  it('creates a comment and returns ok', async () => {
    jest.mocked(repo.getThreadInfo).mockResolvedValue(mockThread);
    jest.mocked(repo.createComment).mockResolvedValue(mockComment);

    const result = await svc.createComment(db, embedFn, moderateFn, {
      threadId: 'thread-1',
      authorId: 'user-1',
      body: 'Hello',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.id).toBe('comment-1');
  });

  it('returns thread_not_found when thread does not exist', async () => {
    jest.mocked(repo.getThreadInfo).mockResolvedValue(null);
    const result = await svc.createComment(db, embedFn, moderateFn, {
      threadId: 'missing',
      authorId: 'user-1',
      body: 'Hello',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('thread_not_found');
  });

  it('returns thread_locked when thread status is locked', async () => {
    jest.mocked(repo.getThreadInfo).mockResolvedValue({ ...mockThread, status: 'locked' });
    const result = await svc.createComment(db, embedFn, moderateFn, {
      threadId: 'thread-1',
      authorId: 'user-1',
      body: 'Hello',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('thread_locked');
  });

  it('returns thread_not_found when thread is soft-deleted', async () => {
    jest.mocked(repo.getThreadInfo).mockResolvedValue({ ...mockThread, status: 'deleted' });
    const result = await svc.createComment(db, embedFn, moderateFn, {
      threadId: 'thread-1',
      authorId: 'user-1',
      body: 'Hello',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('thread_not_found');
  });
});

describe('updateComment', () => {
  it('allows the author to edit their comment', async () => {
    jest.mocked(repo.getCommentById).mockResolvedValue(mockComment);
    jest.mocked(repo.updateComment).mockResolvedValue({ ...mockComment, body: 'Edited' });

    const result = await svc.updateComment(db, 'comment-1', 'user-1', 'member', 'Edited');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.body).toBe('Edited');
  });

  it('allows a moderator to edit any comment', async () => {
    jest.mocked(repo.getCommentById).mockResolvedValue(mockComment);
    jest.mocked(repo.updateComment).mockResolvedValue(mockComment);

    const result = await svc.updateComment(db, 'comment-1', 'mod-1', 'moderator', 'Edited by mod');
    expect(result.ok).toBe(true);
  });

  it('returns forbidden when a different member tries to edit', async () => {
    jest.mocked(repo.getCommentById).mockResolvedValue(mockComment);

    const result = await svc.updateComment(db, 'comment-1', 'other-user', 'member', 'Hijack');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('forbidden');
  });

  it('returns comment_not_found when comment does not exist', async () => {
    jest.mocked(repo.getCommentById).mockResolvedValue(null);
    const result = await svc.updateComment(db, 'missing', 'user-1', 'member', 'x');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('comment_not_found');
  });
});

describe('deleteComment', () => {
  it('allows the author to delete their comment', async () => {
    jest.mocked(repo.getCommentById).mockResolvedValue(mockComment);
    jest.mocked(repo.softDeleteComment).mockResolvedValue(undefined);

    const result = await svc.deleteComment(db, 'comment-1', 'user-1', 'member');
    expect(result.ok).toBe(true);
  });

  it('returns forbidden for a stranger', async () => {
    jest.mocked(repo.getCommentById).mockResolvedValue(mockComment);
    const result = await svc.deleteComment(db, 'comment-1', 'stranger', 'member');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('forbidden');
  });

  it('returns comment_not_found when comment does not exist', async () => {
    jest.mocked(repo.getCommentById).mockResolvedValue(null);
    const result = await svc.deleteComment(db, 'missing', 'user-1', 'member');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('comment_not_found');
  });
});

describe('reactToComment / removeReaction', () => {
  it('upserts a reaction and returns updated counts', async () => {
    jest.mocked(repo.getCommentById).mockResolvedValue(mockComment);
    jest.mocked(repo.upsertReaction).mockResolvedValue(undefined);
    jest.mocked(repo.getReactionCounts).mockResolvedValue({ like: 1 });

    const result = await svc.reactToComment(db, 'comment-1', 'user-1', 'like');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.like).toBe(1);
  });

  it('deletes a reaction and returns updated counts', async () => {
    jest.mocked(repo.getCommentById).mockResolvedValue(mockComment);
    jest.mocked(repo.deleteReaction).mockResolvedValue(undefined);
    jest.mocked(repo.getReactionCounts).mockResolvedValue({});

    const result = await svc.removeReaction(db, 'comment-1', 'user-1', 'like');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({});
  });

  it('returns comment_not_found when comment does not exist', async () => {
    jest.mocked(repo.getCommentById).mockResolvedValue(null);
    const result = await svc.reactToComment(db, 'missing', 'user-1', 'like');
    expect(result.ok).toBe(false);
  });
});

describe('acceptAnswer', () => {
  it('allows the thread author to accept an answer', async () => {
    jest.mocked(repo.getCommentById).mockResolvedValue(mockComment);
    jest.mocked(repo.getThreadInfo).mockResolvedValue(mockThread);
    jest.mocked(repo.setAcceptedAnswer).mockResolvedValue({ ...mockComment, isAcceptedAnswer: true });

    const result = await svc.acceptAnswer(db, {
      commentId: 'comment-1',
      threadId: 'thread-1',
      requesterId: 'user-1',
      requesterRole: 'member',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.isAcceptedAnswer).toBe(true);
  });

  it('returns forbidden when a non-author non-moderator tries to accept', async () => {
    jest.mocked(repo.getCommentById).mockResolvedValue(mockComment);
    jest.mocked(repo.getThreadInfo).mockResolvedValue(mockThread);

    const result = await svc.acceptAnswer(db, {
      commentId: 'comment-1',
      threadId: 'thread-1',
      requesterId: 'stranger',
      requesterRole: 'member',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('forbidden');
  });

  it('returns comment_not_found when comment is in a different thread', async () => {
    jest.mocked(repo.getCommentById).mockResolvedValue({ ...mockComment, threadId: 'other-thread' });
    jest.mocked(repo.getThreadInfo).mockResolvedValue(mockThread);

    const result = await svc.acceptAnswer(db, {
      commentId: 'comment-1',
      threadId: 'thread-1',
      requesterId: 'user-1',
      requesterRole: 'member',
    });
    expect(result.ok).toBe(false);
  });
});
