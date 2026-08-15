import { useState, useRef } from 'react';
import type { AttachmentFile } from '../../hooks/use-forum-state';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, StackedImagesIcon, PencilIcon, TrashIcon, UploadIcon } from '../shared/icons';
import { IMAGE_VIDEO_ACCEPT } from '../../lib/accepted-media-types';
import './media-gallery.css';

type MediaGalleryProps = {
  attachments: AttachmentFile[];
  onAddFiles: (files: FileList) => void;
  onRemoveFile: (id: number) => void;
  onUpdateMeta: (id: number, caption: string, attachmentUrl: string) => void;
};

type GalleryView = 'carousel' | 'gallery' | 'edit';

export default function MediaGallery({ attachments, onAddFiles, onRemoveFile, onUpdateMeta }: MediaGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreRef = useRef<HTMLInputElement>(null);

  const [carouselIdx, setCarouselIdx] = useState(0);
  const [view, setView] = useState<GalleryView>('carousel');
  const [editIdx, setEditIdx] = useState(0);
  const [editCaption, setEditCaption] = useState('');
  const [editUrl, setEditUrl] = useState('');

  const safeCarouselIdx = Math.min(carouselIdx, Math.max(0, attachments.length - 1));
  const current = attachments[safeCarouselIdx];

  function openEdit(idx: number) {
    const att = attachments[idx];
    setEditIdx(idx);
    setEditCaption(att?.caption ?? '');
    setEditUrl(att?.attachmentUrl ?? '');
    setView('edit');
  }

  function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) onAddFiles(e.target.files);
    e.target.value = '';
  }

  function handleRemoveCurrent() {
    if (!current) return;
    onRemoveFile(current.id);
    setCarouselIdx(i => Math.max(0, i - 1));
  }

  // ── Empty dropzone ────────────────────────────────────────────────────────
  if (attachments.length === 0) {
    return (
      <div className="fk-media-dropzone" onClick={() => fileInputRef.current?.click()}>
        <div className="fk-media-dropzone-label">
          <UploadIcon size={18} />
          Drag and drop or upload media
        </div>
        <input ref={fileInputRef} type="file" multiple accept={IMAGE_VIDEO_ACCEPT}
          className="fk-media-file-input" onChange={handleAddFiles} />
      </div>
    );
  }

  // ── Individual image edit ─────────────────────────────────────────────────
  if (view === 'edit') {
    const editing = attachments[editIdx];
    const safeEditIdx = Math.min(editIdx, attachments.length - 1);

    return (
      <div className="fk-media-edit">
        <div className="fk-media-edit-header">
          <button type="button" className="fk-media-edit-back-btn" onClick={() => setView('gallery')}>
            <ChevronLeftIcon size={18} />
            <span>Edit Image</span>
          </button>
        </div>

        <div className="fk-media-edit-stage">
          {editing?.url
            ? editing.kind === 'video'
              ? <video src={editing.url} className="fk-media-edit-img" controls muted />
              : <img src={editing.url} alt={editing.name} className="fk-media-edit-img" />
            : <div className="fk-media-edit-placeholder">{editing?.kind}</div>
          }
          {safeEditIdx > 0 && (
            <button type="button" className="fk-media-arrow fk-media-arrow--left"
              onClick={() => setEditIdx(i => i - 1)}><ChevronLeftIcon /></button>
          )}
          {safeEditIdx < attachments.length - 1 && (
            <button type="button" className="fk-media-arrow fk-media-arrow--right"
              onClick={() => setEditIdx(i => i + 1)}><ChevronRightIcon /></button>
          )}
          {attachments.length > 1 && (
            <div className="fk-media-dots">
              {attachments.map((_, i) => (
                <span key={i} className={`fk-media-dot${i === safeEditIdx ? ' fk-media-dot--active' : ''}`} />
              ))}
            </div>
          )}
        </div>

        <div className="fk-media-edit-fields">
          <div className="fk-media-edit-field-wrap">
            <input
              className="fk-media-edit-input"
              placeholder="Caption"
              value={editCaption}
              onChange={e => setEditCaption(e.target.value)}
              maxLength={180}
            />
            <span className="fk-media-edit-counter">{editCaption.length}/180</span>
          </div>
          <input
            className="fk-media-edit-input"
            placeholder="URL"
            value={editUrl}
            onChange={e => setEditUrl(e.target.value)}
          />
        </div>

        <div className="fk-media-edit-footer">
          <button type="button" className="fk-media-edit-btn fk-media-edit-btn--back"
            onClick={() => setView('gallery')}>Back</button>
          <button type="button" className="fk-media-edit-btn fk-media-edit-btn--save"
            onClick={() => {
              if (editing) onUpdateMeta(editing.id, editCaption, editUrl);
              setView('gallery');
            }}>Save</button>
        </div>
      </div>
    );
  }

  // ── Gallery grid (Edit all) ───────────────────────────────────────────────
  if (view === 'gallery') {
    return (
      <div className="fk-media-gallery">
        <div className="fk-media-gallery-header">
          <button type="button" className="fk-media-gallery-back-btn" onClick={() => setView('carousel')}>
            <ChevronLeftIcon size={18} />
            <span>Edit gallery</span>
          </button>
        </div>

        <div className="fk-media-gallery-grid">
          {attachments.map((att, i) => (
            <div key={att.id} className="fk-media-gallery-item">
              {att.url
                ? att.kind === 'video'
                  ? <video src={att.url} className="fk-media-gallery-thumb" muted />
                  : <img src={att.url} alt={att.name} className="fk-media-gallery-thumb" />
                : <div className="fk-media-gallery-thumb fk-media-gallery-thumb--placeholder">{att.kind}</div>
              }
              <div className="fk-media-gallery-actions">
                <button type="button" className="fk-media-gallery-action" aria-label="Edit"
                  onClick={() => openEdit(i)}>
                  <PencilIcon size={13} />
                </button>
                <button type="button" className="fk-media-gallery-action fk-media-gallery-action--delete"
                  aria-label="Delete" onClick={() => onRemoveFile(att.id)}>
                  <TrashIcon size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button type="button" className="fk-media-gallery-add-btn" onClick={() => addMoreRef.current?.click()}>
          <PlusIcon size={15} />
          Add more photos
        </button>
        <input ref={addMoreRef} type="file" multiple accept={IMAGE_VIDEO_ACCEPT}
          className="fk-media-file-input" onChange={handleAddFiles} />
      </div>
    );
  }

  // ── Carousel (default when files exist) ──────────────────────────────────
  return (
    <div className="fk-media-carousel">
      <div className="fk-media-carousel-stage">
        {current?.url && current.kind === 'image' && (
          // Blurred, scaled-up copy of the same image behind the real one —
          // fills the letterboxed space around media whose aspect ratio
          // doesn't match the stage, instead of the flat surface color.
          <div className="fk-media-carousel-backdrop" style={{ backgroundImage: `url("${current.url}")` }} />
        )}
        {current?.url
          ? current.kind === 'video'
            ? <video src={current.url} className="fk-media-carousel-img" controls muted />
            : <img src={current.url} alt={current.name} className="fk-media-carousel-img" />
          : <div className="fk-media-carousel-placeholder">{current?.kind}</div>
        }

        <div className="fk-media-carousel-topbar">
          <div className="fk-media-carousel-topbar-left">
            <button type="button" className="fk-media-overlay-btn" onClick={() => fileInputRef.current?.click()}>
              <StackedImagesIcon size={16} /> Add
            </button>
            <button type="button" className="fk-media-overlay-btn" onClick={() => setView('gallery')}>
              <PencilIcon size={13} /> Edit all
            </button>
          </div>
          <button type="button" className="fk-media-overlay-btn fk-media-overlay-btn--icon" aria-label="Delete current"
            onClick={handleRemoveCurrent}>
            <TrashIcon size={16} />
          </button>
        </div>

        {safeCarouselIdx > 0 && (
          <button type="button" className="fk-media-arrow fk-media-arrow--left"
            onClick={() => setCarouselIdx(i => i - 1)}><ChevronLeftIcon /></button>
        )}
        {safeCarouselIdx < attachments.length - 1 && (
          <button type="button" className="fk-media-arrow fk-media-arrow--right"
            onClick={() => setCarouselIdx(i => i + 1)}><ChevronRightIcon /></button>
        )}
        {attachments.length > 1 && (
          <div className="fk-media-dots">
            {attachments.map((_, i) => (
              <button key={i} type="button"
                className={`fk-media-dot${i === safeCarouselIdx ? ' fk-media-dot--active' : ''}`}
                onClick={() => setCarouselIdx(i)} />
            ))}
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" multiple accept={IMAGE_VIDEO_ACCEPT}
        className="fk-media-file-input" onChange={handleAddFiles} />
    </div>
  );
}
