import { useState } from 'react';
import Modal from './modal';
import PillButton from './pill-button';
import { CloseIcon } from './icons';
// Reuses the drafts modal's header/close shell and the edit-profile
// modal's input/textarea/error styling, same "extend, don't duplicate"
// convention as ShareModal and Notifications.tsx.
import '../composer/drafts-list-modal.css';
import '../profile/edit-profile-modal.css';
import './report-modal.css';

const MAX_REASON = 500;

export type ReportTarget =
  | { type: 'thread'; threadId: string }
  | { type: 'comment'; threadId: string; commentId: string };

type ReportModalProps = {
  target: ReportTarget;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
};

export default function ReportModal({ target, onClose, onSubmit }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    const trimmed = reason.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setDone(true);
    } catch {
      setError('Could not submit the report. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth={480} blurBackground>
      <div className="fk-drafts-modal-header">
        <h3 className="fk-drafts-modal-title">
          Report {target.type === 'thread' ? 'thread' : 'comment'}
        </h3>
        <button type="button" className="fk-drafts-modal-close" onClick={onClose}>
          <CloseIcon size={18} />
        </button>
      </div>

      <div className="fk-drafts-modal-body fk-report-modal-body">
        {done ? (
          <div className="fk-drafts-modal-empty">
            <p>Thanks — this has been reported to the moderators.</p>
          </div>
        ) : (
          <>
            <label className="fk-edit-modal-label" style={{ display: 'block', marginBottom: 6 }}>
              Why are you reporting this?
            </label>
            <textarea
              className="fk-edit-modal-textarea"
              rows={4}
              maxLength={MAX_REASON}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="A brief description helps moderators review this faster…"
              autoFocus
            />
            <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {reason.length}/{MAX_REASON}
            </div>

            {error && <div className="fk-edit-modal-save-error">{error}</div>}

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <PillButton variant="accent" disabled={!reason.trim() || submitting} onClick={handleSubmit}>
                {submitting ? 'Submitting…' : 'Submit report'}
              </PillButton>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
