import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    spoiler: {
      toggleSpoiler: () => ReturnType;
    };
  }
}

const SPOILER_CLASS = 'fk-spoiler-md';

// Adapted from markdown-it's own `~~strike~~` inline rule (markdown-it/lib/rules_inline/strikethrough.mjs),
// swapping the `~` delimiter for `|` so `||text||` round-trips through the same
// delimiter-run machinery markdown-it already uses for bold/italic/strikethrough.
type MdState = {
  pos: number;
  src: string;
  push: (type: string, tag: string, nesting: number) => { content: string };
  scanDelims: (pos: number, canSplitWord: boolean) => { length: number; can_open: boolean; can_close: boolean };
  delimiters: Array<{ marker: number; length: number; token: number; end: number; open: boolean; close: boolean }>;
  tokens: Array<{ type: string; tag: string; nesting: number; markup: string; content: string }>;
};

function spoilerTokenize(state: MdState, silent: boolean): boolean {
  const start = state.pos;
  const marker = state.src.charCodeAt(start);
  if (silent || marker !== 0x7c /* | */) return false;

  const scanned = state.scanDelims(state.pos, true);
  let len = scanned.length;
  if (len < 2) return false;

  if (len % 2) {
    const token = state.push('text', '', 0);
    token.content = '|';
    len--;
  }

  for (let i = 0; i < len; i += 2) {
    const token = state.push('text', '', 0);
    token.content = '||';
    state.delimiters.push({
      marker,
      length: 0,
      token: state.tokens.length - 1,
      end: -1,
      open: scanned.can_open,
      close: scanned.can_close,
    });
  }
  state.pos += scanned.length;
  return true;
}

function postProcess(state: MdState, delimiters: MdState['delimiters']): void {
  for (let i = 0; i < delimiters.length; i++) {
    const startDelim = delimiters[i];
    if (!startDelim || startDelim.marker !== 0x7c || startDelim.end === -1) continue;
    const endDelim = delimiters[startDelim.end];
    if (!endDelim) continue;

    const openToken = state.tokens[startDelim.token];
    if (openToken) Object.assign(openToken, { type: 'spoiler_open', tag: 'span', nesting: 1, markup: '||', content: '' });

    const closeToken = state.tokens[endDelim.token];
    if (closeToken) Object.assign(closeToken, { type: 'spoiler_close', tag: 'span', nesting: -1, markup: '||', content: '' });
  }
}

function spoilerPostProcess(state: { tokens_meta: Array<{ delimiters: MdState['delimiters'] } | null>; delimiters: MdState['delimiters'] } & MdState): void {
  postProcess(state, state.delimiters);
  for (const meta of state.tokens_meta) {
    if (meta?.delimiters) postProcess(state, meta.delimiters);
  }
}

/**
 * Stored as `||text||` (Discord/Reddit convention) — chosen for broad
 * recognition and zero syntax collision with CommonMark/GFM.
 */
export const Spoiler = Mark.create({
  name: 'spoiler',

  parseHTML() {
    return [{ tag: `span.${SPOILER_CLASS}` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: SPOILER_CLASS }), 0];
  },

  addCommands() {
    return {
      toggleSpoiler:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize: { open: '||', close: '||', expelEnclosingWhitespace: true },
        parse: {
          setup(md: {
            inline: { ruler: { before: (...a: unknown[]) => void }; ruler2: { before: (...a: unknown[]) => void } };
            renderer: { rules: Record<string, () => string> };
          }) {
            md.inline.ruler.before('emphasis', 'spoiler', spoilerTokenize);
            md.inline.ruler2.before('emphasis', 'spoiler', spoilerPostProcess);
            md.renderer.rules.spoiler_open = () => `<span class="${SPOILER_CLASS}">`;
            md.renderer.rules.spoiler_close = () => '</span>';
          },
        },
      },
    };
  },
});
