import './mascot-icon.css';

type MascotIconProps = {
  size?: number;
  variant?: 'nav' | 'empty';
};

const FIGURE_DELAYS = ['0s', '.18s', '.36s'];

export default function MascotIcon({ size = 34, variant = 'nav' }: MascotIconProps) {
  const isNav = variant === 'nav';
  const s = size / 34;

  return (
    <div
      className={`fk-mascot fk-mascot--${variant}`}
      style={{ width: size, height: size, perspective: isNav ? 240 * s : size * 5 } as React.CSSProperties}
      aria-hidden="true"
    >
      <div
        className="fk-mascot-dancer"
        style={{ '--s': s } as React.CSSProperties}
      >
        <div className="fk-mascot-tail" />
        <div className="fk-mascot-bubble" />
        <div className="fk-mascot-dots">
          {FIGURE_DELAYS.map((delay, i) => (
            <span
              key={i}
              className={`fk-mascot-figure${i === 1 ? ' fk-mascot-figure--mid' : ''}`}
              style={isNav ? { animationDelay: delay } : undefined}
            >
              <span className="fk-mascot-figure-head" />
              <span className="fk-mascot-figure-body" />
            </span>
          ))}
        </div>
        {isNav && (
          <div className="fk-mascot-badge">
            <span>1</span>
          </div>
        )}
      </div>
    </div>
  );
}
