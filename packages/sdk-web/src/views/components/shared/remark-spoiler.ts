import { visit } from 'unist-util-visit';
import type { Root, Text, Parent } from 'mdast';

const SPOILER_RE = /\|\|([^|]+)\|\|/g;

/**
 * Splits `||text||` runs out of plain text mdast nodes into a `span.fk-spoiler`
 * hast node (via data.hName/hProperties), so react-markdown's `span` component
 * override can render it as a click-to-reveal element. Mirrors the `||text||`
 * convention used by the TipTap Spoiler mark (composer/editor/spoiler-mark.ts).
 */
export function remarkSpoiler() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent: Parent | undefined) => {
      if (!parent || index === undefined || index === null) return;
      const value = node.value;
      if (!SPOILER_RE.test(value)) return;
      SPOILER_RE.lastIndex = 0;

      const replacement: Array<Text | (Parent & { data: { hName: string; hProperties: Record<string, string> } })> = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = SPOILER_RE.exec(value))) {
        if (match.index > lastIndex) {
          replacement.push({ type: 'text', value: value.slice(lastIndex, match.index) });
        }
        replacement.push({
          type: 'spoiler',
          data: { hName: 'span', hProperties: { className: 'fk-spoiler' } },
          children: [{ type: 'text', value: match[1] ?? '' }],
        } as unknown as Parent & { data: { hName: string; hProperties: Record<string, string> } });
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < value.length) {
        replacement.push({ type: 'text', value: value.slice(lastIndex) });
      }

      parent.children.splice(index, 1, ...(replacement as typeof parent.children));
    });
  };
}
