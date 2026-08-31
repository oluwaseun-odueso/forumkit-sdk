import { useState } from 'react';
import Modal from './modal';
import PillButton from './pill-button';
import { CloseIcon } from './icons';
// Reuses the drafts modal's header/close shell, same convention as
// ReportModal/ShareModal, rather than a parallel one-off header.
import '../composer/drafts-list-modal.css';
import './confirm-dialog.css';

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
};

/**
 * The app's first confirmation dialog — every other destructive action
 * (deleting a draft, removing a composer attachment) fires immediately with
 * no confirm step, but a deleted post/comment is much harder to walk back,
 * so it gets one. Generic enough to reuse for future destructive actions.
 */
export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }: ConfirmDialogProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (confirming) return;
    setConfirming(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setConfirming(false);
    }
  }

  return (
    <Modal onClose={onCancel} maxWidth={400} blurBackground>
      <div className="fk-drafts-modal-header">
        <h3 className="fk-drafts-modal-title">{title}</h3>
        <button type="button" className="fk-drafts-modal-close" onClick={onCancel} disabled={confirming}>
          <CloseIcon size={18} />
        </button>
      </div>
      <div className="fk-confirm-dialog-body">
        <p className="fk-confirm-dialog-message">{message}</p>
        {error && <p className="fk-confirm-dialog-error">{error}</p>}
        <div className="fk-confirm-dialog-actions">
          <PillButton variant="surface" onClick={onCancel} disabled={confirming}>Cancel</PillButton>
          <PillButton variant="danger" onClick={() => void handleConfirm()} disabled={confirming}>
            {confirming ? 'Deleting…' : confirmLabel}
          </PillButton>
        </div>
      </div>
    </Modal>
  );
}
