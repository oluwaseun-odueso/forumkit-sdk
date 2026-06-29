import type { ReactNode } from 'react';

type Props = {
  isLast: boolean;
  children: ReactNode;
};

export function SpineNode({ isLast, children }: Props) {
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 0 }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: 34, flexShrink: 0, paddingTop: 3,
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
          background: 'radial-gradient(circle at 33% 27%, #d4e0f4, #7a9bc4 60%, #2e4a72)',
          boxShadow: '0 0 12px rgba(108,170,245,.5)',
        }} />
        {!isLast && (
          <div style={{
            flex: 1, width: 1, minHeight: 36,
            background: 'linear-gradient(180deg, rgba(108,170,245,.4), rgba(108,170,245,.08))',
          }} />
        )}
      </div>
      <div style={{ flex: 1, paddingLeft: 16, paddingBottom: 20 }}>
        {children}
      </div>
    </div>
  );
}
