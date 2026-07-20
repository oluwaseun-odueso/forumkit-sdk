import './mascot-icon.css';

type MascotIconProps = {
  size?: number;
  variant?: 'nav' | 'empty';
};

const FIGURE_DELAYS = ['0s', '.18s', '.36s'];

/**
 * The Forum Kit mascot: a chat-bubble with three dancing figures, built
 * entirely from CSS gradients/shapes per the design handoff (no image
 * asset). `variant="nav"` is the animated 34px nav mark (with badge);
 * `variant="empty"` is the larger, faded empty-state illustration (no
 * badge, no idle animation — the caller floats the whole icon instead).
 */
export default function MascotIcon({ size = 34, variant = 'nav' }: MascotIconProps) {
  const isNav = variant === 'nav';
  // Matches the design file's perspective:size ratio for each variant (240/34 for nav, 600/120 for empty).
  const perspective = isNav ? size * 7.06 : size * 5;

  return (
    <div className={`fk-mascot fk-mascot--${variant}`} style={{ width: size, height: size, perspective }} aria-hidden="true">
      <div className="fk-mascot-dancer">
        <div className="fk-mascot-tail" />
        <div className="fk-mascot-bubble">
          <div className="fk-mascot-highlight" />
        </div>
        <div className="fk-mascot-dots">
          {FIGURE_DELAYS.map((delay, i) => (
            <span key={i} className="fk-mascot-figure" style={isNav ? { animationDelay: delay } : undefined}>
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
