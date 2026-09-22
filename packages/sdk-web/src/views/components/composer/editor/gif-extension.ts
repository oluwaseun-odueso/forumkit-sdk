import { Node, mergeAttributes } from '@tiptap/core';
import { buildGiphyPlaceholder, resolveGiphyUrl, parseGiphyId, parseGiphyDimensions } from '@forumkit/shared';

export type GifOptions = {
  HTMLAttributes: Record<string, unknown>;
};

type GifAttrs = { id: string; width: number; height: number };

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    gif: {
      setGif: (options: GifAttrs) => ReturnType;
    };
  }
}

/**
 * Stored/rendered as `![gif](giphy:id:WxH)` — same split as the Video
 * extension: the placeholder is what's saved, but the live editor shows a
 * real, loadable image reconstructed via resolveGiphyUrl, not the
 * placeholder string itself (which isn't a fetchable url).
 */
export const Gif = Node.create<GifOptions>({
  name: 'gif',
  group: 'inline',
  inline: true,
  atom: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      id: { default: null },
      width: { default: null },
      height: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[data-gif-id]',
        priority: 100,
        getAttrs: el => {
          const element = el as HTMLElement;
          return {
            id: element.getAttribute('data-gif-id'),
            width: Number(element.getAttribute('data-width')) || null,
            height: Number(element.getAttribute('data-height')) || null,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as GifAttrs;
    const src = resolveGiphyUrl(buildGiphyPlaceholder(attrs));
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        src, alt: 'gif', 'data-gif-id': attrs.id, 'data-width': attrs.width, 'data-height': attrs.height,
      }),
    ];
  },

  addCommands() {
    return {
      setGif:
        options =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: options }),
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: { write: (s: string) => void }, node: { attrs: GifAttrs }) {
          state.write(`![gif](${buildGiphyPlaceholder(node.attrs)})`);
        },
        parse: {
          updateDOM(element: HTMLElement) {
            element.querySelectorAll('img[alt="gif"]').forEach(img => {
              const src = img.getAttribute('src');
              if (!src) return;
              const id = parseGiphyId(src);
              if (!id) return;
              const dims = parseGiphyDimensions(src);
              img.setAttribute('data-gif-id', id);
              if (dims) {
                img.setAttribute('data-width', String(dims.width));
                img.setAttribute('data-height', String(dims.height));
              }
            });
          },
        },
      },
    };
  },
});
