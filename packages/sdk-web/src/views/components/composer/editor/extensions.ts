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

export const editorExtensions = [
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
  Placeholder.configure({
    placeholder: 'What are your thoughts?',
  }),
  Markdown.configure({
    html: false,
    tightLists: true,
    bulletListMarker: '-',
    linkify: false,
    breaks: false,
  }),
];
