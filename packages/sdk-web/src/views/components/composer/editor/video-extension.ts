import { Node, mergeAttributes } from '@tiptap/core';

export type VideoOptions = {
  HTMLAttributes: Record<string, unknown>;
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: { src: string }) => ReturnType;
    };
  }
}

/**
 * Stored/rendered as `![video](url)` — a standard Markdown image link whose alt
 * text is literally "video". Degrades gracefully in any other Markdown renderer
 * (shows as a broken-image link with visible "video" text) and is trivially
 * detectable on the display side by checking `alt === 'video'`.
 */
export const Video = Node.create<VideoOptions>({
  name: 'video',
  group: 'inline',
  inline: true,
  atom: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      src: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'video[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { controls: 'true' })];
  },

  addCommands() {
    return {
      setVideo:
        options =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: options }),
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: { write: (s: string) => void }, node: { attrs: { src: string } }) {
          const src = String(node.attrs.src ?? '').replace(/[()]/g, '\\$&');
          state.write(`![video](${src})`);
        },
        parse: {
          updateDOM(element: HTMLElement) {
            element.querySelectorAll('img[alt="video"]').forEach(img => {
              const video = document.createElement('video');
              const src = img.getAttribute('src');
              if (src) video.setAttribute('src', src);
              video.setAttribute('controls', 'true');
              img.replaceWith(video);
            });
          },
        },
      },
    };
  },
});
