import { useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { editorExtensions } from './editor/extensions';
import { requestUploadUrl, putFile, confirmUpload } from '../../api/attachments';
import './rich-text-toolbar.css';
import './rich-text-editor.css';

const svgBase = {
  viewBox: '0 0 24 24',
  width: 18,
  height: 18,
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function LinkIcon() {
  return (
    <svg {...svgBase}>
      <path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1" />
      <path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg {...svgBase}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="2" />
      <path d="M4 17l5-4 4 3 3-2 4 3" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg {...svgBase}>
      <rect x="3.5" y="5.5" width="13" height="13" rx="2.5" />
      <path d="M16.5 10l4-2.5v9l-4-2.5" />
    </svg>
  );
}

function BulletListIcon() {
  return (
    <svg {...svgBase}>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </svg>
  );
}

function NumberedListIcon() {
  return (
    <svg {...svgBase}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6h1v3M4 12h2M4 18h2" />
    </svg>
  );
}

function SpoilerIcon() {
  return (
    <svg {...svgBase}>
      <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" />
    </svg>
  );
}

function CodeBlockIcon() {
  return (
    <svg {...svgBase}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M9.5 9l-2.5 3 2.5 3M14.5 9l2.5 3-2.5 3" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg {...svgBase}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M3.5 9h17M9 9v10.5" />
    </svg>
  );
}

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

function ToolbarButton({ label, active, onClick, style, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className={`fk-rte-btn${active ? ' fk-rte-btn--active' : ''}`}
      aria-label={label}
      aria-pressed={active}
      data-tooltip={label}
      style={style}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

type RichTextEditorProps = {
  content: string;
  onChange: (markdown: string) => void;
  forumId: string;
  sessionToken?: string | undefined;
};

async function uploadInline(forumId: string, sessionToken: string | undefined, file: File): Promise<string> {
  const upload = await requestUploadUrl(forumId, file.name, file.type, file.size, sessionToken);
  await putFile(upload.uploadUrl, upload.uploadHeaders, file);
  let width: number | null = null;
  let height: number | null = null;
  if (file.type.startsWith('image/')) {
    try {
      const bitmap = await createImageBitmap(file);
      width = bitmap.width;
      height = bitmap.height;
      bitmap.close();
    } catch {
      // dimensions are a display hint only — safe to skip if unsupported
    }
  }
  const attachment = await confirmUpload(forumId, upload.attachmentId, { width, height }, sessionToken);
  return attachment.downloadUrl;
}

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
      const url = await uploadInline(forumId, sessionToken, file);
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
