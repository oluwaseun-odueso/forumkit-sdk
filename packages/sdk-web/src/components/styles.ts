export const BASE_STYLES = `
  :host {
    display: block;
    font-family: var(--fk-font-family, system-ui, -apple-system, 'Segoe UI', sans-serif);
    font-size: var(--fk-font-size-base, 15px);
    line-height: 1.6;
    color: var(--fk-color-text-primary, #1a1a2e);
    background: var(--fk-color-bg, #ffffff);
    border-radius: var(--fk-border-radius, 8px);
    box-sizing: border-box;
  }

  *, *::before, *::after {
    box-sizing: inherit;
  }

  /* ── Layout ────────────────────────────────────────────────────── */

  .fk-container {
    max-width: 100%;
    padding: var(--fk-spacing-base, 20px);
  }

  .fk-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;
  }

  .fk-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--fk-color-text-primary, #1a1a2e);
  }

  /* ── Buttons ───────────────────────────────────────────────────── */

  .fk-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 44px;
    padding: 0 18px;
    border: none;
    border-radius: var(--fk-border-radius, 8px);
    background: var(--fk-color-primary, #6200ee);
    color: #ffffff;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.15s ease, transform 0.1s ease;
    white-space: nowrap;
  }

  .fk-btn:hover {
    background: var(--fk-color-primary-hover, #4b00b5);
  }

  .fk-btn:active {
    transform: translateY(1px);
  }

  .fk-btn:focus-visible {
    outline: 2px solid var(--fk-color-primary, #6200ee);
    outline-offset: 2px;
  }

  .fk-btn--ghost {
    background: transparent;
    color: var(--fk-color-text-primary, #1a1a2e);
    border: 1px solid var(--fk-color-border, #e2e8f0);
  }

  .fk-btn--ghost:hover {
    background: var(--fk-color-surface, #f8fafc);
  }

  .fk-btn--ghost:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .fk-btn--icon {
    min-height: 44px;
    min-width: 44px;
    padding: 0 10px;
    background: transparent;
    color: var(--fk-color-text-secondary, #64748b);
    border: 1px solid transparent;
    border-radius: var(--fk-border-radius, 8px);
    font-size: 0.85rem;
    gap: 4px;
  }

  .fk-btn--icon:hover {
    background: var(--fk-color-surface, #f8fafc);
    border-color: var(--fk-color-border, #e2e8f0);
    color: var(--fk-color-text-primary, #1a1a2e);
  }

  .fk-btn--icon.fk-btn--reacted {
    color: var(--fk-color-primary, #6200ee);
    border-color: var(--fk-color-primary, #6200ee);
    background: color-mix(in srgb, var(--fk-color-primary, #6200ee) 8%, transparent);
  }

  .fk-btn--sm {
    min-height: 36px;
    padding: 0 12px;
    font-size: 0.82rem;
  }

  .fk-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 0 4px;
    background: none;
    border: none;
    color: var(--fk-color-text-secondary, #64748b);
    font-family: inherit;
    font-size: 0.9rem;
    cursor: pointer;
    margin-bottom: 16px;
    border-radius: var(--fk-border-radius, 8px);
  }

  .fk-back-btn:hover {
    color: var(--fk-color-text-primary, #1a1a2e);
  }

  .fk-back-btn:focus-visible {
    outline: 2px solid var(--fk-color-primary, #6200ee);
    outline-offset: 2px;
  }

  /* ── Search and filter row ─────────────────────────────────────── */

  .fk-search {
    margin-bottom: 12px;
  }

  .fk-search input {
    width: 100%;
    min-height: 44px;
    padding: 0 14px;
    border: 1px solid var(--fk-color-border, #e2e8f0);
    border-radius: var(--fk-border-radius, 8px);
    background: var(--fk-color-bg, #ffffff);
    color: var(--fk-color-text-primary, #1a1a2e);
    font-family: inherit;
    font-size: 0.95rem;
  }

  .fk-search input:focus {
    outline: 2px solid var(--fk-color-primary, #6200ee);
    outline-offset: -1px;
    border-color: transparent;
  }

  .fk-tag-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
  }

  .fk-tag-filter-chip {
    display: inline-flex;
    align-items: center;
    min-height: 36px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid var(--fk-color-border, #e2e8f0);
    background: var(--fk-color-bg, #ffffff);
    color: var(--fk-color-text-secondary, #64748b);
    font-family: inherit;
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease;
  }

  .fk-tag-filter-chip:hover {
    background: var(--fk-color-surface, #f8fafc);
  }

  .fk-tag-filter-chip[aria-pressed="true"] {
    color: #ffffff;
    border-color: transparent;
  }

  /* ── Thread list ───────────────────────────────────────────────── */

  .fk-thread-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .fk-thread-card {
    display: block;
    padding: 16px 18px;
    border-radius: var(--fk-border-radius, 8px);
    border: 1px solid transparent;
    background: var(--fk-color-bg, #ffffff);
    cursor: pointer;
    text-align: left;
    width: 100%;
    font-family: inherit;
    color: inherit;
    transition: background 0.12s ease, border-color 0.12s ease;
  }

  .fk-thread-card:hover {
    background: var(--fk-color-surface, #f8fafc);
    border-color: var(--fk-color-border, #e2e8f0);
  }

  .fk-thread-card:focus-visible {
    outline: 2px solid var(--fk-color-primary, #6200ee);
    outline-offset: -2px;
  }

  .fk-thread-card--pinned {
    border-left: 3px solid var(--fk-color-primary, #6200ee);
    padding-left: 15px;
  }

  .fk-thread-card h3 {
    margin: 0 0 6px;
    font-size: 1rem;
    font-weight: 600;
    color: var(--fk-color-text-primary, #1a1a2e);
    line-height: 1.4;
  }

  .fk-thread-card:hover h3 {
    color: var(--fk-color-primary, #6200ee);
  }

  .fk-thread-snippet {
    margin: 0 0 10px;
    font-size: 0.875rem;
    color: var(--fk-color-text-secondary, #64748b);
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .fk-thread-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 0.8rem;
    color: var(--fk-color-text-secondary, #64748b);
  }

  /* ── Tags ──────────────────────────────────────────────────────── */

  .fk-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }

  .fk-tag-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
  }

  .fk-pinned-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--fk-color-primary, #6200ee) 12%, transparent);
    color: var(--fk-color-primary, #6200ee);
    font-size: 0.75rem;
    font-weight: 600;
  }

  /* ── Pagination ────────────────────────────────────────────────── */

  .fk-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: 20px;
    font-size: 0.875rem;
    color: var(--fk-color-text-secondary, #64748b);
  }

  /* ── Thread detail ─────────────────────────────────────────────── */

  .fk-thread-header {
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--fk-color-border, #e2e8f0);
  }

  .fk-thread-header h2 {
    margin: 0 0 10px;
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.35;
    color: var(--fk-color-text-primary, #1a1a2e);
  }

  .fk-thread-meta-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 14px;
    font-size: 0.85rem;
    color: var(--fk-color-text-secondary, #64748b);
  }

  .fk-thread-body {
    font-size: 0.95rem;
    line-height: 1.7;
    color: var(--fk-color-text-primary, #1a1a2e);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .fk-locked-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 999px;
    background: #fef3c7;
    color: #92400e;
    font-size: 0.78rem;
    font-weight: 600;
  }

  .fk-reaction-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 16px 0;
    padding: 14px 16px;
    background: var(--fk-color-surface, #f8fafc);
    border-radius: var(--fk-border-radius, 8px);
    font-size: 0.875rem;
    color: var(--fk-color-text-secondary, #64748b);
  }

  .fk-reaction-summary-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  /* ── AI toolbar ────────────────────────────────────────────────── */

  .fk-ai-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
  }

  /* ── AI panel ──────────────────────────────────────────────────── */

  .fk-ai-panel {
    margin-bottom: 20px;
    padding: 18px 20px;
    background: var(--fk-color-surface, #f8fafc);
    border: 1px solid var(--fk-color-border, #e2e8f0);
    border-left: 3px solid var(--fk-color-primary, #6200ee);
    border-radius: var(--fk-border-radius, 8px);
    font-size: 0.9rem;
  }

  .fk-ai-panel h4 {
    margin: 0 0 10px;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--fk-color-primary, #6200ee);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .fk-ai-panel ul {
    margin: 0 0 12px;
    padding-left: 20px;
  }

  .fk-ai-panel li {
    margin-bottom: 4px;
    line-height: 1.5;
  }

  .fk-ai-panel p {
    margin: 0 0 10px;
    line-height: 1.6;
  }

  .fk-confidence-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-left: 6px;
  }

  .fk-confidence-badge[data-confidence="high"] {
    background: #d1fae5;
    color: #065f46;
  }

  .fk-confidence-badge[data-confidence="medium"] {
    background: #fef3c7;
    color: #92400e;
  }

  .fk-confidence-badge[data-confidence="low"] {
    background: #fee2e2;
    color: #991b1b;
  }

  /* ── Posts ─────────────────────────────────────────────────────── */

  .fk-posts-section {
    margin-bottom: 24px;
  }

  .fk-posts-section h3 {
    margin: 0 0 16px;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--fk-color-text-secondary, #64748b);
  }

  .fk-post {
    padding: 16px 0;
    border-bottom: 1px solid var(--fk-color-border, #e2e8f0);
  }

  .fk-post:last-of-type {
    border-bottom: none;
  }

  .fk-post--accepted {
    padding: 16px;
    background: #f0fdf4;
    border: 1px solid #a7f3d0;
    border-radius: var(--fk-border-radius, 8px);
    margin-bottom: 8px;
  }

  .fk-post--reply {
    margin-left: clamp(16px, 5%, 40px);
    padding-left: 16px;
    border-left: 2px solid var(--fk-color-border, #e2e8f0);
    border-bottom: none;
  }

  .fk-post-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
    font-size: 0.82rem;
    color: var(--fk-color-text-secondary, #64748b);
  }

  .fk-post-author {
    font-weight: 600;
    color: var(--fk-color-text-primary, #1a1a2e);
  }

  .fk-accepted-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 999px;
    background: #10b981;
    color: #ffffff;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .fk-post-body {
    font-size: 0.925rem;
    line-height: 1.7;
    color: var(--fk-color-text-primary, #1a1a2e);
    word-break: break-word;
    margin-bottom: 12px;
  }

  .fk-reactions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }

  /* ── Code formatting ───────────────────────────────────────────── */

  .fk-code-block {
    margin: 12px 0;
    padding: 14px 16px;
    background: var(--fk-color-surface, #f8fafc);
    border: 1px solid var(--fk-color-border, #e2e8f0);
    border-radius: var(--fk-border-radius, 8px);
    overflow-x: auto;
    font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
    font-size: 0.875em;
    line-height: 1.6;
  }

  .fk-code-block code {
    background: none;
    padding: 0;
    font-size: inherit;
  }

  .fk-code-inline {
    padding: 2px 6px;
    background: var(--fk-color-surface, #f8fafc);
    border: 1px solid var(--fk-color-border, #e2e8f0);
    border-radius: 4px;
    font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
    font-size: 0.875em;
  }

  /* ── Composer ──────────────────────────────────────────────────── */

  .fk-composer {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid var(--fk-color-border, #e2e8f0);
  }

  .fk-composer-label {
    display: block;
    margin-bottom: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--fk-color-text-primary, #1a1a2e);
  }

  .fk-textarea {
    display: block;
    width: 100%;
    min-height: 100px;
    padding: 12px 14px;
    border: 1px solid var(--fk-color-border, #e2e8f0);
    border-radius: var(--fk-border-radius, 8px);
    background: var(--fk-color-bg, #ffffff);
    color: var(--fk-color-text-primary, #1a1a2e);
    font-family: inherit;
    font-size: 0.925rem;
    line-height: 1.6;
    resize: vertical;
    margin-bottom: 10px;
  }

  .fk-textarea:focus {
    outline: 2px solid var(--fk-color-primary, #6200ee);
    outline-offset: -1px;
    border-color: transparent;
  }

  .fk-composer-hint {
    margin: 0 0 10px;
    font-size: 0.8rem;
    color: var(--fk-color-text-secondary, #64748b);
  }

  .fk-composer-actions {
    display: flex;
    justify-content: flex-end;
  }

  .fk-locked-notice {
    padding: 14px 16px;
    background: #fef3c7;
    border-radius: var(--fk-border-radius, 8px);
    color: #92400e;
    font-size: 0.875rem;
    margin-top: 20px;
  }

  /* ── New thread form ───────────────────────────────────────────── */

  .fk-form-title {
    margin: 0 0 24px;
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--fk-color-text-primary, #1a1a2e);
  }

  .fk-form-group {
    margin-bottom: 18px;
  }

  .fk-form-label {
    display: block;
    margin-bottom: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--fk-color-text-primary, #1a1a2e);
  }

  .fk-form-input {
    display: block;
    width: 100%;
    min-height: 44px;
    padding: 0 14px;
    border: 1px solid var(--fk-color-border, #e2e8f0);
    border-radius: var(--fk-border-radius, 8px);
    background: var(--fk-color-bg, #ffffff);
    color: var(--fk-color-text-primary, #1a1a2e);
    font-family: inherit;
    font-size: 0.95rem;
  }

  .fk-form-input:focus {
    outline: 2px solid var(--fk-color-primary, #6200ee);
    outline-offset: -1px;
    border-color: transparent;
  }

  /* ── Duplicate detection panel ─────────────────────────────────── */

  .fk-duplicate-panel {
    margin-bottom: 16px;
    padding: 14px 16px;
    background: #fffbeb;
    border: 1px solid #fcd34d;
    border-radius: var(--fk-border-radius, 8px);
  }

  .fk-duplicate-panel p {
    margin: 0 0 10px;
    font-size: 0.875rem;
    font-weight: 600;
    color: #92400e;
  }

  .fk-duplicate-panel ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .fk-duplicate-panel li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
    font-size: 0.875rem;
  }

  .fk-duplicate-panel li:last-child {
    margin-bottom: 0;
  }

  .fk-similarity {
    font-size: 0.78rem;
    color: var(--fk-color-text-secondary, #64748b);
    white-space: nowrap;
  }

  .fk-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 6px;
  }

  /* ── Jump to latest ────────────────────────────────────────────── */

  .fk-jump-btn {
    position: sticky;
    bottom: 16px;
    display: none;
    margin-left: auto;
    margin-right: 0;
    margin-top: 12px;
    width: fit-content;
    background: var(--fk-color-primary, #6200ee);
    color: #ffffff;
    border: none;
    border-radius: 999px;
    padding: 0 16px;
    min-height: 40px;
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 4px 12px #00000026;
    transition: opacity 0.2s ease;
  }

  .fk-jump-btn.fk-jump-btn--visible {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* ── Loading and error states ──────────────────────────────────── */

  .fk-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 48px 24px;
    color: var(--fk-color-text-secondary, #64748b);
    font-size: 0.9rem;
  }

  .fk-loading::before {
    content: '';
    display: inline-block;
    width: 18px;
    height: 18px;
    border: 2px solid var(--fk-color-border, #e2e8f0);
    border-top-color: var(--fk-color-primary, #6200ee);
    border-radius: 50%;
    animation: fk-spin 0.7s linear infinite;
  }

  .fk-loading--inline {
    padding: 10px 0;
    justify-content: flex-start;
  }

  @keyframes fk-spin {
    to { transform: rotate(360deg); }
  }

  .fk-error {
    padding: 20px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: var(--fk-border-radius, 8px);
    color: #991b1b;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .fk-empty {
    padding: 40px 24px;
    text-align: center;
    color: var(--fk-color-text-secondary, #64748b);
    font-size: 0.9rem;
  }
`;
