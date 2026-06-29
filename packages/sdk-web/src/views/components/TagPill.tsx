export function TagPill({ tag }: { tag: string }) {
  return (
    <span style={{
      fontFamily: 'Sora,sans-serif', fontSize: 11, letterSpacing: '.5px',
      color: 'var(--t19, #98a4be)',
      padding: '4px 10px', borderRadius: 20,
      background: 'rgba(108,170,245,.1)',
      border: '1px solid rgba(108,170,245,.2)',
    }}>
      {tag}
    </span>
  );
}
