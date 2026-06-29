export function Avatar({ size = 26 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      flexShrink: 0,
      background: 'radial-gradient(circle at 33% 27%, #ffffff 0%, #d9e4f5 16%, #90a4c5 46%, #3a4862 78%, #a6b9d6 100%)',
      boxShadow: '0 4px 10px -4px var(--t36, rgba(0,0,0,.5)), inset 0 1px 2px rgba(255,255,255,.85)',
    }} />
  );
}
