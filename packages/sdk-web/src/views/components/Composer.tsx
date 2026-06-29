import { chromeButton } from '../styles/tokens';

type Variant = 'studio' | 'aurora';

type Props = {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onPost: () => void;
  variant?: Variant;
};

const WRAP_STYLE: Record<Variant, React.CSSProperties> = {
  studio: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '9px 9px 9px 22px', borderRadius: 18,
    background: 'linear-gradient(165deg, var(--t50, rgba(214,226,245,.09)), var(--t48, rgba(214,226,245,.03)))',
    border: '1px solid var(--t52, rgba(214,226,245,.15))',
    boxShadow: '0 18px 40px -20px var(--t39, rgba(0,0,0,.7)), inset 0 1px 0 rgba(255,255,255,.16)',
  },
  aurora: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '9px 9px 9px 22px', borderRadius: 30,
    background: 'linear-gradient(165deg, var(--t51, rgba(214,226,245,.1)), var(--t48, rgba(214,226,245,.03)))',
    border: '1px solid var(--t53, rgba(214,226,245,.16))',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    boxShadow: '0 20px 44px -20px var(--t39, rgba(0,0,0,.7)), inset 0 1px 0 rgba(255,255,255,.18)',
  },
};

export function Composer({ value, placeholder, onChange, onPost, variant = 'studio' }: Props) {
  const postBorderRadius = variant === 'aurora' ? 22 : 13;

  return (
    <div style={WRAP_STYLE[variant]}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onPost(); }}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          color: 'var(--t30, #e9eff8)', fontFamily: 'Sora,sans-serif', fontSize: 16,
        }}
      />
      <button
        type="button"
        aria-label="Post reply"
        onClick={onPost}
        style={{
          ...chromeButton,
          display: 'flex', alignItems: 'center',
          height: 40, padding: '0 20px', borderRadius: postBorderRadius,
          cursor: 'pointer', flexShrink: 0,
          fontFamily: 'Sora,sans-serif', fontSize: 13.5, fontWeight: 500,
          border: 'none',
        }}
      >
        Post
      </button>
    </div>
  );
}
