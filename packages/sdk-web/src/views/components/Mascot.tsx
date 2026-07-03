type Props = {
  size?: number;
  badge?: number | string | false;
};

const PEOPLE: Array<{ head: number; shoulderW: number; shoulderH: number; delay: string }> = [
  { head: 4.14, shoulderW: 6.30, shoulderH: 4.27, delay: '0s' },
  { head: 5.06, shoulderW: 7.70, shoulderH: 5.22, delay: '0.18s' },
  { head: 4.14, shoulderW: 6.30, shoulderH: 4.27, delay: '0.36s' },
];

export function Mascot({ size = 34, badge = 1 }: Props) {
  const s = size / 34;
  return (
    <div style={{ width: size, height: size, perspective: 240 * s, flexShrink: 0 }}>
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        animation: 'fkdance 4.8s ease-in-out infinite',
      }}>
        {/* bubble tail */}
        <div style={{
          position: 'absolute',
          left: 3 * s, bottom: 1 * s,
          width: 12 * s, height: 12 * s,
          borderRadius: '74% 74% 80% 2px',
          background: 'linear-gradient(150deg,#8cc0f7,#3f7ee2)',
          boxShadow: `inset 0 ${-2 * s}px ${5 * s}px rgba(22,52,118,.35)`,
          transform: 'rotate(11deg)',
        }} />
        {/* glossy bubble body */}
        <div style={{
          position: 'absolute', inset: 2 * s,
          borderRadius: '50% 50% 52% 16% / 52% 52% 50% 50%',
          background: 'radial-gradient(120% 95% at 32% 22%, rgba(255,255,255,.92), rgba(255,255,255,0) 52%), linear-gradient(155deg,#cfe8ff 0%,#86bdf6 40%,#3f7ee2 66%,#aed6ff 100%)',
          boxShadow: `0 ${6 * s}px ${14 * s}px ${-5 * s}px rgba(16,38,92,.5), inset 0 ${1 * s}px 0 rgba(255,255,255,.85), inset 0 ${-2 * s}px ${5 * s}px rgba(22,52,118,.4)`,
        }} />
        {/* three people — head + shoulders */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 2.5 * s,
          padding: `0 ${2.1 * s}px ${3.1 * s}px`,
          boxSizing: 'border-box',
        }}>
          {PEOPLE.map((p, i) => (
            <span key={i} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              transformOrigin: 'bottom center',
              animation: `fkdotpop 1.4s ease-in-out infinite ${p.delay}`,
            }}>
              <span style={{ width: p.head * s, height: p.head * s, borderRadius: '50%', background: '#21314e' }} />
              <span style={{
                width: p.shoulderW * s, height: p.shoulderH * s,
                marginTop: 0.5 * s,
                borderRadius: `${p.shoulderW / 2 * s}px ${p.shoulderW / 2 * s}px ${1.1 * s}px ${1.1 * s}px`,
                background: '#21314e',
              }} />
            </span>
          ))}
        </div>
        {/* notification badge — hidden by passing badge={false} */}
        {badge !== false && (
          <div style={{
            position: 'absolute', top: -3 * s, right: -3 * s,
            width: 14 * s, height: 14 * s, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #ff9384, #e0432f)',
            boxShadow: `0 ${2 * s}px ${5 * s}px ${-1 * s}px rgba(0,0,0,.5), inset 0 ${1 * s}px 0 rgba(255,255,255,.45)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'system-ui,sans-serif', fontSize: 8 * s, fontWeight: 600, color: '#fff',
            animation: 'fkbadge 4.8s ease-in-out infinite',
          }}>
            {badge}
          </div>
        )}
      </div>
    </div>
  );
}
