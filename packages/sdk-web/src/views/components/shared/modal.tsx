import type { ReactNode } from 'react';
import './modal.css';

type ModalProps = {
  onClose: () => void;
  maxWidth?: number;
  blurBackground?: boolean;
  children: ReactNode;
};

// Generic backdrop + centered card shell shared by every overlay modal
// (Settings, Drafts, ...) — callers own everything inside the card
// (header, body, footer), since those vary too much to templatize.
// blurBackground is opt-in per modal, not global, since the dim overlay
// alone is enough for most and a blur is a heavier visual statement.
export default function Modal({ onClose, maxWidth = 480, blurBackground = false, children }: ModalProps) {
  return (
    <div
      className={`fk-modal-backdrop${blurBackground ? ' fk-modal-backdrop--blur' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="fk-modal" style={{ maxWidth }}>
        {children}
      </div>
    </div>
  );
}
