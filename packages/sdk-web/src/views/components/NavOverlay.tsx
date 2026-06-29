import { useRef, useEffect } from 'react';
import type { DirectoryEntry } from '../data/seed';
import { TagPill } from './TagPill';

type Mode = 'search' | 'tag';

type Props = {
  mode: Mode | null;
  tag: string;
  query: string;
  directory: DirectoryEntry[];
  onClose: () => void;
  onQueryChange: (q: string) => void;
};

function matchesQuery(entry: DirectoryEntry, query: string): boolean {
  const q = query.toLowerCase();
  return (
    entry.title.toLowerCase().includes(q) ||
    entry.preview.toLowerCase().includes(q) ||
    entry.tags.some(t => t.toLowerCase().includes(q))
  );
}

function matchesTag(entry: DirectoryEntry, tag: string): boolean {
  return entry.tags.includes(tag);
}

export function NavOverlay({ mode, tag, query, directory, onClose, onQueryChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'search') {
      inputRef.current?.focus();
    }
  }, [mode]);

  if (!mode) return null;

  const filtered = mode === 'search'
    ? (query.length > 0 ? directory.filter(e => matchesQuery(e, query)) : directory)
    : directory.filter(e => matchesTag(e, tag));

  const heading = mode === 'tag' ? `#${tag}` : 'Search';
  const resultLabel = mode === 'search' && query
    ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${query}"`
    : mode === 'tag'
      ? `${filtered.length} thread${filtered.length !== 1 ? 's' : ''} tagged #${tag}`
      : `${directory.length} threads`;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      background: 'var(--t45, rgba(16,21,36,.96))',
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      display: 'flex', flexDirection: 'column',
      padding: '28px 24px',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 600, color: 'var(--t30, #e9eff8)' }}>
          {heading}
        </span>
        <button
          type="button"
          aria-label="Close overlay"
          onClick={onClose}
          style={{
            width: 34, height: 34, borderRadius: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--t23, #acb7cc)', fontSize: 15,
            background: 'var(--t59, rgba(218,229,247,.06))',
            border: '1px solid var(--t66, rgba(218,229,247,.14))',
          }}
        >
          ✕
        </button>
      </div>

      {/* Search input */}
      {mode === 'search' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 16px', borderRadius: 14, marginBottom: 20,
          background: 'var(--t58, rgba(218,229,247,.05))',
          border: '1px solid var(--t65, rgba(218,229,247,.13))',
        }}>
          <span style={{ color: 'var(--t14, #6b7488)', fontSize: 16, lineHeight: 1 }}>⌕</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
            placeholder="Search threads…"
            aria-label="Search threads"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--t30, #e9eff8)', fontFamily: 'Sora,sans-serif', fontSize: 15,
            }}
          />
          {query.length > 0 && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onQueryChange('')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t14, #6b7488)', fontSize: 14 }}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Result label */}
      <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 11, letterSpacing: '1.4px', color: 'var(--t12, #5b6376)', marginBottom: 16 }}>
        {resultLabel.toUpperCase()}
      </div>

      {/* Thread list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(entry => (
          <button
            key={entry.id}
            type="button"
            onClick={onClose}
            style={{
              display: 'flex', flexDirection: 'column', gap: 8,
              padding: '16px 20px', borderRadius: 16, cursor: 'pointer', textAlign: 'left',
              background: 'linear-gradient(165deg, var(--t59, rgba(218,229,247,.06)), var(--t55, rgba(218,229,247,.02)))',
              border: '1px solid var(--t64, rgba(218,229,247,.12))',
              boxShadow: '0 8px 24px -14px var(--t38, rgba(0,0,0,.65))',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {entry.tags.map(t => <TagPill key={t} tag={t} />)}
            </div>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 15, fontWeight: 500, color: 'var(--t30, #e9eff8)', lineHeight: 1.3 }}>
              {entry.title}
            </div>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 13, color: 'var(--t17, #8590a5)', lineHeight: 1.5 }}>
              {entry.preview}
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 11, color: 'var(--t14, #6b7488)' }}>
                ↑ {entry.votes}
              </span>
              <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 11, color: 'var(--t14, #6b7488)' }}>
                💬 {entry.replies}
              </span>
              <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 11, color: 'var(--t12, #5b6376)' }}>
                {entry.time}
              </span>
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <div style={{
            padding: '40px 0', textAlign: 'center',
            fontFamily: 'Sora,sans-serif', fontSize: 14, color: 'var(--t14, #6b7488)',
          }}>
            No threads found.
          </div>
        )}
      </div>
    </div>
  );
}
