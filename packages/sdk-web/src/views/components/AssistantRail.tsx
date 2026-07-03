import { Mascot } from './Mascot';

type AsstState = {
  summarizing: boolean;
  summary: string[] | null;
  suggested: boolean;
};

type Props = {
  asst: AsstState;
  onSummarize: () => void;
  onSuggest: () => void;
};

function LoadingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            display: 'block', width: 7, height: 7, borderRadius: '50%',
            background: 'var(--t25, #b8c4d9)',
            animation: `fkdotpop 1.2s ${i * 0.2}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

// Chrome-gradient style matching the design's AI tool buttons (same family as Post/Reply buttons)
const chromeTool: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
  color: '#16203a', fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 500,
  background: 'radial-gradient(120% 90% at 28% 20%, rgba(255,255,255,.85), rgba(255,255,255,0) 55%), linear-gradient(155deg,#edf3fc,#acbed9 52%,#627691)',
  boxShadow: '0 12px 28px -12px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.8)',
  border: 'none',
};

export function AssistantRail({ asst, onSummarize, onSuggest }: Props) {
  return (
    <div style={{
      position: 'relative', zIndex: 2, width: 330, flexShrink: 0,
      borderLeft: '1px solid rgba(108,170,245,.12)',
      background: 'linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.18))',
      display: 'flex', flexDirection: 'column',
      padding: '30px 24px',
      overflowY: 'auto',
    }}>
      {/* Lina identity */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ animation: 'fkfloat 6.5s ease-in-out infinite', marginBottom: 6 }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 28%, rgba(200,225,255,.9) 0%, rgba(108,170,245,.7) 30%, rgba(56,100,180,.85) 60%, rgba(20,30,60,.95) 100%)',
            boxShadow: '0 0 50px rgba(108,170,245,.5), 0 0 100px rgba(56,100,180,.3), inset 0 1px 3px rgba(255,255,255,.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mascot size={44} />
          </div>
        </div>
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 500, color: 'var(--t32, #eef3fb)', marginTop: 6 }}>Lina</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'Sora,sans-serif', fontSize: 11, letterSpacing: '.6px', color: 'var(--t17, #8590a5)', marginTop: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--fk-accent, #5cc8f5)', animation: 'fkbreathe 2.4s ease-in-out infinite', display: 'inline-block' }} />
          FORUM ASSISTANT
        </div>
      </div>

      {/* AI tools section */}
      <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 10, letterSpacing: '1.6px', color: 'var(--t12, #5b6376)', margin: '30px 4px 12px' }}>
        AI TOOLS
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          type="button"
          aria-label="Summarize thread"
          disabled={asst.summarizing}
          onClick={onSummarize}
          style={{ ...chromeTool, cursor: asst.summarizing ? 'wait' : 'pointer' }}
        >
          <span style={{ fontSize: 17 }}>✦</span>
          Summarize this thread
        </button>

        <button
          type="button"
          aria-label="Suggest a reply"
          onClick={onSuggest}
          style={chromeTool}
        >
          <span style={{ fontSize: 17 }}>↩</span>
          Suggest a reply
        </button>

        <button
          type="button"
          disabled
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', borderRadius: 14, cursor: 'not-allowed', opacity: 0.35,
            background: 'var(--t57, rgba(218,229,247,.04))',
            border: '1px solid var(--t63, rgba(218,229,247,.1))',
            fontFamily: 'Sora,sans-serif', fontSize: 14, color: 'var(--t20, #9da9be)',
          }}
        >
          <span style={{ fontSize: 17 }}>⊙</span>
          Surface related
        </button>
      </div>

      {/* Summarizing loading state */}
      {asst.summarizing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 4px', marginTop: 22 }}>
          <LoadingDots />
          <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 12, color: 'var(--t14, #6b7488)' }}>Lina is reading the thread…</span>
        </div>
      )}

      {/* Summary card */}
      {asst.summary && (
        <div style={{
          marginTop: 22, padding: '20px 20px', borderRadius: 16,
          background: 'linear-gradient(165deg, rgba(108,170,245,.15), rgba(32,44,68,.12))',
          border: '1px solid rgba(108,170,245,.26)',
          boxShadow: '0 18px 44px -24px rgba(0,0,0,.6)',
        }}>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 10, letterSpacing: '1.6px', color: 'rgba(108,170,245,.7)', marginBottom: 12 }}>
            ✦ THREAD SUMMARY
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {asst.summary.map((point, i) => (
              <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: 'rgba(108,170,245,.6)', fontSize: 10, marginTop: 3, flexShrink: 0 }}>●</span>
                <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 13, color: 'var(--t25, #b8c4d9)', lineHeight: 1.55 }}>
                  {point}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
