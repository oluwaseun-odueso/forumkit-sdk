type Props = { filterId?: string };

export function GrainLayer({ filterId = 'fk-grain' }: Props) {
  const svgUrl = `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22140%22 height=%22140%22%3E%3Cfilter id=%22${filterId}%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23${filterId})%22/%3E%3C/svg%3E`;
  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none',
      mixBlendMode: 'soft-light',
      opacity: 'var(--fk-grain)' as unknown as number,
      backgroundImage: `url('${svgUrl}')`,
    }} />
  );
}
