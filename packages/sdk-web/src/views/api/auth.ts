import { createSession as sharedCreateSession } from '@forumkit/shared';
import type { CreateSessionResult } from '@forumkit/shared';

export type { CreateSessionResult };

// A function, not a frozen constant: FK_API_URL is set by forum-kit.ts's
// connectedCallback once the real config is known, which runs after this
// module has already evaluated - a const computed here would permanently
// freeze at whatever FK_API_URL happened to be (usually unset) at import time.
function getApiBase(): string {
  return typeof window !== 'undefined'
    ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
    : '';
}

// Thin wrapper over the shared client — keeps the web signature (apiUrl passed
// explicitly here too, since createSession has always taken it), while the
// fetch logic lives once in @forumkit/shared.
export async function createSession(apiUrl: string, hostToken: string): Promise<CreateSessionResult> {
  return sharedCreateSession(apiUrl || getApiBase(), hostToken);
}
