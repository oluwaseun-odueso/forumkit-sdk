import { useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { editorExtensions } from './editor/extensions';
import {
  ToolbarButton, LinkIcon, ImageIcon, VideoIcon, BulletListIcon, NumberedListIcon, SpoilerIcon, CodeBlockIcon, TableIcon,
} from './editor/toolbar-buttons';
import { uploadInline } from './editor/upload-inline';
import { IMAGE_ACCEPT } from '../../lib/accepted-media-types';
import './rich-text-toolbar.css';
import './rich-text-editor.css';

type RichTextEditorProps = {
  content: string;
  onChange: (markdown: string) => void;
  forumId: string;
  sessionToken?: string | undefined;
};

export default function RichTextEditor({ content, onChange, forumId, sessionToken }: RichTextEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: editorExtensions,
    content,
    // Re-renders on every selection/transaction change so toolbar buttons can
    // reflect the format active at the cursor (Tiptap v3 defaults this off).
    shouldRerenderOnTransaction: true,
    onUpdate({ editor }) {
      onChange((editor.storage as unknown as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown());
    },
  });

  if (!editor) return null;

  function run(fn: (editor: Editor) => void) {
    if (editor) fn(editor);
  }

  function handleSetLink() {
    const previousUrl = editor?.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', previousUrl ?? 'https://');
    if (url === null) return;
    if (url === '') {
      run(e => e.chain().focus().extendMarkRange('link').unsetLink().run());
      return;
    }
    run(e => e.chain().focus().extendMarkRange('link').setLink({ href: url }).run());
  }

  async function handleFileSelected(kind: 'image' | 'video', file: File | undefined) {
    if (!file) return;
    try {
      const { url } = await uploadInline(forumId, sessionToken, file);
      if (kind === 'image') {
        run(e => e.chain().focus().setImage({ src: url }).run());
      } else {
        run(e => e.chain().focus().setVideo({ src: url }).run());
      }
    } catch {
      window.alert('Upload failed. Please try again.');
    }
  }

  return (
    <div className="fk-rte">
      <div className="fk-rte-toolbar">
        <ToolbarButton label="Bold" active={editor.isActive('bold')} style={{ fontWeight: 800, fontSize: 15 }}
          onClick={() => run(e => e.chain().focus().toggleBold().run())}>B</ToolbarButton>
        <ToolbarButton label="Italic" active={editor.isActive('italic')} style={{ fontStyle: 'italic', fontSize: 15 }}
          onClick={() => run(e => e.chain().focus().toggleItalic().run())}>i</ToolbarButton>
        <ToolbarButton label="Strikethrough" active={editor.isActive('strike')} style={{ textDecoration: 'line-through', fontSize: 15 }}
          onClick={() => run(e => e.chain().focus().toggleStrike().run())}>S</ToolbarButton>
        <ToolbarButton label="Superscript" active={editor.isActive('superscript')} style={{ fontSize: 14 }}
          onClick={() => run(e => e.chain().focus().toggleSuperscript().run())}>x²</ToolbarButton>
        <ToolbarButton label="Heading" active={editor.isActive('heading', { level: 2 })} style={{ fontSize: 16, fontWeight: 700 }}
          onClick={() => run(e => e.chain().focus().toggleHeading({ level: 2 }).run())}>T</ToolbarButton>

        <span className="fk-rte-divider" />

        <ToolbarButton label="Link" active={editor.isActive('link')} onClick={handleSetLink}><LinkIcon /></ToolbarButton>
        <ToolbarButton label="Image" onClick={() => imageInputRef.current?.click()}><ImageIcon /></ToolbarButton>
        <ToolbarButton label="Video" onClick={() => videoInputRef.current?.click()}><VideoIcon /></ToolbarButton>
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

        <div className="fk-rte-spacer" />
      </div>

      <EditorContent editor={editor} className="fk-rte-content" />

      <input
        ref={imageInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
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
