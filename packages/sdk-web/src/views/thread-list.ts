import type { Tag } from '@forumkit/types';
import { escapeHtml } from '../lib/html';
import type { ThreadWithMetaData } from '../api/client';


export function renderThreadList(
  state: { page: number; search: string; activeTagId: string | null },
  threads: ThreadWithMetaData[],
  total: number,
  availableTags: Tag[],
): string {
  const limit = 20;

  return `
    <div class="fk-container">
      <header class="fk-header">
        <h2>Discussions</h2>
        <button class="fk-btn" data-action="new-thread" aria-label="Start a new discussion">
          New thread
        </button>
      </header>

      <div class="fk-search">
        <input
          type="search"
          placeholder="Search discussions..."
          value="${escapeHtml(state.search)}"
          data-action="search-input"
          aria-label="Search discussions"
          aria-controls="fk-thread-list"
        />
      </div>

      ${availableTags.length > 0 ? renderTagFilters(availableTags, state.activeTagId) : ''}

      <div
        class="fk-thread-list"
        id="fk-thread-list"
        aria-live="polite"
        aria-label="Thread list"
      >
        ${threads.length === 0 ? renderEmpty(state.search, state.activeTagId) : threads.map(renderThreadCard).join('')}
      </div>

      ${total > limit ? renderPagination(state.page, total, limit) : ''}
    </div>
  `;
}

function renderTagFilters(tags: Tag[], activeTagId: string | null): string {
  const chips = tags
    .map(
      (tag) => `
        <button
          class="fk-tag-filter-chip"
          data-action="filter-tag"
          data-tag-id="${escapeHtml(tag.id)}"
          aria-pressed="${activeTagId === tag.id ? 'true' : 'false'}"
          style="${activeTagId === tag.id ? `background:${escapeHtml(tag.color)};` : ''}"
          aria-label="Filter by ${escapeHtml(tag.name)}"
        >${escapeHtml(tag.name)}</button>
      `,
    )
    .join('');

  return `<div class="fk-tag-filters" role="group" aria-label="Filter by tag">${chips}</div>`;
}

function renderThreadCard(thread: ThreadWithMetaData): string {
  const pinnedClass = thread.pinned ? ' fk-thread-card--pinned' : '';
  const tagsHtml = thread.tags.length > 0 ? renderTagBadges(thread.tags) : '';
  const metaParts: string[] = [];

  metaParts.push(`${thread.postCount} ${thread.postCount === 1 ? 'reply' : 'replies'}`);
  if (thread.reactionCount > 0) {
    metaParts.push(`${thread.reactionCount} ${thread.reactionCount === 1 ? 'reaction' : 'reactions'}`);
  }
  metaParts.push(formatRelativeDate(new Date(thread.createdAt)));

  const snippet = escapeHtml(thread.body.slice(0, 160));

  return `
    <article
      class="fk-thread-card${pinnedClass}"
      tabindex="0"
      data-action="open-thread"
      data-thread-id="${escapeHtml(thread.id)}"
      id="fk-thread-card-${escapeHtml(thread.id)}"
      role="article"
      aria-label="${escapeHtml(thread.title)}"
    >
      <div class="fk-thread-card-top">
        ${thread.pinned ? '<span class="fk-pinned-badge" aria-label="Pinned">Pinned</span>' : ''}
        ${tagsHtml}
      </div>
      <h3>${escapeHtml(thread.title)}</h3>
      ${snippet ? `<p class="fk-thread-snippet">${snippet}</p>` : ''}
      <div class="fk-thread-meta" aria-label="Thread info">
        ${metaParts.join('<span class="fk-thread-meta-sep" aria-hidden="true"> · </span>')}
      </div>
    </article>
  `;
}

function renderTagBadges(tags: Tag[]): string {
  return `
    <div class="fk-tags">
      ${tags.map((tag) => `
        <span
          class="fk-tag-badge"
          style="background:${escapeHtml(tag.color)}20;color:${escapeHtml(tag.color)}"
        >${escapeHtml(tag.name)}</span>
      `).join('')}
    </div>
  `;
}

function renderPagination(page: number, total: number, limit: number): string {
  const totalPages = Math.ceil(total / limit);
  return `
    <nav class="fk-pagination" aria-label="Thread list navigation">
      <button
        class="fk-btn fk-btn--ghost fk-btn--sm"
        data-action="prev-page"
        data-page="${page - 1}"
        ${page <= 1 ? 'disabled aria-disabled="true"' : ''}
        aria-label="Previous page"
      >Previous</button>
      <span aria-current="page">Page ${page} of ${totalPages}</span>
      <button
        class="fk-btn fk-btn--ghost fk-btn--sm"
        data-action="next-page"
        data-page="${page + 1}"
        ${page >= totalPages ? 'disabled aria-disabled="true"' : ''}
        aria-label="Next page"
      >Next</button>
    </nav>
  `;
}

function renderEmpty(search: string, activeTagId: string | null): string {
  if (search) {
    return `<p class="fk-empty">No threads match "${escapeHtml(search)}". Try a different search.</p>`;
  }
  if (activeTagId) {
    return `<p class="fk-empty">No threads with this tag yet. Be the first to start a discussion.</p>`;
  }
  return `<p class="fk-empty">No discussions yet. Start the first one.</p>`;
}

export function formatRelativeDate(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export { renderTagBadges };
