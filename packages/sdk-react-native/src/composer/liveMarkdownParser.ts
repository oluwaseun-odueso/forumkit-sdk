import type { MarkdownRange } from '@expensify/react-native-live-markdown';

// The library's own default parser (parseExpensiMark) uses single-asterisk
// bold (*bold*) — a different dialect from this app's, which uses GFM-style
// **bold** everywhere else (RenderedBody.tsx's INLINE_RE, and this
// composer's own toolbar wrap('**','**') etc. below). This parser mirrors
// INLINE_RE's grammar exactly (same longer-markers-first ordering, so `**`
// wins over `*` at the same starting position) so what highlights live while
// typing always matches what RenderedBody.tsx renders once submitted.
//
// Note: this only drives cosmetic live-highlighting — MarkdownTextInput
// passes value/onChangeText straight through to a real TextInput underneath,
// so it never transforms the stored/submitted text itself.
export function liveMarkdownParser(value: string): MarkdownRange[] {
  'worklet';
  const ranges: MarkdownRange[] = [];
  const re = /(\*\*[^*]+?\*\*|~~[^~]+?~~|`[^`]+?`|\*[^*]+?\*|\[[^\]]*?\]\([^)]+?\))/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(value)) !== null) {
    const text = match[0];
    const start = match.index;
    if (text.startsWith('**')) ranges.push({ type: 'bold', start, length: text.length });
    else if (text.startsWith('~~')) ranges.push({ type: 'strikethrough', start, length: text.length });
    else if (text.startsWith('`')) ranges.push({ type: 'code', start, length: text.length });
    else if (text.startsWith('*')) ranges.push({ type: 'italic', start, length: text.length });
    else ranges.push({ type: 'link', start, length: text.length });
  }
  return ranges;
}
