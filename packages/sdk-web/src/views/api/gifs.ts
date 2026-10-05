import type { GifResult } from '@forumkit/types';
import { searchGifs as sharedSearchGifs, GifSearchNotConfiguredError } from '@forumkit/shared';

// Re-exported from the shared client so existing `instanceof` checks + imports
// keep working unchanged.
export { GifSearchNotConfiguredError };

function getApiBase(): string {
  return typeof window !== 'undefined'
    ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
    : '';
}

export function searchGifs(forumId: string, query: string, token?: string, limit = 24): Promise<GifResult[]> {
  return sharedSearchGifs(getApiBase(), forumId, query, token, limit);
}
