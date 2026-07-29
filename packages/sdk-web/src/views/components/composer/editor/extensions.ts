import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import Superscript from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Markdown } from 'tiptap-markdown';
import { Video } from './video-extension';
import { Spoiler } from './spoiler-mark';

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
  Markdown.configure({
    html: false,
    tightLists: true,
    bulletListMarker: '-',
    linkify: false,
    breaks: false,
  }),
];
