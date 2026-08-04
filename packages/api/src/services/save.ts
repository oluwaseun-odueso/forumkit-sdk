import type { DB } from '../db';
import { ok, err } from '../lib/result';
import type { Result } from '../lib/result';
import * as saveRepo from '../repositories/save';
import * as threadRepo from '../repositories/thread';
import * as commentRepo from '../repositories/comment';

export type SaveError = 'thread_not_found' | 'comment_not_found';

export async function saveThread(db: DB, threadId: string, userId: string): Promise<Result<void, SaveError>> {
  const thread = await threadRepo.getThreadById(db, threadId);
  if (!thread) return err('thread_not_found');
  await saveRepo.save(db, { kind: 'thread', id: threadId }, userId);
  return ok(undefined);
}

export async function unsaveThread(db: DB, threadId: string, userId: string): Promise<Result<void, SaveError>> {
  const thread = await threadRepo.getThreadById(db, threadId);
  if (!thread) return err('thread_not_found');
  await saveRepo.unsave(db, { kind: 'thread', id: threadId }, userId);
  return ok(undefined);
}

export async function saveComment(db: DB, commentId: string, userId: string): Promise<Result<void, SaveError>> {
  const comment = await commentRepo.getCommentById(db, commentId);
  if (!comment) return err('comment_not_found');
  await saveRepo.save(db, { kind: 'comment', id: commentId }, userId);
  return ok(undefined);
}

export async function unsaveComment(db: DB, commentId: string, userId: string): Promise<Result<void, SaveError>> {
  const comment = await commentRepo.getCommentById(db, commentId);
  if (!comment) return err('comment_not_found');
  await saveRepo.unsave(db, { kind: 'comment', id: commentId }, userId);
  return ok(undefined);
}
