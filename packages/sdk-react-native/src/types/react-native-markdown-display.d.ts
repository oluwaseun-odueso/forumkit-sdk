// Minimal type shim — react-native-markdown-display ships no TypeScript types.
declare module 'react-native-markdown-display' {
  import type { ComponentType, ReactNode } from 'react';
  export type MarkdownProps = {
    style?: Record<string, object>;
    children?: ReactNode;
    onLinkPress?: (url: string) => boolean;
    mergeStyle?: boolean;
  };
  const Markdown: ComponentType<MarkdownProps>;
  export default Markdown;
}
