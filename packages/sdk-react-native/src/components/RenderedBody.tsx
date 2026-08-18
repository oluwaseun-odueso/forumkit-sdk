import { useMemo } from 'react';
import { Linking } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../theme/ThemeContext';
import type { TokenSet } from '@forumkit/shared';

// Renders a post/comment body as Markdown — the mobile counterpart to sdk-web's
// rendered-body.tsx. Themed via tokens. (Spoiler syntax + in-body video are not
// specially handled yet; they fall back to text/links.)
export default function RenderedBody({ body, size = 14.5 }: { body: string; size?: number }) {
  const { tokens } = useTheme();
  const styles = useMemo(() => markdownStyles(tokens, size), [tokens, size]);
  return (
    <Markdown
      style={styles}
      onLinkPress={url => { void Linking.openURL(url); return false; }}
    >
      {body}
    </Markdown>
  );
}

function markdownStyles(tokens: TokenSet, size: number): Record<string, object> {
  const line = Math.round(size * 1.5);
  return {
    body: { color: tokens['text-2'], fontSize: size, lineHeight: line },
    paragraph: { marginTop: 0, marginBottom: 10, color: tokens['text-2'], fontSize: size, lineHeight: line },
    heading1: { color: tokens.text, fontSize: size + 6, fontWeight: '800', marginBottom: 8 },
    heading2: { color: tokens.text, fontSize: size + 4, fontWeight: '700', marginBottom: 8 },
    heading3: { color: tokens.text, fontSize: size + 2, fontWeight: '700', marginBottom: 6 },
    strong: { fontWeight: '700', color: tokens.text },
    em: { fontStyle: 'italic' },
    s: { textDecorationLine: 'line-through' },
    link: { color: tokens.accent },
    blockquote: {
      backgroundColor: tokens['surface-2'],
      borderLeftColor: tokens['border-strong'],
      borderLeftWidth: 3,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginBottom: 10,
      borderRadius: 6,
    },
    bullet_list: { marginBottom: 10 },
    ordered_list: { marginBottom: 10 },
    list_item: { color: tokens['text-2'], fontSize: size, lineHeight: line },
    code_inline: {
      backgroundColor: tokens['surface-2'],
      color: tokens.text,
      borderRadius: 4,
      paddingHorizontal: 4,
      fontFamily: 'Courier',
      fontSize: size - 1,
    },
    code_block: {
      backgroundColor: tokens['surface-2'],
      color: tokens.text,
      borderRadius: 8,
      padding: 12,
      marginBottom: 10,
      fontFamily: 'Courier',
      fontSize: size - 1,
    },
    fence: {
      backgroundColor: tokens['surface-2'],
      color: tokens.text,
      borderRadius: 8,
      padding: 12,
      marginBottom: 10,
      fontFamily: 'Courier',
      fontSize: size - 1,
    },
    hr: { backgroundColor: tokens.border, height: 1, marginVertical: 10 },
    image: { borderRadius: 12, marginVertical: 8 },
  };
}
