import type { Comment } from '@forumkit/types';
import {
  createReply as sharedCreateReply,
  saveComment as sharedSaveComment,
  unsaveComment as sharedUnsaveComment,
  reportComment as sharedReportComment,
  updateReply as sharedUpdateReply,
  deleteComment as sharedDeleteComment,
  acceptAnswer as sharedAcceptAnswer,
  unacceptAnswer as sharedUnacceptAnswer,
  type CreateReplyBody,
} from '@forumkit/shared';

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

// All comment endpoints delegate to the shared client (signatures unchanged).
export function createReply(threadId: string, body: CreateReplyBody, token?: string): Promise<Comment> {
  return sharedCreateReply(API_BASE, threadId, body, token);
}

export function saveComment(threadId: string, commentId: string, token?: string): Promise<void> {
  return sharedSaveComment(API_BASE, threadId, commentId, token);
}

export function unsaveComment(threadId: string, commentId: string, token?: string): Promise<void> {
  return sharedUnsaveComment(API_BASE, threadId, commentId, token);
}

export function reportComment(threadId: string, commentId: string, reason: string, token?: string): Promise<void> {
  return sharedReportComment(API_BASE, threadId, commentId, reason, token);
}

export function updateReply(threadId: string, commentId: string, body: string, token?: string): Promise<Comment> {
  return sharedUpdateReply(API_BASE, threadId, commentId, body, token);
}

export function deleteComment(threadId: string, commentId: string, token?: string): Promise<void> {
  return sharedDeleteComment(API_BASE, threadId, commentId, token);
}

export function acceptAnswer(threadId: string, commentId: string, token?: string): Promise<Comment> {
  return sharedAcceptAnswer(API_BASE, threadId, commentId, token);
}

export function unacceptAnswer(threadId: string, commentId: string, token?: string): Promise<Comment> {
  return sharedUnacceptAnswer(API_BASE, threadId, commentId, token);
}
