import { useState } from 'react';
import type { Draft } from '@forumkit/types';
import Modal from '../shared/modal';
import { CloseIcon, DraftIcon, TrashIcon } from '../shared/icons';
import MascotIcon from '../layout/mascot-icon';
import { fmtRelativeTime } from '../../lib/format-time';
import './drafts-list-modal.css';

type DraftsListModalProps = {
  items: Draft[];
  loading: boolean;
  onClose: () => void;
  onResume: (draft: Draft) => void;
  onDelete: (draftId: string) => Promise<void>;
};

export default function DraftsListModal({ items, loading, onClose, onResume, onDelete }: DraftsListModalProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, draftId: string) {
    e.stopPropagation();
    setDeletingId(draftId);
    try {
      await onDelete(draftId);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth={480}>
      <div className="fk-drafts-modal-header">
        <h3 className="fk-drafts-modal-title">Drafts</h3>
        <button type="button" className="fk-drafts-modal-close" onClick={onClose}>
          <CloseIcon size={18} />
        </button>
      </div>

      <div className="fk-drafts-modal-body">
        {loading ? (
          <div className="fk-drafts-modal-loading"><MascotIcon size={36} /></div>
        ) : items.length === 0 ? (
          <div className="fk-drafts-modal-empty">
            <DraftIcon size={28} />
            <p>No drafts yet. Save one from the composer to see it here.</p>
          </div>
        ) : (
          items.map((draft) => (
            <button
              key={draft.id}
              type="button"
              className="fk-drafts-modal-row"
              onClick={() => onResume(draft)}
            >
              <div className="fk-drafts-modal-row-main">
                <span className="fk-drafts-modal-row-title">{draft.title}</span>
                <span className="fk-drafts-modal-row-snippet">{draft.content.body || 'No body yet'}</span>
                <span className="fk-drafts-modal-row-time">Updated {fmtRelativeTime(draft.updatedAt)} ago</span>
              </div>
              <button
                type="button"
                className="fk-drafts-modal-row-trash"
                aria-label="Delete draft"
                disabled={deletingId === draft.id}
                onClick={(e) => handleDelete(e, draft.id)}
              >
                <TrashIcon size={16} />
              </button>
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}
