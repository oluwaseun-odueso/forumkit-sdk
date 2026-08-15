import { Suspense, lazy } from 'react';
import type { ComposerTab } from '../../hooks/use-forum-state';
import type { useForum } from '../../hooks/use-forum-state';
import PillButton from '../shared/pill-button';
import { CloseIcon, SparkleIcon, PencilIcon } from '../shared/icons';
import MediaGallery from './media-gallery';
import './composer-modal.css';

const RichTextEditor = lazy(() => import('./rich-text-editor'));

const TABS: { id: ComposerTab; label: string }[] = [
  { id: 'text', label: 'Text' },
  { id: 'images', label: 'Images & Video' },
  { id: 'link', label: 'Link' },
];

type ComposerModalProps = {
  composer: ReturnType<typeof useForum>['state']['composer'];
  forumId: string;
  sessionToken: string | undefined;
  onClose: () => void;
  onSetTab: (tab: ComposerTab) => void;
  onSetField: (field: 'title' | 'tags' | 'body' | 'linkUrl', value: string) => void;
  onAddFiles: (files: FileList) => void;
  onRemoveFile: (id: number) => void;
  onUpdateMeta: (id: number, caption: string, attachmentUrl: string) => void;
  onInlineUpload: (attachmentId: string) => void;
  onSuggestMeta: () => void;
  onSubmit: () => void;
  onSaveDraft: () => void;
  onOpenDraftsList: () => void;
};

export default function ComposerModal({
  composer, forumId, sessionToken, onClose, onSetTab, onSetField,
  onAddFiles, onRemoveFile, onUpdateMeta, onInlineUpload, onSuggestMeta, onSubmit, onSaveDraft, onOpenDraftsList,
}: ComposerModalProps) {
  const hasTitle = composer.title.trim().length > 0;
  const hasUploadsInFlight = composer.attachments.some(a => a.uploadStatus === 'uploading');
  // Mirrors the backend's actual draft requirement (title + body both
  // non-empty, matching thread creation) — not tab-specific, since body is a
  // single field that persists across tab switches.
  const canSaveDraft = hasTitle && composer.body.trim().length > 0 && !composer.savingDraft;
  const canPost =
    hasTitle &&
    !composer.submitting &&
    !hasUploadsInFlight &&
    (composer.activeTab !== 'images' || composer.attachments.length > 0) &&
    (composer.activeTab !== 'link' || composer.linkUrl.trim().length > 0);

  return (
    <div className="fk-composer-modal">
      <div className="fk-composer-header">
        <h2 className="fk-composer-heading">Create post</h2>
        <div className="fk-composer-header-actions">
          <button type="button" className="fk-composer-drafts" onClick={onOpenDraftsList}>Drafts</button>
          <button type="button" className="fk-composer-close" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="fk-composer-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`fk-composer-tab${composer.activeTab === tab.id ? ' fk-composer-tab--active' : ''}`}
            onClick={() => onSetTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="fk-composer-title-wrap">
        <input
          id="composer-title"
          className="fk-composer-title-input"
          placeholder=" "
          value={composer.title}
          onChange={e => onSetField('title', e.target.value)}
          maxLength={300}
        />
        <label className="fk-composer-title-label" htmlFor="composer-title">
          Title <span className="fk-composer-required-mark">*</span>
        </label>
      </div>
      <div className="fk-composer-title-row">
        <button type="button" className="fk-composer-suggest" onClick={onSuggestMeta} disabled={composer.genTitle || composer.genTags}>
          <SparkleIcon size={14} />
          {composer.genTitle || composer.genTags ? 'Suggesting…' : 'Suggest title & tags'}
        </button>
        <span className="fk-composer-counter">{composer.title.length}/300</span>
      </div>

      <div className="fk-composer-tags-wrap">
        <PencilIcon size={12} />
        <input
          className="fk-composer-tags"
          placeholder="Add tags, comma separated"
          value={composer.tags}
          onChange={e => onSetField('tags', e.target.value)}
        />
      </div>

      {composer.activeTab === 'text' && (
        <div className="fk-composer-textbox">
          <Suspense fallback={<div className="fk-rte-loading">Loading editor…</div>}>
            <RichTextEditor
              content={composer.body}
              onChange={body => onSetField('body', body)}
              forumId={forumId}
              sessionToken={sessionToken}
              onInlineUpload={onInlineUpload}
            />
          </Suspense>
        </div>
      )}

      {composer.activeTab === 'images' && (
        <MediaGallery
          attachments={composer.attachments}
          onAddFiles={onAddFiles}
          onRemoveFile={onRemoveFile}
          onUpdateMeta={onUpdateMeta}
        />
      )}

      {composer.activeTab === 'link' && (
        <div className="fk-composer-title-wrap">
          <input
            id="composer-link"
            className="fk-composer-title-input fk-composer-title-input--light"
            placeholder=" "
            value={composer.linkUrl}
            onChange={e => onSetField('linkUrl', e.target.value)}
          />
          <label className="fk-composer-title-label" htmlFor="composer-link">
            Link URL <span className="fk-composer-required-mark">*</span>
          </label>
        </div>
      )}

      {composer.error && <p className="fk-composer-error">{composer.error}</p>}

      <div className="fk-composer-footer">
        <PillButton variant="surface" onClick={onSaveDraft} disabled={!canSaveDraft}>
          {composer.savingDraft ? 'Saving…' : 'Save Draft'}
        </PillButton>
        <PillButton variant="accent" onClick={onSubmit} disabled={!canPost}>
          {composer.submitting ? 'Posting…' : hasUploadsInFlight ? 'Uploading…' : 'Post'}
        </PillButton>
      </div>
    </div>
  );
}
