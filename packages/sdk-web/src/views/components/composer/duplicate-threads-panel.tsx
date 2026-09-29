import type { SimilarThread } from '@forumkit/types';
import { CloseIcon } from '../shared/icons';

type Props = {
  duplicates: SimilarThread[];
  onOpenThread: (id: string) => void;
  onDismiss: () => void;
};

export default function DuplicateThreadsPanel({ duplicates, onOpenThread, onDismiss }: Props) {
  if (duplicates.length === 0) return null;
  return (
    <div className="fk-duplicate-panel">
      <div className="fk-duplicate-panel-header">
        <span className="fk-duplicate-panel-title">Similar threads already exist</span>
        <button type="button" className="fk-duplicate-panel-dismiss" aria-label="Dismiss" onClick={onDismiss}>
          <CloseIcon size={14} />
        </button>
      </div>
      <p className="fk-duplicate-panel-hint">You may want to check these before posting.</p>
      <ul className="fk-duplicate-panel-list">
        {duplicates.slice(0, 3).map(t => (
          <li key={t.id}>
            <button
              type="button"
              className="fk-duplicate-panel-row"
              onClick={() => onOpenThread(t.id)}
            >
              <span className="fk-duplicate-panel-row-title">{t.title}</span>
              <span className="fk-duplicate-panel-row-score">{Math.round(t.similarity * 100)}% match</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
