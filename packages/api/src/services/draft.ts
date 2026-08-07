import type { DB } from '../db';
import type { Draft, DraftContent, UserRole } from '@forumkit/types';
import type { StorageAdapter } from '@forumkit/storage';
import { ok, err } from '../lib/result';
import type { Result } from '../lib/result';
import * as draftRepo from '../repositories/draft';
import * as storageService from './storage';

export type DraftError = 'draft_not_found' | 'forbidden';

function attachmentIdsOf(content: DraftContent): string[] {
  return content.attachments.map((a) => a.attachmentId);
}

// Best-effort: a removed attachment id might still be referenced by another
// of the user's drafts, or might already be gone. Either way this must never
// block the caller's actual request (draft save/delete), so failures are
// swallowed rather than surfaced.
async function cleanupOrphanedAttachments(
  db: DB,
  storage: StorageAdapter,
  candidateIds: string[],
  userId: string,
  userRole: UserRole,
): Promise<void> {
  for (const attachmentId of candidateIds) {
    const stillReferenced = await draftRepo.isAttachmentReferencedByAnyDraft(db, attachmentId);
    if (stillReferenced) continue;
    await storageService.deleteAttachment(db, storage, attachmentId, userId, userRole).catch(() => {});
  }
}

export async function createDraft(
  db: DB,
  forumId: string,
  userId: string,
  title: string,
  content: DraftContent,
): Promise<Draft> {
  return draftRepo.createDraft(db, forumId, userId, title, content);
}

export async function listDrafts(db: DB, forumId: string, userId: string): Promise<Draft[]> {
  return draftRepo.listDraftsByUser(db, forumId, userId);
}

export async function getDraft(
  db: DB,
  forumId: string,
  draftId: string,
  userId: string,
): Promise<Result<Draft, DraftError>> {
  const draft = await draftRepo.getDraftById(db, draftId);
  if (!draft || draft.forumId !== forumId) return err('draft_not_found');
  if (draft.userId !== userId) return err('forbidden');
  return ok(draft);
}

export async function updateDraft(
  db: DB,
  storage: StorageAdapter,
  forumId: string,
  draftId: string,
  userId: string,
  userRole: UserRole,
  fields: { title?: string | undefined; content?: DraftContent | undefined },
): Promise<Result<Draft, DraftError>> {
  const existing = await draftRepo.getDraftById(db, draftId);
  if (!existing || existing.forumId !== forumId) return err('draft_not_found');
  if (existing.userId !== userId) return err('forbidden');

  const updated = await draftRepo.updateDraft(db, draftId, fields);
  if (!updated) return err('draft_not_found');

  if (fields.content) {
    const before = new Set(attachmentIdsOf(existing.content));
    const after = new Set(attachmentIdsOf(fields.content));
    const removed = [...before].filter((id) => !after.has(id));
    if (removed.length > 0) await cleanupOrphanedAttachments(db, storage, removed, userId, userRole);
  }

  return ok(updated);
}

export async function deleteDraft(
  db: DB,
  storage: StorageAdapter,
  forumId: string,
  draftId: string,
  userId: string,
  userRole: UserRole,
): Promise<Result<void, DraftError>> {
  const existing = await draftRepo.getDraftById(db, draftId);
  if (!existing || existing.forumId !== forumId) return err('draft_not_found');
  if (existing.userId !== userId) return err('forbidden');

  await draftRepo.deleteDraft(db, draftId);

  const attachmentIds = attachmentIdsOf(existing.content);
  if (attachmentIds.length > 0) await cleanupOrphanedAttachments(db, storage, attachmentIds, userId, userRole);

  return ok(undefined);
}
