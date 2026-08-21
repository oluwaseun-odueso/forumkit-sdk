import { useMemo, type ReactNode } from 'react';
import { Linking, Text, View, Image, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// Renders a post/comment body as Markdown — the mobile counterpart to sdk-web's
// rendered-body.tsx (react-markdown + remark-gfm there; RN can't run that
// stack). This used to wrap react-native-markdown-display, but that library's
// stringToTokens() swallows markdown-it parse errors silently (try/catch →
// console.warn only, see its source), which — on this project's RN/Hermes
// runtime — made every single post/comment body render as nothing while the
// surrounding UI (title, etc, all plain <Text>) rendered fine, with no visible
// crash. Rather than depend on a third-party parser we can't verify at
// runtime, this renders directly against the fixed grammar the composer's own
// toolbar produces (bold/italic/strike/code/links/headings/blockquote/lists/
// hr/images) — bounded, and fully within our control.
// (Spoiler syntax + in-body video are not specially handled yet; they fall
// back to text/links — same scope gap the previous version had.)

type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'blockquote'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'code'; text: string }
  | { type: 'image'; url: string; alt: string }
  | { type: 'hr' };

function parseBlocks(body: string): Block[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  let paragraphBuf: string[] = [];

  function flushParagraph(): void {
    if (paragraphBuf.length > 0) {
      const text = paragraphBuf.join('\n').trim();
      if (text.length > 0) blocks.push({ type: 'paragraph', text });
      paragraphBuf = [];
    }
  }

  while (i < lines.length) {
    const line = lines[i] ?? '';

    if (line.trim() === '') { flushParagraph(); i++; continue; }

    if (/^```/.test(line.trim())) {
      flushParagraph();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test((lines[i] ?? '').trim())) { codeLines.push(lines[i] ?? ''); i++; }
      i++;
      blocks.push({ type: 'code', text: codeLines.join('\n') });
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    if (headingMatch) {
      flushParagraph();
      blocks.push({ type: 'heading', level: (headingMatch[1]?.length ?? 1) as 1 | 2 | 3, text: headingMatch[2] ?? '' });
      i++; continue;
    }

    if (/^(---|\*\*\*|___)\s*$/.test(line.trim())) {
      flushParagraph();
      blocks.push({ type: 'hr' });
      i++; continue;
    }

    const imageMatch = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/.exec(line.trim());
    if (imageMatch) {
      flushParagraph();
      blocks.push({ type: 'image', alt: imageMatch[1] ?? '', url: imageMatch[2] ?? '' });
      i++; continue;
    }

    if (/^>\s?/.test(line)) {
      flushParagraph();
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i] ?? '')) {
        quoteLines.push((lines[i] ?? '').replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join('\n') });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: true, items });
      continue;
    }

    paragraphBuf.push(line);
    i++;
  }
  flushParagraph();
  return blocks;
}

// Non-nested inline formatting — matches what the composer toolbar actually
// produces (wrap-the-selection, never nested spans), split into segments in
// one pass. Longer markers are listed first so ** wins over * at the same
// start position.
const INLINE_RE = /(\*\*[^*]+?\*\*|~~[^~]+?~~|`[^`]+?`|\*[^*]+?\*|\[[^\]]*?\]\([^)]+?\))/g;

function renderInline(text: string, keyPrefix: string, linkColor: string, codeBg: string): ReactNode[] {
  const parts = text.split(INLINE_RE).filter(p => p !== undefined && p !== '');
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={key} style={{ fontWeight: '700' }}>{part.slice(2, -2)}</Text>;
    }
    if (part.startsWith('~~') && part.endsWith('~~')) {
      return <Text key={key} style={{ textDecorationLine: 'line-through' }}>{part.slice(2, -2)}</Text>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <Text key={key} style={{ fontFamily: 'Courier', backgroundColor: codeBg, borderRadius: 4 }}>{part.slice(1, -1)}</Text>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <Text key={key} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</Text>;
    }
    const linkMatch = /^\[([^\]]*)\]\(([^)]+)\)$/.exec(part);
    if (linkMatch) {
      const label = linkMatch[1];
      const url = linkMatch[2] ?? '';
      return (
        <Text key={key} style={{ color: linkColor }} onPress={() => { void Linking.openURL(url); }}>
          {label && label.length > 0 ? label : url}
        </Text>
      );
    }
    return part;
  });
}

export default function RenderedBody({ body, size = 14.5 }: { body: string; size?: number }) {
  const { tokens } = useTheme();
  const blocks = useMemo(() => parseBlocks(body), [body]);
  const line = Math.round(size * 1.5);
  const textColor = tokens['text-2'];

  return (
    <View>
      {blocks.map((b, idx) => {
        const key = `b-${idx}`;
        switch (b.type) {
          case 'heading':
            return (
              <Text key={key} style={{ color: tokens.text, fontSize: size + (4 - b.level) * 2, fontWeight: '800', marginBottom: 8 }}>
                {renderInline(b.text, key, tokens.accent, tokens['surface-2'])}
              </Text>
            );
          case 'blockquote':
            return (
              <View key={key} style={[styles.blockquote, { backgroundColor: tokens['surface-2'], borderLeftColor: tokens['border-strong'] }]}>
                <Text style={{ color: textColor, fontSize: size, lineHeight: line }}>
                  {renderInline(b.text, key, tokens.accent, tokens.elev)}
                </Text>
              </View>
            );
          case 'list':
            return (
              <View key={key} style={styles.list}>
                {b.items.map((item, i) => (
                  <View key={`${key}-${i}`} style={styles.listRow}>
                    <Text style={{ color: textColor, fontSize: size, lineHeight: line }}>{b.ordered ? `${i + 1}.` : '•'}</Text>
                    <Text style={{ color: textColor, fontSize: size, lineHeight: line, flex: 1 }}>
                      {renderInline(item, `${key}-${i}`, tokens.accent, tokens.elev)}
                    </Text>
                  </View>
                ))}
              </View>
            );
          case 'code':
            return (
              <View key={key} style={[styles.codeBlock, { backgroundColor: tokens['surface-2'] }]}>
                <Text style={{ color: tokens.text, fontFamily: 'Courier', fontSize: size - 1 }}>{b.text}</Text>
              </View>
            );
          case 'hr':
            return <View key={key} style={[styles.hr, { backgroundColor: tokens.border }]} />;
          case 'image':
            return <Image key={key} source={{ uri: b.url }} style={[styles.image, { backgroundColor: tokens['surface-2'] }]} resizeMode="cover" />;
          case 'paragraph':
          default:
            return (
              <Text key={key} style={{ color: textColor, fontSize: size, lineHeight: line, marginBottom: 10 }}>
                {renderInline(b.text, key, tokens.accent, tokens.elev)}
              </Text>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  blockquote: { borderLeftWidth: 3, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 10 },
  list: { marginBottom: 10 },
  listRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  codeBlock: { borderRadius: 8, padding: 12, marginBottom: 10 },
  hr: { height: 1, marginVertical: 10 },
  image: { width: '100%', aspectRatio: 4 / 5, borderRadius: 12, marginVertical: 8 },
});
