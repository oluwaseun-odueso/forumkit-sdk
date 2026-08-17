import { createSession as sharedCreateSession } from '@forumkit/shared';
import type { CreateSessionResult } from '@forumkit/shared';

export type { CreateSessionResult };

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

// Thin wrapper over the shared client — keeps the web signature (apiUrl passed
// explicitly here too, since createSession has always taken it), while the
// fetch logic lives once in @forumkit/shared.
export async function createSession(apiUrl: string, hostToken: string): Promise<CreateSessionResult> {
  return sharedCreateSession(apiUrl || API_BASE, hostToken);
}
