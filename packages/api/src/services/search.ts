import type { DB } from '../db';
import type { EmbedFn } from '@forumkit/ai';
import { embedOne } from '@forumkit/ai';
import * as searchRepo from '../repositories/search';
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

export async function searchThreads(
  db: DB,
  forumId: string,
  query: string,
  opts: SearchOpts,
  embedFn: EmbedFn,
): Promise<{ results: SearchResult[]; total: number; mode: SearchMode }> {
  const vector = await embedOne(query, embedFn);
  const fetchOpts = overfetchOpts(opts);

  // Keyword+fuzzy always runs — it's cheap (a single indexed query) and is
  // the only source at all when embedding generation fails.
  const keywordPromise = searchRepo.keywordSearch(db, forumId, query, fetchOpts);

  if (!vector) {
    const { results, total } = await keywordPromise;
    const offset = (opts.page - 1) * opts.limit;
    return { results: results.slice(offset, offset + opts.limit), total, mode: 'keyword' };
  }

  // Both run concurrently — semantic search is a separate query, not a
  // dependency of the keyword one, so there's no reason to wait on one
  // before starting the other.
  const [semantic, keyword] = await Promise.all([
    searchRepo.semanticSearch(db, forumId, vector, fetchOpts),
    keywordPromise,
  ]);
  const merged = mergeRanked(semantic.results, keyword.results, (r) => r.threadId);
  return { ...paginate(merged, opts, semantic.total, keyword.total), mode: 'hybrid' };
}

export async function searchComments(
  db: DB,
  forumId: string,
  query: string,
  opts: SearchOpts,
  embedFn: EmbedFn,
  threadId?: string,
): Promise<{ results: CommentSearchResult[]; total: number; mode: SearchMode }> {
  const vector = await embedOne(query, embedFn);
  const fetchOpts = overfetchOpts(opts);

  const keywordPromise = searchRepo.keywordSearchComments(db, forumId, query, fetchOpts, threadId);

  if (!vector) {
    const { results, total } = await keywordPromise;
    const offset = (opts.page - 1) * opts.limit;
    return { results: results.slice(offset, offset + opts.limit), total, mode: 'keyword' };
  }

  const [semantic, keyword] = await Promise.all([
    searchRepo.semanticSearchComments(db, forumId, vector, fetchOpts, threadId),
    keywordPromise,
  ]);
  const merged = mergeRanked(semantic.results, keyword.results, (r) => r.commentId);
  return { ...paginate(merged, opts, semantic.total, keyword.total), mode: 'hybrid' };
}
