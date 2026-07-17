import './mascot-icon.css';

type MascotIconProps = {
  size?: number;
  variant?: 'nav' | 'empty';
};

export default function MascotIcon({ size = 34, variant = 'nav' }: MascotIconProps) {
  const isEmpty = variant === 'empty';
  return (
    <div className="fk-mascot" style={{ width: size, height: size }} aria-hidden="true">
      <div className="fk-mascot-bubble">
        <div className="fk-mascot-highlight" />
        <div className="fk-mascot-dots">
          {[0, 1, 2].map(i => <span key={i} className="fk-mascot-dot" />)}
        </div>
      </div>
      {!isEmpty && <div className="fk-mascot-tail" />}
      {!isEmpty && (
        <div className="fk-mascot-badge">
          <span>1</span>
        </div>
      )}
    </div>
  );
}
