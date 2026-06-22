export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderBody(s: string): string {
  const escaped = escapeHtml(s);

  // Fenced code blocks: ```lang\n...\n```
  const withBlocks = escaped.replace(
    /```([^\n]*)\n([\s\S]*?)```/g,
    (_match, lang: string, code: string) => {
      const langAttr = lang.trim() ? ` class="language-${escapeHtml(lang.trim())}"` : '';
      return `<pre class="fk-code-block"><code${langAttr}>${code}</code></pre>`;
    },
  );

  // Inline backtick code
  const withInline = withBlocks.replace(/`([^`]+)`/g, '<code class="fk-code-inline">$1</code>');

  // Preserve line breaks outside code blocks
  return withInline.replace(/(?<!<\/code>|<\/pre>)\n/g, '<br>');
}
