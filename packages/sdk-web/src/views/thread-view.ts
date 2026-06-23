import type { Post, SimilarThread, AISummary, AISuggestion, ReactionType } from '@forumkit/types';
import { escapeHtml, renderBody } from '../lib/html';
import { renderTagBadges, formatRelativeDate } from './thread-list';
import type { ThreadWithMetaData } from '../api/client';

export type AIState =
  | { status: 'idle' }
  | { status: 'loading'; mode: 'summarise' | 'suggest' }
  | { status: 'done'; result: AISummary | AISuggestion; mode: 'summarise' | 'suggest' }
  | { status: 'error'; message: string };

const REACTION_EMOJI: Record<ReactionType, string> = {
  like:       '👍',
  helpful:    '💡',
  insightful: '✨',
  funny:      '😄',
};

const REACTION_TYPES: ReactionType[] = ['like', 'helpful', 'insightful', 'funny'];

export function renderThreadView(
  thread: ThreadWithMetaData,
  posts: Post[],
  aiState: AIState,
  currentUserId: string,
): string {
  const visiblePosts = posts.filter((p) => p.status !== 'deleted');
  const perTypeReactions = computeReactionTotals(visiblePosts);
  const reactionSummaryHtml = renderReactionSummary(perTypeReactions);
  const replyCount = visiblePosts.length;

  return `
    <div class="fk-container">
      <nav>
        <button class="fk-back-btn" data-action="back" aria-label="Back to thread list">
          &#8592; Back
        </button>
      </nav>

      <article class="fk-thread-header">
        <h2 id="fk-thread-title" tabindex="-1">${escapeHtml(thread.title)}</h2>
        <div class="fk-thread-meta-row">
          ${thread.tags.length > 0 ? renderTagBadges(thread.tags) : ''}
          ${thread.status === 'locked'
            ? '<span class="fk-locked-badge" aria-label="Thread is locked">Locked</span>'
            : ''}
          <span>${formatRelativeDate(new Date(thread.createdAt))}</span>
          <span>${thread.viewCount} ${thread.viewCount === 1 ? 'view' : 'views'}</span>
        </div>
        <div class="fk-thread-body">${renderBody(thread.body)}</div>
      </article>

      ${reactionSummaryHtml}

      <div class="fk-ai-toolbar" role="toolbar" aria-label="AI tools">
        <button
          class="fk-btn fk-btn--ghost fk-btn--sm"
          data-action="ai-summarise"
          aria-label="Summarise this thread with AI"
          ${aiState.status === 'loading' && aiState.mode === 'summarise' ? 'disabled' : ''}
        >Summarise</button>
        <button
          class="fk-btn fk-btn--ghost fk-btn--sm"
          data-action="ai-suggest"
          aria-label="Get an AI-suggested answer"
          ${aiState.status === 'loading' && aiState.mode === 'suggest' ? 'disabled' : ''}
        >Suggest answer</button>
      </div>

      ${renderAIPanel(aiState)}

      <section
        class="fk-posts-section"
        aria-label="${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}"
        aria-live="polite"
        id="fk-posts-list"
      >
        <h3>${replyCount} ${replyCount === 1 ? 'Reply' : 'Replies'}</h3>
        ${visiblePosts.length === 0
          ? '<p class="fk-empty">No replies yet. Be the first to respond.</p>'
          : visiblePosts.map((p) => renderPost(p, thread, currentUserId)).join('')}
      </section>

      <button
        class="fk-jump-btn"
        id="fk-jump-btn"
        data-action="jump-to-latest"
        aria-label="Jump to latest reply"
      >Latest &#8595;</button>

      ${thread.status === 'locked'
        ? '<p class="fk-locked-notice" role="status">This thread is locked. No new replies.</p>'
        : renderComposer(null)}
    </div>
  `;
}

function renderPost(post: Post, thread: ThreadWithMetaData, currentUserId: string): string {
  const isAccepted = post.isAcceptedAnswer;
  const isReply = post.parentPostId !== null;
  const canAccept =
    currentUserId === thread.authorId && !isAccepted && thread.status !== 'locked';

  const classes = [
    'fk-post',
    isAccepted ? 'fk-post--accepted' : '',
    isReply ? 'fk-post--reply' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `
    <article class="${classes}" id="fk-post-${escapeHtml(post.id)}">
      <div class="fk-post-meta">
        ${isAccepted
          ? '<span class="fk-accepted-badge" aria-label="Accepted answer">&#10003; Accepted answer</span>'
          : ''}
        <span class="fk-post-author">${escapeHtml(post.authorId)}</span>
        <span>${formatRelativeDate(new Date(post.createdAt))}</span>
      </div>
      <div class="fk-post-body">${renderBody(post.body)}</div>
      <div class="fk-reactions" role="group" aria-label="React to this post">
        ${renderReactionButtons(post, thread.id)}
        <button
          class="fk-btn fk-btn--icon fk-btn--sm"
          data-action="reply"
          data-post-id="${escapeHtml(post.id)}"
          aria-label="Reply to this post"
        >Reply</button>
        ${canAccept
          ? `<button
              class="fk-btn fk-btn--icon fk-btn--sm"
              data-action="accept"
              data-post-id="${escapeHtml(post.id)}"
              data-thread-id="${escapeHtml(thread.id)}"
              aria-label="Mark as accepted answer"
             >Accept</button>`
          : ''}
      </div>
    </article>
  `;
}

function renderReactionButtons(post: Post, threadId: string): string {
  return REACTION_TYPES.map((type) => {
    const count = post.reactionCounts[type] ?? 0;
    const label = count > 0 ? `${REACTION_EMOJI[type]} ${count}` : REACTION_EMOJI[type];
    return `
      <button
        class="fk-btn fk-btn--icon fk-btn--sm"
        data-action="react"
        data-post-id="${escapeHtml(post.id)}"
        data-thread-id="${escapeHtml(threadId)}"
        data-reaction-type="${type}"
        aria-label="${type}${count > 0 ? ` (${count})` : ''}"
        aria-pressed="false"
      >${label}</button>
    `;
  }).join('');
}

function computeReactionTotals(posts: Post[]): Partial<Record<ReactionType, number>> {
  const totals: Partial<Record<ReactionType, number>> = {};
  for (const post of posts) {
    for (const type of REACTION_TYPES) {
      const count = post.reactionCounts[type] ?? 0;
      if (count > 0) totals[type] = (totals[type] ?? 0) + count;
    }
  }
  return totals;
}

function renderReactionSummary(totals: Partial<Record<ReactionType, number>>): string {
  const entries = REACTION_TYPES.filter((t) => (totals[t] ?? 0) > 0);
  if (entries.length === 0) return '';

  const items = entries
    .map(
      (type) =>
        `<span class="fk-reaction-summary-item">
          ${REACTION_EMOJI[type]} <strong>${totals[type]}</strong> ${type}
        </span>`,
    )
    .join('');

  return `<div class="fk-reaction-summary" aria-label="Thread reaction totals">${items}</div>`;
}

function renderAIPanel(aiState: AIState): string {
  if (aiState.status === 'idle') return '';

  if (aiState.status === 'loading') {
    return `
      <div class="fk-ai-panel" aria-live="polite">
        <div class="fk-loading fk-loading--inline" role="status">AI is thinking...</div>
      </div>
    `;
  }

  if (aiState.status === 'error') {
    return `
      <div class="fk-ai-panel" role="alert" aria-live="assertive">
        <p>AI is unavailable right now. Try again later.</p>
      </div>
    `;
  }

  if (aiState.mode === 'summarise') {
    const summary = aiState.result as AISummary;
    const points = summary.keyPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join('');
    const openQs = summary.openQuestions.length > 0
      ? `<h4>Open questions</h4>
         <ul>${summary.openQuestions.map((q) => `<li>${escapeHtml(q)}</li>`).join('')}</ul>`
      : '';

    return `
      <div class="fk-ai-panel" aria-live="polite" aria-label="AI summary">
        <h4>AI Summary</h4>
        ${points ? `<ul>${points}</ul>` : ''}
        ${summary.conclusion
          ? `<p><strong>Conclusion:</strong> ${escapeHtml(summary.conclusion)}</p>`
          : ''}
        ${openQs}
      </div>
    `;
  }

  const suggestion = aiState.result as AISuggestion;
  const caveats = suggestion.caveats.length > 0
    ? `<ul>${suggestion.caveats.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul>`
    : '';

  return `
    <div class="fk-ai-panel" aria-live="polite" aria-label="AI suggestion">
      <h4>
        AI Suggestion
        <span class="fk-confidence-badge" data-confidence="${suggestion.confidence}">
          ${escapeHtml(suggestion.confidence)} confidence
        </span>
      </h4>
      <p>${escapeHtml(suggestion.suggestion)}</p>
      ${caveats}
    </div>
  `;
}

export function renderComposer(parentPostId: string | null): string {
  const placeholder = parentPostId
    ? 'Write a reply...'
    : 'Write a reply to this thread...';

  return `
    <div class="fk-composer">
      <label class="fk-composer-label" for="fk-compose-input">
        ${parentPostId ? 'Reply' : 'Add a reply'}
      </label>
      <textarea
        id="fk-compose-input"
        class="fk-textarea"
        placeholder="${escapeHtml(placeholder)}"
        data-action="compose-input"
        aria-label="${escapeHtml(placeholder)}"
        rows="4"
      ></textarea>
      <p class="fk-composer-hint">Start with @ai to get an AI-assisted response.</p>
      <div class="fk-composer-actions">
        <button
          class="fk-btn"
          data-action="submit-post"
          ${parentPostId ? `data-parent-post-id="${escapeHtml(parentPostId)}"` : ''}
          aria-label="Submit reply"
        >Post reply</button>
      </div>
    </div>
  `;
}

export function renderNewThreadForm(
  duplicates: SimilarThread[],
  isChecking: boolean,
): string {
  return `
    <div class="fk-container">
      <nav>
        <button class="fk-back-btn" data-action="back" aria-label="Back to thread list">
          &#8592; Back
        </button>
      </nav>

      <h2 class="fk-form-title">Start a new discussion</h2>

      <div class="fk-form-group">
        <label class="fk-form-label" for="fk-thread-title-input">Title</label>
        <input
          id="fk-thread-title-input"
          type="text"
          class="fk-form-input"
          placeholder="What is your question or topic?"
          data-action="thread-title-input"
          aria-describedby="${duplicates.length > 0 ? 'fk-duplicate-panel' : ''}"
          autocomplete="off"
        />
      </div>

      ${isChecking
        ? '<div class="fk-loading fk-loading--inline" role="status">Checking for similar threads...</div>'
        : ''}

      ${duplicates.length > 0 ? renderDuplicatePanel(duplicates) : ''}

      <div class="fk-form-group">
        <label class="fk-form-label" for="fk-thread-body-input">Body</label>
        <textarea
          id="fk-thread-body-input"
          class="fk-textarea"
          placeholder="Describe your question or topic in detail..."
          data-action="thread-body-input"
          rows="6"
          aria-label="Thread body"
        ></textarea>
      </div>

      <div class="fk-form-actions">
        <button class="fk-btn fk-btn--ghost" data-action="back">Cancel</button>
        <button class="fk-btn" data-action="submit-thread" aria-label="Post this thread">
          Post thread
        </button>
      </div>
    </div>
  `;
}

function renderDuplicatePanel(duplicates: SimilarThread[]): string {
  const items = duplicates
    .map(
      (d) => `
        <li>
          <button
            class="fk-btn fk-btn--ghost fk-btn--sm"
            data-action="open-thread"
            data-thread-id="${escapeHtml(d.id)}"
            style="text-align:left;flex:1"
          >${escapeHtml(d.title)}</button>
          <span class="fk-similarity">${Math.round(d.similarity * 100)}% similar</span>
        </li>
      `,
    )
    .join('');

  return `
    <aside
      class="fk-duplicate-panel"
      id="fk-duplicate-panel"
      role="status"
      aria-live="polite"
      aria-label="Similar threads found"
    >
      <p>Similar threads already exist. Consider joining an existing discussion:</p>
      <ul>${items}</ul>
    </aside>
  `;
}
