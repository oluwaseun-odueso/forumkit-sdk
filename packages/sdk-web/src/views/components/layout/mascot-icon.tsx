import { useContext } from 'react';
import { ThemeHostContext } from '../../hooks/use-theme';
import './mascot-icon.css';

type MascotIconProps = {
  size?: number;
  variant?: 'nav' | 'empty';
};

const FIGURE_DELAYS = ['0s', '.18s', '.36s'];

export default function MascotIcon({ size = 34, variant = 'nav' }: MascotIconProps) {
  // A host-supplied mascot replaces the default everywhere this component
  // is used — the brand mark in top-nav/Drawer and every loading state that
  // otherwise renders the built-in CSS mascot below. Read from context
  // rather than requiring every one of this component's ~15 call sites to
  // be refactored individually.
  const { mascot: Mascot } = useContext(ThemeHostContext);
  if (Mascot) return <Mascot size={size} />;

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
