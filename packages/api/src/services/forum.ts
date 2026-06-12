import type { Forum, Tag, ForumConfig } from '@forumkit/types';
import type { DB } from '../db';
import { ok, err, type Result } from '../lib/result';
import * as forumRepo from '../repositories/forum';
import * as tagsRepo from '../repositories/tags';

export type ForumError = 'forum_not_found';
export type TagError = 'forum_not_found' | 'tag_not_found' | 'tag_conflict';

export async function getForum(db: DB, forumId: string): Promise<Result<Forum, ForumError>> {
  const forum = await forumRepo.getForumById(db, forumId);
  if (!forum) return err('forum_not_found');
  return ok(forum);
}

export async function createForum(
  db: DB,
  name: string,
  ownerId: string,
): Promise<Forum> {
  return forumRepo.createForum(db, { name, ownerId });
}

export async function updateForumConfig(
  db: DB,
  forumId: string,
  patch: Partial<ForumConfig>,
): Promise<Result<Forum, ForumError>> {
  const forum = await forumRepo.updateForumConfig(db, forumId, patch);
  if (!forum) return err('forum_not_found');
  return ok(forum);
}

export async function listTags(db: DB, forumId: string): Promise<Result<Tag[], ForumError>> {
  const forum = await forumRepo.getForumById(db, forumId);
  if (!forum) return err('forum_not_found');
  const tags = await tagsRepo.listTagsByForum(db, forumId);
  return ok(tags);
}

type CreateTagInput = {
  name: string;
  description?: string | undefined;
  color?: string | undefined;
};

export async function createTag(
  db: DB,
  forumId: string,
  input: CreateTagInput,
): Promise<Result<Tag, TagError>> {
  const forum = await forumRepo.getForumById(db, forumId);
  if (!forum) return err('forum_not_found');

  try {
    const tag = await tagsRepo.createTag(db, { forumId, ...input });
    return ok(tag);
  } catch (e: unknown) {
    if (isUniqueViolation(e)) return err('tag_conflict');
    throw e;
  }
}

export async function updateTag(
  db: DB,
  forumId: string,
  tagId: string,
  patch: { name?: string | undefined; description?: string | undefined; color?: string | undefined },
): Promise<Result<Tag, TagError>> {
  const existing = await tagsRepo.getTagById(db, tagId);
  if (!existing) return err('tag_not_found');
  if (existing.forumId !== forumId) return err('tag_not_found');

  try {
    const tag = await tagsRepo.updateTag(db, tagId, patch);
    if (!tag) return err('tag_not_found');
    return ok(tag);
  } catch (e: unknown) {
    if (isUniqueViolation(e)) return err('tag_conflict');
    throw e;
  }
}

export async function deleteTag(
  db: DB,
  forumId: string,
  tagId: string,
): Promise<Result<void, TagError>> {
  const existing = await tagsRepo.getTagById(db, tagId);
  if (!existing) return err('tag_not_found');
  if (existing.forumId !== forumId) return err('tag_not_found');

  await tagsRepo.deleteTag(db, tagId);
  return ok(undefined);
}

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code: unknown }).code === '23505'
  );
}
