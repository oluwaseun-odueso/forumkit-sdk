import type { Draft, DraftContent } from '@forumkit/types';
import {
  listDrafts as sharedListDrafts,
  getDraft as sharedGetDraft,
  createDraft as sharedCreateDraft,
  updateDraft as sharedUpdateDraft,
  deleteDraft as sharedDeleteDraft,
} from '@forumkit/shared';

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

// All draft endpoints delegate to the shared client (signatures unchanged).
export function listDrafts(forumId: string, token?: string): Promise<Draft[]> {
  return sharedListDrafts(API_BASE, forumId, token);
}

export function getDraft(forumId: string, draftId: string, token?: string): Promise<Draft> {
  return sharedGetDraft(API_BASE, forumId, draftId, token);
}

export function createDraft(forumId: string, title: string, content: DraftContent, token?: string): Promise<Draft> {
  return sharedCreateDraft(API_BASE, forumId, title, content, token);
}

export function updateDraft(
  forumId: string,
  draftId: string,
  fields: { title?: string; content?: DraftContent },
  token?: string,
): Promise<Draft> {
  return sharedUpdateDraft(API_BASE, forumId, draftId, fields, token);
}

export function deleteDraft(forumId: string, draftId: string, token?: string): Promise<void> {
  return sharedDeleteDraft(API_BASE, forumId, draftId, token);
}
