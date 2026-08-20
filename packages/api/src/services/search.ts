import type { DB } from '../db';
import type { EmbedFn } from '@forumkit/ai';
import { embedOne } from '@forumkit/ai';
import * as searchRepo from '../repositories/search';
import * as attachmentRepo from '../repositories/attachment';
import { rawAttachmentUrl } from '../lib/attachment-url';
import type { SearchResult, CommentSearchResult } from '@forumkit/types';

type SearchOpts = { page: number; limit: number };
type SearchMode = 'semantic' | 'keyword' | 'hybrid';

// Merges two ranked, already-deduped-within-themselves result lists into one
// list, deduping across them by key (a row found by both semantic and
// keyword/fuzzy search keeps whichever rank is higher, rather than showing
// twice). This is what makes search "hybrid": semantic finds
// conceptually-related matches even with zero shared words, while
// keyword/fuzzy catches typos and exact phrasing semantic search can miss —
// running both and merging gets the benefit of each instead of picking one.
function mergeRanked<T extends { rank: number }>(
  listA: T[],
  listB: T[],
  keyOf: (item: T) => string,
): T[] {
  const byKey = new Map<string, T>();
  for (const item of [...listA, ...listB]) {
    const key = keyOf(item);
    const existing = byKey.get(key);
    // Keep whichever version of this row scored higher, so a row that both
    // methods found isn't shown twice and gets credit for its best score.
    if (!existing || item.rank > existing.rank) byKey.set(key, item);
  }
  return Array.from(byKey.values()).sort((a, b) => b.rank - a.rank);
}

// Slices a merged, sorted list down to the requested page. total uses
// Math.max of the two source totals (each already an accurate COUNT(*) over
// its own unpaginated match set, per repositories/search.ts) rather than
// their sum — the true number of distinct matching rows is somewhere
// between max(a, b) and a + b depending on overlap, and max is the more
// realistic estimate since a genuinely good result usually satisfies both
// search methods at once.
function paginate<T>(merged: T[], opts: SearchOpts, totalA: number, totalB: number): { results: T[]; total: number } {
  const offset = (opts.page - 1) * opts.limit;
  return {
    results: merged.slice(offset, offset + opts.limit),
    total: Math.max(totalA, totalB),
  };
}

// How many rows to ask each underlying search for before merging — needs to
// cover every row up through the requested page (so the merge+sort has
// enough candidates to slice from), not just one page's worth from each
// individual source.
function overfetchOpts(opts: SearchOpts): SearchOpts {
  return { page: 1, limit: opts.page * opts.limit };
}

// Resolves each result's thumbnail: looks up every distinct threadId in the
// (already paginated — only the page actually being returned, not the
// overfetched candidate set) results, finds each thread's first image
// attachment, and stamps its download URL onto imageUrl — plus how many
// image attachments the thread has in total onto mediaCount, so the Media
// tab can show a gallery-style "1/N" badge on multi-image posts. Same
// find-first-image-per-thread pattern services/thread.ts's surfaceRelated
// already uses for the "Similar Posts" rail. Works for both SearchResult
// and CommentSearchResult since both carry a threadId — a comment shows its
// parent thread's image, since a comment can't have its own attachment.
async function hydrateImages<T extends { threadId: string }>(
  db: DB,
  publicApiUrl: string,
  forumId: string,
  results: T[],
): Promise<(T & { imageUrl: string | null; mediaCount: number })[]> {
  if (results.length === 0) return [];
  const threadIds = [...new Set(results.map((r) => r.threadId))];
  const attachments = await attachmentRepo.listAttachmentsByThreadIds(db, threadIds);
  const firstImageByThread = new Map<string, string>();
  const imageCountByThread = new Map<string, number>();
  for (const a of attachments) {
    if (!a.threadId || !a.mimeType.startsWith('image/')) continue;
    if (!firstImageByThread.has(a.threadId)) {
      firstImageByThread.set(a.threadId, rawAttachmentUrl(publicApiUrl, forumId, a.id));
    }
    imageCountByThread.set(a.threadId, (imageCountByThread.get(a.threadId) ?? 0) + 1);
  }
  return results.map((r) => ({
    ...r,
    imageUrl: firstImageByThread.get(r.threadId) ?? null,
    mediaCount: imageCountByThread.get(r.threadId) ?? 0,
  }));
}

export async function searchThreads(
  db: DB,
  publicApiUrl: string,
  forumId: string,
  query: string,
  opts: SearchOpts,
  embedFn: EmbedFn,
): Promise<{ results: SearchResult[]; total: number; mode: SearchMode }> {
  const vector = await embedOne(query, embedFn);
  const fetchOpts = overfetchOpts(opts);

  // Keyword+fuzzy always runs — it's cheap (a single indexed query) and is
  // the only source at all when embedding generation fails.
  const keywordPromise = searchRepo.keywordSearch(db, publicApiUrl, forumId, query, fetchOpts);

  if (!vector) {
    const { results, total } = await keywordPromise;
    const offset = (opts.page - 1) * opts.limit;
    const page = results.slice(offset, offset + opts.limit);
    return { results: await hydrateImages(db, publicApiUrl, forumId, page), total, mode: 'keyword' };
  }

  // Both run concurrently — semantic search is a separate query, not a
  // dependency of the keyword one, so there's no reason to wait on one
  // before starting the other.
  const [semantic, keyword] = await Promise.all([
    searchRepo.semanticSearch(db, publicApiUrl, forumId, vector, fetchOpts),
    keywordPromise,
  ]);
  const merged = mergeRanked(semantic.results, keyword.results, (r) => r.threadId);
  const { results, total } = paginate(merged, opts, semantic.total, keyword.total);
  return { results: await hydrateImages(db, publicApiUrl, forumId, results), total, mode: 'hybrid' };
}

export async function searchComments(
  db: DB,
  publicApiUrl: string,
  forumId: string,
  query: string,
  opts: SearchOpts,
  embedFn: EmbedFn,
  threadId?: string,
): Promise<{ results: CommentSearchResult[]; total: number; mode: SearchMode }> {
  const vector = await embedOne(query, embedFn);
  const fetchOpts = overfetchOpts(opts);

  const keywordPromise = searchRepo.keywordSearchComments(db, publicApiUrl, forumId, query, fetchOpts, threadId);

  if (!vector) {
    const { results, total } = await keywordPromise;
    const offset = (opts.page - 1) * opts.limit;
    const page = results.slice(offset, offset + opts.limit);
    return { results: await hydrateImages(db, publicApiUrl, forumId, page), total, mode: 'keyword' };
  }

  const [semantic, keyword] = await Promise.all([
    searchRepo.semanticSearchComments(db, publicApiUrl, forumId, vector, fetchOpts, threadId),
    keywordPromise,
  ]);
  const merged = mergeRanked(semantic.results, keyword.results, (r) => r.commentId);
  const { results, total } = paginate(merged, opts, semantic.total, keyword.total);
  return { results: await hydrateImages(db, publicApiUrl, forumId, results), total, mode: 'hybrid' };
}
