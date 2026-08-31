import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Markdown } from 'tiptap-markdown';
import { Video } from './video-extension';
import { Spoiler } from './spoiler-mark';
import { Superscript } from './superscript-extension';

// A factory (not a static array) so callers with a different empty-state
// message — the comment composer's "Join the conversation" vs. the post
// composer's "What are your thoughts?" — can share every other extension
// without forking the whole list.
export function createEditorExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      heading: { levels: [2] },
    }),
    Link.configure({ openOnClick: false }),
    ImageExtension,
    Superscript,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Video,
    Spoiler,
    // Renders via a ::before on the empty paragraph (see .is-editor-empty in
    // rich-text-editor.css) — TipTap has no native `placeholder` attribute
    // like a plain <textarea>, so this extension is what the body field
    // needs to show its explainer text when empty.
    Placeholder.configure({ placeholder }),
    Markdown.configure({
      html: false,
      tightLists: true,
      bulletListMarker: '-',
      linkify: false,
      breaks: false,
    }),
  ];
}

export const editorExtensions = createEditorExtensions('What are your thoughts?');
