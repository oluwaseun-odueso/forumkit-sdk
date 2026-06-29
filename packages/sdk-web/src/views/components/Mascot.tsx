export function Mascot({ size = 34 }: { size?: number }) {
  const scale = size / 34;
  return (
    <div style={{ width: size, height: size, perspective: 240 * scale, flexShrink: 0 }}>
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        animation: 'fkdance 4.8s ease-in-out infinite',
      }}>
        {/* tail */}
        <div style={{
          position: 'absolute',
          left: 3 * scale, bottom: 1 * scale,
          width: 12 * scale, height: 12 * scale,
          borderRadius: '74% 74% 80% 2px',
          background: 'linear-gradient(150deg,#8cc0f7,#3f7ee2)',
          boxShadow: `inset 0 ${-2 * scale}px ${5 * scale}px rgba(22,52,118,.35)`,
          transform: 'rotate(11deg)',
        }} />
        {/* body */}
        <div style={{
          position: 'absolute', inset: 2 * scale,
          borderRadius: '50% 50% 52% 16% / 52% 52% 50% 50%',
          background: 'radial-gradient(120% 95% at 32% 22%, rgba(255,255,255,.92), rgba(255,255,255,0) 52%), linear-gradient(155deg,#cfe8ff 0%,#86bdf6 40%,#3f7ee2 66%,#aed6ff 100%)',
          boxShadow: `0 ${6 * scale}px ${14 * scale}px ${-5 * scale}px rgba(16,38,92,.5), inset 0 ${1 * scale}px 0 rgba(255,255,255,.85), inset 0 ${-2 * scale}px ${5 * scale}px rgba(22,52,118,.4)`,
        }} />
        {/* dots */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 3 * scale, paddingBottom: 2 * scale,
        }}>
          {(['0s', '0.18s', '0.36s'] as const).map((delay, i) => (
            <span key={i} style={{
              width: 5 * scale, height: 5 * scale, borderRadius: '50%',
              background: '#2a2410',
              display: 'block',
              animation: `fkdotpop 1.4s ease-in-out infinite ${delay}`,
            }} />
          ))}
        </div>
        {/* notification badge */}
        <div style={{
          position: 'absolute', top: -3 * scale, right: -3 * scale,
          width: 14 * scale, height: 14 * scale, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #ff9384, #e0432f)',
          boxShadow: `0 ${2 * scale}px ${5 * scale}px ${-1 * scale}px var(--t36, rgba(0,0,0,.5)), inset 0 ${1 * scale}px 0 rgba(255,255,255,.45)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Sora,sans-serif', fontSize: 8 * scale, fontWeight: 600, color: '#fff',
          animation: 'fkbadge 4.8s ease-in-out infinite',
        }}>
          1
        </div>
      </div>
    </div>
  );
}
