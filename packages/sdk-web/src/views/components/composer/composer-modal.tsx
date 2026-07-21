import type { ComposerTab } from '../../hooks/use-forum-state';
import type { useForum } from '../../hooks/use-forum-state';
import PillButton from '../shared/pill-button';
import { CloseIcon, SparkleIcon, PencilIcon } from '../shared/icons';
import RichTextToolbar from './rich-text-toolbar';
import MediaGallery from './media-gallery';
import './composer-modal.css';

const TABS: { id: ComposerTab; label: string }[] = [
  { id: 'text', label: 'Text' },
  { id: 'images', label: 'Images & Video' },
  { id: 'link', label: 'Link' },
];

type ComposerModalProps = {
  composer: ReturnType<typeof useForum>['state']['composer'];
  onClose: () => void;
  onSetTab: (tab: ComposerTab) => void;
  onSetField: (field: 'title' | 'tags' | 'body' | 'linkUrl', value: string) => void;
  onAddFiles: (files: FileList) => void;
  onRemoveFile: (id: number) => void;
  onUpdateMeta: (id: number, caption: string, attachmentUrl: string) => void;
  onSuggestMeta: () => void;
  onSubmit: () => void;
};

export default function ComposerModal({
  composer, onClose, onSetTab, onSetField,
  onAddFiles, onRemoveFile, onUpdateMeta, onSuggestMeta, onSubmit,
}: ComposerModalProps) {
  const hasTitle = composer.title.trim().length > 0;
  const canSaveDraft = hasTitle && composer.activeTab !== 'images';
  const canPost =
    hasTitle &&
    (composer.activeTab !== 'images' || composer.attachments.length > 0) &&
    (composer.activeTab !== 'link' || composer.linkUrl.trim().length > 0);

  return (
    <div className="fk-composer-modal">
      <div className="fk-composer-header">
        <h2 className="fk-composer-heading">Create post</h2>
        <div className="fk-composer-header-actions">
          <span className="fk-composer-drafts">Drafts</span>
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
          <RichTextToolbar />
          <textarea
            className="fk-composer-textarea"
            placeholder="Body text (optional)"
            value={composer.body}
            onChange={e => onSetField('body', e.target.value)}
          />
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
            className="fk-composer-title-input"
            placeholder=" "
            value={composer.linkUrl}
            onChange={e => onSetField('linkUrl', e.target.value)}
          />
          <label className="fk-composer-title-label" htmlFor="composer-link">
            Link URL <span className="fk-composer-required-mark">*</span>
          </label>
        </div>
      )}

      <div className="fk-composer-footer">
        <PillButton variant="surface" disabled={!canSaveDraft}>Save Draft</PillButton>
        <PillButton variant="accent" onClick={onSubmit} disabled={!canPost}>Post</PillButton>
      </div>
    </div>
  );
}
