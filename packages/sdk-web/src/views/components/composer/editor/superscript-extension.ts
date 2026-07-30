import TiptapSuperscript from '@tiptap/extension-superscript';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import markdownItSup from 'markdown-it-sup';

/**
 * @tiptap/extension-superscript has no built-in markdown serialize spec (it's
 * not part of tiptap-markdown's bundled extension list), so without this the
 * Markdown serializer throws whenever a superscript mark is present in the
 * document. Round-trips through Pandoc-style `^text^`, parsed via the
 * standard markdown-it-sup plugin.
 */
export const Superscript = TiptapSuperscript.extend({
  addStorage() {
    return {
      markdown: {
        serialize: { open: '^', close: '^', expelEnclosingWhitespace: true },
        parse: {
          setup(md: { use: (plugin: (md: unknown) => void) => void }) {
            md.use(markdownItSup as (md: unknown) => void);
          },
        },
      },
    };
  },
});
