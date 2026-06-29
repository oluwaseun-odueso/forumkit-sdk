import { useRef } from 'react';
import type { AttachmentFile } from '../hooks/useForumState';
import { chromeButton } from '../styles/tokens';

type ComposeState = {
  open: boolean;
  title: string;
  tags: string;
  body: string;
  attachments: AttachmentFile[];
  genTitle: boolean;
  genTags: boolean;
};

type Props = {
  compose: ComposeState;
  onClose: () => void;
  onSetField: (field: 'title' | 'tags' | 'body', value: string) => void;
  onAddFiles: (files: FileList) => void;
  onRemoveFile: (id: number) => void;
  onSubmit: () => void;
};

const SAMPLE_TITLES = [
  "What's the ideal length for onboarding copy?",
  'How do you balance tone consistency with personality?',
  'Should errors be apologetic or matter-of-fact?',
];

const SAMPLE_TAGS = 'writing, voice, ux-copy';

export function ComposeSheet({ compose, onClose, onSetField, onAddFiles, onRemoveFile, onSubmit }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!compose.open) return null;

  const canSubmit = compose.title.trim().length > 0;

  function handleGenTitle() {
    const t = SAMPLE_TITLES[Math.floor(Math.random() * SAMPLE_TITLES.length)];
    if (t !== undefined) onSetField('title', t);
  }

  function handleGenTags() {
    onSetField('tags', SAMPLE_TAGS);
  }

  return (
    <>
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close compose"
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0, zIndex: 11,
          background: 'var(--t71, rgba(7,9,15,.55))',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          border: 'none', cursor: 'pointer',
        }}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New post"
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          zIndex: 12, maxHeight: '90%', overflowY: 'auto',
          borderRadius: '22px 22px 0 0',
          padding: '28px 24px 32px',
          background: 'linear-gradient(180deg, var(--t47, rgba(18,25,42,.98)), var(--t75, rgba(9,13,23,.98)))',
          backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
          borderTop: '1px solid rgba(108,170,245,.18)',
          boxShadow: '0 -30px 80px -20px rgba(0,0,0,.85)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
          <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 17, fontWeight: 600, color: 'var(--t30, #e9eff8)' }}>
            New Thread
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--t23, #acb7cc)', fontSize: 14,
              background: 'var(--t59, rgba(218,229,247,.06))',
              border: '1px solid var(--t66, rgba(218,229,247,.14))',
            }}
          >
            ✕
          </button>
        </div>

        {/* Title field */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <label htmlFor="compose-title" style={{ fontFamily: 'Sora,sans-serif', fontSize: 11, letterSpacing: '1.2px', color: 'var(--t12, #5b6376)' }}>
              TITLE
            </label>
            <button
              type="button"
              aria-label="Generate title with AI"
              onClick={handleGenTitle}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 18, cursor: 'pointer',
                fontFamily: 'Sora,sans-serif', fontSize: 11,
                color: 'var(--t23, #acb7cc)',
                background: 'var(--t57, rgba(218,229,247,.04))',
                border: '1px solid rgba(108,170,245,.22)',
              }}
            >
              ✦ Suggest title
            </button>
          </div>
          <input
            id="compose-title"
            type="text"
            value={compose.title}
            onChange={e => onSetField('title', e.target.value)}
            placeholder="What's your question or topic?"
            style={{
              width: '100%', padding: '11px 14px', borderRadius: 12,
              background: 'var(--t58, rgba(218,229,247,.05))',
              border: '1px solid var(--t65, rgba(218,229,247,.13))',
              color: 'var(--t30, #e9eff8)', fontFamily: 'Sora,sans-serif', fontSize: 14.5,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Tags field */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <label htmlFor="compose-tags" style={{ fontFamily: 'Sora,sans-serif', fontSize: 11, letterSpacing: '1.2px', color: 'var(--t12, #5b6376)' }}>
              TAGS
            </label>
            <button
              type="button"
              aria-label="Generate tags with AI"
              onClick={handleGenTags}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 18, cursor: 'pointer',
                fontFamily: 'Sora,sans-serif', fontSize: 11,
                color: 'var(--t23, #acb7cc)',
                background: 'var(--t57, rgba(218,229,247,.04))',
                border: '1px solid rgba(108,170,245,.22)',
              }}
            >
              ✦ Suggest tags
            </button>
          </div>
          <input
            id="compose-tags"
            type="text"
            value={compose.tags}
            onChange={e => onSetField('tags', e.target.value)}
            placeholder="writing, voice, ux-copy (comma-separated)"
            style={{
              width: '100%', padding: '11px 14px', borderRadius: 12,
              background: 'var(--t58, rgba(218,229,247,.05))',
              border: '1px solid var(--t65, rgba(218,229,247,.13))',
              color: 'var(--t30, #e9eff8)', fontFamily: 'Sora,sans-serif', fontSize: 14.5,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Body field */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="compose-body" style={{ fontFamily: 'Sora,sans-serif', fontSize: 11, letterSpacing: '1.2px', color: 'var(--t12, #5b6376)', display: 'block', marginBottom: 7 }}>
            DESCRIPTION
          </label>
          <textarea
            id="compose-body"
            value={compose.body}
            onChange={e => onSetField('body', e.target.value)}
            rows={4}
            placeholder="Provide context and details…"
            style={{
              width: '100%', padding: '11px 14px', borderRadius: 12, resize: 'vertical',
              background: 'var(--t58, rgba(218,229,247,.05))',
              border: '1px solid var(--t65, rgba(218,229,247,.13))',
              color: 'var(--t30, #e9eff8)', fontFamily: 'Sora,sans-serif', fontSize: 14.5,
              outline: 'none', boxSizing: 'border-box',
              lineHeight: 1.55,
            }}
          />
        </div>

        {/* Attachments */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 11, letterSpacing: '1.2px', color: 'var(--t12, #5b6376)' }}>
              ATTACHMENTS
            </span>
            <button
              type="button"
              aria-label="Add file"
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 18, cursor: 'pointer',
                fontFamily: 'Sora,sans-serif', fontSize: 12,
                color: 'var(--t23, #acb7cc)',
                background: 'var(--t57, rgba(218,229,247,.04))',
                border: '1px solid var(--t65, rgba(218,229,247,.13))',
              }}
            >
              + Add file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,application/pdf"
              aria-label="File upload"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files) { onAddFiles(e.target.files); e.target.value = ''; } }}
            />
          </div>

          {compose.attachments.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))',
              gap: 8,
            }}>
              {compose.attachments.map(att => (
                <div
                  key={att.id}
                  style={{
                    position: 'relative', borderRadius: 12, overflow: 'hidden',
                    aspectRatio: '1', background: 'var(--t58, rgba(218,229,247,.05))',
                    border: '1px solid var(--t64, rgba(218,229,247,.12))',
                  }}
                >
                  {att.url && att.kind === 'image' ? (
                    <img
                      src={att.url}
                      alt={att.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}>
                      <span style={{ fontSize: 22, opacity: .55 }}>
                        {att.kind === 'video' ? '▶' : '📄'}
                      </span>
                      <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 10, color: 'var(--t17, #8590a5)', textAlign: 'center', padding: '0 6px', wordBreak: 'break-all' }}>
                        {att.name}
                      </span>
                      <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 9.5, color: 'var(--t12, #5b6376)' }}>
                        {att.sizeLabel}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label={`Remove ${att.name}`}
                    onClick={() => onRemoveFile(att.id)}
                    style={{
                      position: 'absolute', top: 5, right: 5,
                      width: 22, height: 22, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, cursor: 'pointer',
                      color: 'var(--t30, #e9eff8)',
                      background: 'rgba(7,9,15,.75)',
                      border: '1px solid rgba(218,229,247,.25)',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 42, padding: '0 20px', borderRadius: 13, cursor: 'pointer',
              fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 500,
              color: 'var(--t23, #acb7cc)',
              background: 'var(--t58, rgba(218,229,247,.05))',
              border: '1px solid var(--t65, rgba(218,229,247,.13))',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            aria-disabled={!canSubmit}
            onClick={canSubmit ? onSubmit : undefined}
            style={{
              ...chromeButton,
              height: 42, padding: '0 26px', borderRadius: 13, cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 500,
              border: 'none',
              opacity: canSubmit ? 1 : 0.45,
            }}
          >
            Post Thread
          </button>
        </div>
      </div>
    </>
  );
}
