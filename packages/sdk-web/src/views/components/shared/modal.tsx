import type { ReactNode } from 'react';
import './modal.css';

type ModalProps = {
  onClose: () => void;
  maxWidth?: number;
  children: ReactNode;
};

// Generic backdrop + centered card shell shared by every overlay modal
// (Settings, Drafts, ...) — callers own everything inside the card
// (header, body, footer), since those vary too much to templatize.
export default function Modal({ onClose, maxWidth = 480, children }: ModalProps) {
  return (
    <div className="fk-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fk-modal" style={{ maxWidth }}>
        {children}
      </div>
    </div>
  );
}
