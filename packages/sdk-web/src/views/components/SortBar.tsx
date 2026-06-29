import { segActive, segInactive } from '../styles/tokens';
import type { Sort } from '../hooks/useForumState';

type Props = {
  sort: Sort;
  repliesHeader: string;
  onSetSort: (s: Sort) => void;
};

export function SortBar({ sort, repliesHeader, onSetSort }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '6px 2px 0' }}>
      <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 12, letterSpacing: '1.4px', color: 'var(--t15, #757f95)' }}>
        {repliesHeader}
      </span>
      <div role="tablist" aria-label="Sort replies" style={{
        display: 'flex', gap: 2, padding: 3, borderRadius: 11,
        background: 'var(--t58, rgba(218,229,247,.05))',
        border: '1px solid var(--t63, rgba(218,229,247,.1))',
      }}>
        {(['top', 'new', 'old'] as const).map(s => {
          const labels: Record<Sort, string> = { top: 'Top', new: 'Newest', old: 'Oldest' };
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={sort === s}
              onClick={() => onSetSort(s)}
              style={{ ...(sort === s ? segActive : segInactive), border: 'none' }}
            >
              {labels[s]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
