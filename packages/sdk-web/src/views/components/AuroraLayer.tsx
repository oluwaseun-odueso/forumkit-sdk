import type { CSSProperties } from 'react';

type Variant = 'studio' | 'aurora' | 'assistant';

const BASE: CSSProperties = {
  pointerEvents: 'none',
  opacity: 'var(--fk-glow)' as unknown as number,
  position: 'absolute',
};

const STUDIO: CSSProperties = {
  ...BASE,
  top: -110, left: '10%', width: '100%', height: 380,
  background: [
    'radial-gradient(56% 78% at 24% 32%, rgba(139,108,240,.34), transparent 70%)',
    'radial-gradient(54% 74% at 54% 6%, rgba(77,124,255,.32), transparent 72%)',
    'radial-gradient(58% 76% at 84% 28%, rgba(52,224,216,.24), transparent 70%)',
    'radial-gradient(42% 60% at 70% 48%, rgba(95,227,161,.16), transparent 75%)',
  ].join(','),
  filter: 'blur(34px)',
  animation: 'fkaurora 18s ease-in-out infinite, fkhue34 44s ease-in-out infinite',
};

const AURORA: CSSProperties = {
  ...BASE,
  top: -46, left: '50%', transform: 'translateX(-50%)',
  width: 440, height: 360,
  background: [
    'radial-gradient(46% 60% at 30% 42%, rgba(139,108,240,.42), transparent 70%)',
    'radial-gradient(44% 58% at 56% 22%, rgba(77,124,255,.40), transparent 72%)',
    'radial-gradient(50% 64% at 74% 42%, rgba(52,224,216,.32), transparent 70%)',
    'radial-gradient(38% 52% at 50% 62%, rgba(95,227,161,.20), transparent 75%)',
  ].join(','),
  filter: 'blur(30px)',
  animation: 'fkaurora 15s ease-in-out infinite, fkhue30 34s ease-in-out infinite',
};

const ASSISTANT: CSSProperties = {
  ...BASE,
  top: -110, left: 0, width: '100%', height: 380,
  background: [
    'radial-gradient(54% 76% at 22% 32%, rgba(139,108,240,.32), transparent 70%)',
    'radial-gradient(52% 72% at 50% 4%, rgba(77,124,255,.30), transparent 72%)',
    'radial-gradient(58% 76% at 80% 26%, rgba(52,224,216,.26), transparent 70%)',
    'radial-gradient(42% 60% at 64% 46%, rgba(95,227,161,.16), transparent 75%)',
  ].join(','),
  filter: 'blur(34px)',
  animation: 'fkaurora 17s ease-in-out infinite, fkhue34 41s ease-in-out infinite',
};

const STYLES: Record<Variant, CSSProperties> = {
  studio: STUDIO,
  aurora: AURORA,
  assistant: ASSISTANT,
};

export function AuroraLayer({ variant }: { variant: Variant }) {
  return <div style={STYLES[variant]} />;
}
