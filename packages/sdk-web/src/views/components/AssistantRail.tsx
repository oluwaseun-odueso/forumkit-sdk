
type AsstState = {
  summarizing: boolean;
  summary: { points: string[]; note: string } | null;
  suggested: boolean;
};

type Props = {
  asst: AsstState;
  onSummarize: () => void;
  onSuggest: () => void;
  onSurfaceRelated?: () => void;
};

function AiBtn({ style, onClick, children }: { style: React.CSSProperties; onClick?: (() => void) | undefined; children: React.ReactNode }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, cursor: 'pointer', fontFamily: 'Sora,sans-serif', fontSize: 14, ...style }}
    >
      {children}
    </div>
  );
}

export function AssistantRail({ asst, onSummarize, onSuggest, onSurfaceRelated }: Props) {
  return (
    <div style={{
      position: 'relative', zIndex: 2, width: 330, flexShrink: 0,
      borderLeft: '1px solid rgba(108,170,245,.12)',
      background: 'linear-gradient(180deg, rgba(255,255,255,.03), var(--t34, rgba(0,0,0,.18)))',
      display: 'flex', flexDirection: 'column',
      padding: '30px 24px',
    }}>

      {/* Lina identity */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <img
          src="/lina-assistant.png"
          alt="Lina"
          style={{ width: 150, height: 150, objectFit: 'contain', animation: 'fkfloat 6.5s ease-in-out infinite' }}
        />
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 500, color: 'var(--t32, #eef3fb)', marginTop: 6 }}>Lina</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'Sora,sans-serif', fontSize: 11, letterSpacing: '.6px', color: 'var(--t17, #8590a5)', marginTop: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fk-accent)', animation: 'fkbreathe 2.4s ease-in-out infinite', display: 'inline-block' }} />
          FORUM ASSISTANT
        </div>
      </div>

      {/* AI tools label */}
      <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 10, letterSpacing: '1.6px', color: 'var(--t12, #5b6376)', margin: '30px 4px 12px' }}>
        AI TOOLS
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Summarize — chrome gradient, dark text */}
        <AiBtn
          onClick={onSummarize}
          style={{
            color: '#16203a', fontWeight: 500,
            background: 'radial-gradient(120% 90% at 28% 20%, rgba(255,255,255,.85), rgba(255,255,255,0) 55%), linear-gradient(155deg,#edf3fc,#acbed9 52%,#627691)',
            boxShadow: '0 12px 28px -12px var(--t37, rgba(0,0,0,.6)), inset 0 1px 0 rgba(255,255,255,.8)',
          }}
        >
          <span style={{ fontSize: 17 }}>✦</span>
          Summarize this thread
        </AiBtn>

        {/* Suggest a reply — glass surface, accent ✺ icon */}
        <AiBtn
          onClick={onSuggest}
          style={{
            color: 'var(--t30, #e9eff8)',
            background: 'linear-gradient(165deg, var(--t61, rgba(218,229,247,.08)), var(--t55, rgba(218,229,247,.02)))',
            border: '1px solid var(--t66, rgba(218,229,247,.14))',
            boxShadow: '0 10px 26px -16px var(--t37, rgba(0,0,0,.6))',
          }}
        >
          <span style={{ fontSize: 16, color: 'var(--fk-accent)' }}>✺</span>
          Suggest a reply
        </AiBtn>

        {/* Surface related — dim glass */}
        <AiBtn
          onClick={onSurfaceRelated}
          style={{
            color: 'var(--t23, #acb7cc)',
            background: 'linear-gradient(165deg, var(--t58, rgba(218,229,247,.05)), var(--t54, rgba(218,229,247,.01)))',
            border: '1px solid var(--t63, rgba(218,229,247,.1))',
          }}
        >
          <span style={{ fontSize: 16, color: 'var(--t17, #8590a5)' }}>◑</span>
          Surface related threads
        </AiBtn>
      </div>

      {/* Loading state */}
      {asst.summarizing && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginTop: 22, padding: '16px 18px', borderRadius: 16,
          background: 'rgba(108,170,245,.08)', border: '1px solid rgba(108,170,245,.16)',
        }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {[0, 0.2, 0.4].map((delay, i) => (
              <span key={i} style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--fk-accent)',
                animation: `fkbreathe 1.1s ${delay}s ease-in-out infinite`,
                display: 'inline-block',
              }} />
            ))}
          </div>
          <span style={{ fontFamily: 'Sora,sans-serif', fontStyle: 'italic', fontSize: 14, color: 'var(--t23, #acb7cc)' }}>
            Lina is reading the thread…
          </span>
        </div>
      )}

      {/* Summary card */}
      {asst.summary && (
        <div style={{
          marginTop: 22, padding: '20px 20px', borderRadius: 16,
          background: 'linear-gradient(165deg, rgba(108,170,245,.15), var(--t70, rgba(32,44,68,.12)))',
          border: '1px solid rgba(108,170,245,.26)',
          boxShadow: '0 18px 44px -24px var(--t37, rgba(0,0,0,.6))',
        }}>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 10, letterSpacing: '1.4px', color: 'var(--fk-accent)', marginBottom: 12 }}>
            ✦ THREAD SUMMARY
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {asst.summary.points.map((point, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, fontFamily: 'Sora,sans-serif', fontSize: 14.5, lineHeight: 1.5, color: 'var(--t28, #cfd8ea)' }}>
                <span style={{ color: 'var(--fk-accent)', flex: '0 0 auto' }}>—</span>
                <span>{point}</span>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 10.5, color: 'var(--t13, #6b7387)', marginTop: 14, letterSpacing: '.3px' }}>
            {asst.summary.note}
          </div>
        </div>
      )}

      <div style={{ flex: 1 }} />

      <div style={{ fontFamily: 'Sora,sans-serif', fontStyle: 'italic', fontSize: 12.5, color: 'var(--t12, #5b6376)', textAlign: 'center', lineHeight: 1.5 }}>
        Lina reads every reply so you don't have to.
      </div>
    </div>
  );
}
