import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { createEditorExtensions } from '../composer/editor/extensions';
import {
  ToolbarButton, LinkIcon, BulletListIcon, NumberedListIcon, SpoilerIcon, CodeBlockIcon, TableIcon,
  ImageIcon, VideoIcon, GifIcon,
} from '../composer/editor/toolbar-buttons';
import { uploadInline } from '../composer/editor/upload-inline';
import PillButton from '../shared/pill-button';
import '../composer/rich-text-toolbar.css';
import './comment-composer.css';

type CommentComposerProps = {
  forumId: string;
  sessionToken?: string | undefined;
  placeholder: string;
  submitLabel: string;
  onSubmit: (body: string, attachmentIds: string[]) => Promise<void>;
  onCancel?: (() => void) | undefined;
  autoFocus?: boolean | undefined;
  // Top-level composer only: lets "Suggest reply" fill the box the same
  // way it always has, without turning this into a fully controlled
  // editor (which would fight the user's own typing on every keystroke).
  // Only applied while the editor is still empty.
  syncedValue?: string | undefined;
};

/**
 * Shared by the top-level "Join the conversation" box and every nested
 * "Reply to X" box: a pill-shaped TipTap-backed composer with image/video/
 * GIF/formatting-toggle buttons, matching the post composer's Text tab
 * (same extensions, same inline-upload sequence) but collapsed into a
 * compact pill until the "Aa" button reveals the formatting row.
 */
export default function CommentComposer({
  forumId, sessionToken, placeholder, submitLabel, onSubmit, onCancel, autoFocus, syncedValue,
}: CommentComposerProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const attachmentIdsRef = useRef<string[]>([]);

  const [formattingOpen, setFormattingOpen] = useState(false);
  const [gifPanelOpen, setGifPanelOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: createEditorExtensions(placeholder),
    content: '',
    shouldRerenderOnTransaction: true,
    autofocus: autoFocus ? 'end' : false,
  });

  useEffect(() => {
    if (!editor || !syncedValue || !editor.isEmpty) return;
    editor.commands.setContent(syncedValue);
  }, [editor, syncedValue]);

  if (!editor) return null;

  function run(fn: (editor: Editor) => void) {
    if (editor) fn(editor);
  }

  async function handleFileSelected(kind: 'image' | 'video', file: File | undefined) {
    if (!file) return;
    try {
      const { url, attachmentId } = await uploadInline(forumId, sessionToken, file);
      attachmentIdsRef.current.push(attachmentId);
      if (kind === 'image') run(e => e.chain().focus().setImage({ src: url }).run());
      else run(e => e.chain().focus().setVideo({ src: url }).run());
    } catch {
      setError('Upload failed. Please try again.');
    }
  }

  async function handleSubmit() {
    if (!editor || editor.isEmpty || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = (editor.storage as unknown as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown();
      await onSubmit(body, attachmentIdsRef.current);
      editor.commands.clearContent();
      attachmentIdsRef.current = [];
      setFormattingOpen(false);
      setGifPanelOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to post ${submitLabel.toLowerCase()}`);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    editor?.commands.clearContent();
    attachmentIdsRef.current = [];
    setFormattingOpen(false);
    setGifPanelOpen(false);
    setError(null);
    onCancel?.();
  }

  return (
    <div className="fk-comment-composer">
      {formattingOpen && (
        <div className="fk-rte-toolbar fk-comment-composer-toolbar">
          <ToolbarButton label="Bold" active={editor.isActive('bold')} style={{ fontWeight: 800, fontSize: 15 }}
            onClick={() => run(e => e.chain().focus().toggleBold().run())}>B</ToolbarButton>
          <ToolbarButton label="Italic" active={editor.isActive('italic')} style={{ fontStyle: 'italic', fontSize: 15 }}
            onClick={() => run(e => e.chain().focus().toggleItalic().run())}>i</ToolbarButton>
          <ToolbarButton label="Strikethrough" active={editor.isActive('strike')} style={{ textDecoration: 'line-through', fontSize: 15 }}
            onClick={() => run(e => e.chain().focus().toggleStrike().run())}>S</ToolbarButton>
          <ToolbarButton label="Superscript" active={editor.isActive('superscript')} style={{ fontSize: 14 }}
            onClick={() => run(e => e.chain().focus().toggleSuperscript().run())}>x²</ToolbarButton>

          <span className="fk-rte-divider" />

          <ToolbarButton label="Link" active={editor.isActive('link')} onClick={() => {
            const previousUrl = editor.getAttributes('link').href as string | undefined;
            const url = window.prompt('Link URL', previousUrl ?? 'https://');
            if (url === null) return;
            if (url === '') { run(e => e.chain().focus().extendMarkRange('link').unsetLink().run()); return; }
            run(e => e.chain().focus().extendMarkRange('link').setLink({ href: url }).run());
          }}><LinkIcon /></ToolbarButton>
          <ToolbarButton label="Bullet list" active={editor.isActive('bulletList')}
            onClick={() => run(e => e.chain().focus().toggleBulletList().run())}><BulletListIcon /></ToolbarButton>
          <ToolbarButton label="Numbered list" active={editor.isActive('orderedList')}
            onClick={() => run(e => e.chain().focus().toggleOrderedList().run())}><NumberedListIcon /></ToolbarButton>

          <span className="fk-rte-divider" />

          <ToolbarButton label="Quote" active={editor.isActive('blockquote')} style={{ fontWeight: 800, fontSize: 14 }}
            onClick={() => run(e => e.chain().focus().toggleBlockquote().run())}>&quot;</ToolbarButton>
          <ToolbarButton label="Spoiler" active={editor.isActive('spoiler')}
            onClick={() => run(e => e.chain().focus().toggleSpoiler().run())}><SpoilerIcon /></ToolbarButton>
          <ToolbarButton label="Inline code" active={editor.isActive('code')} style={{ fontFamily: 'monospace', fontSize: 13 }}
            onClick={() => run(e => e.chain().focus().toggleCode().run())}>&lt;/&gt;</ToolbarButton>
          <ToolbarButton label="Code block" active={editor.isActive('codeBlock')}
            onClick={() => run(e => e.chain().focus().toggleCodeBlock().run())}><CodeBlockIcon /></ToolbarButton>
          <ToolbarButton label="Table" active={editor.isActive('table')}
            onClick={() => run(e => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}><TableIcon /></ToolbarButton>
        </div>
      )}

      <EditorContent editor={editor} className="fk-comment-composer-content" />

      {gifPanelOpen && (
        <div className="fk-comment-composer-gif-panel">
          <input className="fk-comment-composer-gif-input" placeholder="Search GIFs…" disabled />
          <p className="fk-comment-composer-gif-note">GIF search coming soon</p>
        </div>
      )}

      {error && <p className="fk-comment-error">{error}</p>}

      <div className="fk-comment-composer-row">
        <div className="fk-comment-composer-icons">
          <ToolbarButton label="Image" onClick={() => imageInputRef.current?.click()}><ImageIcon /></ToolbarButton>
          <ToolbarButton label="Video" onClick={() => videoInputRef.current?.click()}><VideoIcon /></ToolbarButton>
          <ToolbarButton label="GIF" active={gifPanelOpen} onClick={() => setGifPanelOpen(o => !o)}><GifIcon /></ToolbarButton>
          <ToolbarButton label="Show formatting options" active={formattingOpen} style={{ fontWeight: 700, fontSize: 13 }}
            onClick={() => setFormattingOpen(o => !o)}>Aa</ToolbarButton>
        </div>
        <div className="fk-comment-composer-actions">
          {onCancel && (
            <PillButton variant="surface" onClick={handleCancel} disabled={submitting}>Cancel</PillButton>
          )}
          <PillButton variant="accent" onClick={() => void handleSubmit()} disabled={editor.isEmpty || submitting}>
            {submitting ? 'Posting…' : submitLabel}
          </PillButton>
        </div>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { void handleFileSelected('image', e.target.files?.[0]); e.target.value = ''; }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={e => { void handleFileSelected('video', e.target.files?.[0]); e.target.value = ''; }}
      />
    </div>
  );
}
