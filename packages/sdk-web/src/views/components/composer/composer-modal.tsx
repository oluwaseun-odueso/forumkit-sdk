import { useRef, useState } from 'react';
import type { ComposerTab, Community } from '../../hooks/use-forum-state';
import type { useForum } from '../../hooks/use-forum-state';
import DropdownMenu, { DropdownMenuItem } from '../shared/dropdown-menu';
import PillButton from '../shared/pill-button';
import { CloseIcon, ChevronDownIcon, SparkleIcon, UploadIcon } from '../shared/icons';
import RichTextToolbar from './rich-text-toolbar';
import AttachmentList from './attachment-list';
import './composer-modal.css';

const TABS: { id: ComposerTab; label: string }[] = [
  { id: 'text', label: 'Text' },
  { id: 'images', label: 'Images & Video' },
  { id: 'link', label: 'Link' },
];

type ComposerModalProps = {
  composer: ReturnType<typeof useForum>['state']['composer'];
  communities: Community[];
  onClose: () => void;
  onSetTab: (tab: ComposerTab) => void;
  onSetField: (field: 'title' | 'tags' | 'body' | 'linkUrl', value: string) => void;
  onSetCommunity: (communityId: string) => void;
  onAddFiles: (files: FileList) => void;
  onRemoveFile: (id: number) => void;
  onSuggestMeta: () => void;
  onSubmit: () => void;
};

export default function ComposerModal({
  composer, communities, onClose, onSetTab, onSetField, onSetCommunity,
  onAddFiles, onRemoveFile, onSuggestMeta, onSubmit,
}: ComposerModalProps) {
  const [communityMenuOpen, setCommunityMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedCommunity = communities.find(c => c.id === composer.communityId);

  if (!composer.open) return null;

  return (
    <div className="fk-composer-backdrop" onClick={onClose}>
      <div className="fk-composer-modal" onClick={e => e.stopPropagation()}>
        <div className="fk-composer-header">
          <h2 className="fk-composer-heading">Create post</h2>
          <div className="fk-composer-header-actions">
            <span className="fk-composer-drafts">Drafts</span>
            <button type="button" className="fk-composer-close" aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="fk-composer-community-anchor">
          <button type="button" className="fk-composer-community-btn" onClick={() => setCommunityMenuOpen(o => !o)}>
            {selectedCommunity?.name ?? 'Select Community'}
            <ChevronDownIcon size={17} />
          </button>
          <DropdownMenu open={communityMenuOpen} onClose={() => setCommunityMenuOpen(false)} style={{ top: 46, left: 0, width: 220 }}>
            {communities.map(c => (
              <DropdownMenuItem
                key={c.id}
                label={c.name}
                active={c.id === composer.communityId}
                onClick={() => { onSetCommunity(c.id); setCommunityMenuOpen(false); }}
              />
            ))}
          </DropdownMenu>
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
            className="fk-composer-title-input"
            placeholder="Title"
            value={composer.title}
            onChange={e => onSetField('title', e.target.value)}
            maxLength={300}
          />
          <span className="fk-composer-required">*</span>
        </div>
        <div className="fk-composer-title-row">
          <button type="button" className="fk-composer-suggest" onClick={onSuggestMeta} disabled={composer.genTitle || composer.genTags}>
            <SparkleIcon size={14} />
            {composer.genTitle || composer.genTags ? 'Suggesting…' : 'Suggest title & tags'}
          </button>
          <span className="fk-composer-counter">{composer.title.length}/300</span>
        </div>

        <input
          className="fk-composer-tags"
          placeholder="Add tags"
          value={composer.tags}
          onChange={e => onSetField('tags', e.target.value)}
        />

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
          <div className="fk-composer-dropzone" onClick={() => fileInputRef.current?.click()}>
            Drag and Drop or upload media
            <span className="fk-composer-upload-btn">
              <UploadIcon />
            </span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="fk-composer-file-input"
              onChange={e => { if (e.target.files) onAddFiles(e.target.files); e.target.value = ''; }}
            />
            <AttachmentList attachments={composer.attachments} onRemove={onRemoveFile} />
          </div>
        )}

        {composer.activeTab === 'link' && (
          <div className="fk-composer-title-wrap">
            <input
              className="fk-composer-title-input"
              placeholder="Link URL"
              value={composer.linkUrl}
              onChange={e => onSetField('linkUrl', e.target.value)}
            />
            <span className="fk-composer-required" style={{ left: 92 }}>*</span>
          </div>
        )}

        <div className="fk-composer-footer">
          <PillButton variant="surface">Save Draft</PillButton>
          <PillButton variant="accent" onClick={onSubmit}>Post</PillButton>
        </div>
      </div>
    </div>
  );
}
