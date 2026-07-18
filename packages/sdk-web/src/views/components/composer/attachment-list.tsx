import type { AttachmentFile } from '../../hooks/use-forum-state';
import { CloseIcon } from '../shared/icons';
import './attachment-list.css';

type AttachmentListProps = {
  attachments: AttachmentFile[];
  onRemove: (id: number) => void;
};

export default function AttachmentList({ attachments, onRemove }: AttachmentListProps) {
  if (attachments.length === 0) return null;
  return (
    <div className="fk-attach-list" onClick={e => e.stopPropagation()}>
      {attachments.map(file => (
        <div key={file.id} className="fk-attach-item">
          {file.kind === 'image' && file.url ? (
            <img className="fk-attach-thumb" src={file.url} alt={file.name} />
          ) : (
            <div className="fk-attach-thumb fk-attach-thumb--placeholder">{file.kind}</div>
          )}
          <div className="fk-attach-meta">
            <span className="fk-attach-name">{file.name}</span>
            <span className="fk-attach-size">{file.sizeLabel}</span>
          </div>
          <button type="button" className="fk-attach-remove" aria-label={`Remove ${file.name}`} onClick={() => onRemove(file.id)}>
            <CloseIcon size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
