import type { CSSProperties } from 'react';

export const LIGHT_VARS: Record<string, string> = {
  '--t1':'#e9edf4','--t2':'#e9edf4','--t3':'#f4f6fb','--t4':'#f4f6fb',
  '--t5':'#f4f6fb','--t6':'#f4f6fb','--t7':'#ffffff','--t8':'#ffffff',
  '--t9':'#ffffff','--t10':'#ffffff','--t11':'#9aa3b6','--t12':'#9aa3b6',
  '--t13':'#6a7690','--t14':'#6a7690','--t15':'#828ea4','--t16':'#828ea4',
  '--t17':'#828ea4','--t18':'#6a7690','--t19':'#5a6680','--t20':'#5a6680',
  '--t21':'#5a6680','--t22':'#5a6680','--t23':'#5a6680','--t24':'#2c3650',
  '--t25':'#2c3650','--t26':'#2c3650','--t27':'#6d4fc4','--t28':'#2c3650',
  '--t29':'#2c3650','--t30':'#161b2c','--t31':'#2c3650','--t32':'#161b2c',
  '--t33':'rgba(38,52,86,0.04)','--t34':'rgba(38,52,86,0.04)',
  '--t35':'rgba(38,52,86,0.072)','--t36':'rgba(38,52,86,0.08)',
  '--t37':'rgba(38,52,86,0.096)','--t38':'rgba(38,52,86,0.104)',
  '--t39':'rgba(38,52,86,0.112)','--t40':'rgba(38,52,86,0.136)',
  '--t41':'rgba(38,52,86,0.144)','--t42':'rgba(244,247,252,0.6)',
  '--t43':'rgba(255,255,255,0.98)','--t44':'rgba(255,255,255,0.98)',
  '--t45':'rgba(255,255,255,0.6)','--t46':'rgba(250,251,254,0.97)',
  '--t47':'rgba(255,255,255,0.98)','--t48':'rgba(40,52,84,0.03)',
  '--t49':'rgba(40,52,84,0.06)','--t50':'rgba(40,52,84,0.09)',
  '--t51':'rgba(40,52,84,0.1)','--t52':'rgba(40,52,84,0.15)',
  '--t53':'rgba(40,52,84,0.16)','--t54':'rgba(40,52,84,0.01)',
  '--t55':'rgba(40,52,84,0.02)','--t56':'rgba(40,52,84,0.03)',
  '--t57':'rgba(40,52,84,0.04)','--t58':'rgba(40,52,84,0.05)',
  '--t59':'rgba(40,52,84,0.06)','--t60':'rgba(40,52,84,0.07)',
  '--t61':'rgba(40,52,84,0.08)','--t62':'rgba(40,52,84,0.09)',
  '--t63':'rgba(40,52,84,0.1)','--t64':'rgba(40,52,84,0.12)',
  '--t65':'rgba(40,52,84,0.13)','--t66':'rgba(40,52,84,0.14)',
  '--t67':'rgba(40,52,84,0.15)','--t68':'rgba(40,52,84,0.16)',
  '--t69':'rgba(40,52,84,0.1)','--t70':'rgba(40,52,84,0.12)',
  '--t71':'rgba(26,34,58,0.28)','--t72':'rgba(26,34,58,0.35)',
  '--t73':'rgba(26,34,58,0.39)','--t74':'rgba(26,34,58,0.39)',
  '--t75':'rgba(241,244,250,0.97)','--t76':'rgba(109,79,196,0.25)',
};

export const chromeButton: CSSProperties = {
  background: 'radial-gradient(120% 90% at 30% 22%, rgba(255,255,255,.9), rgba(255,255,255,0) 55%), linear-gradient(155deg,#edf3fc,#acbed9 50%,#566884)',
  boxShadow: '0 10px 22px -8px var(--t37, rgba(0,0,0,.6)), inset 0 1px 0 rgba(255,255,255,.8)',
  color: '#16203a',
};

export const chromeSoft: CSSProperties = {
  background: 'radial-gradient(120% 90% at 30% 22%, rgba(255,255,255,.85), rgba(255,255,255,0) 55%), linear-gradient(155deg,#edf3fc,#acbed9 50%,#627691)',
  boxShadow: '0 8px 18px -8px var(--t36, rgba(0,0,0,.5)), inset 0 1px 0 rgba(255,255,255,.75)',
  color: '#16203a',
};

export const votePillActive: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  padding: '6px 13px', borderRadius: 20, cursor: 'pointer',
  fontFamily: 'Sora,sans-serif', fontSize: 13, fontWeight: 500, color: '#16203a',
  background: 'radial-gradient(120% 90% at 30% 22%, rgba(255,255,255,.85), rgba(255,255,255,0) 55%), linear-gradient(155deg,#edf3fc,#acbed9 50%,#627691)',
  border: '1px solid rgba(108,170,245,.5)',
  boxShadow: '0 8px 18px -8px var(--t36, rgba(0,0,0,.5)), inset 0 1px 0 rgba(255,255,255,.7)',
};

export const votePillInactive: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  padding: '6px 13px', borderRadius: 20, cursor: 'pointer',
  fontFamily: 'Sora,sans-serif', fontSize: 13, color: 'var(--t23, #acb7cc)',
  background: 'var(--t59, rgba(218,229,247,.06))',
  border: '1px solid var(--t67, rgba(218,229,247,.15))',
};

export const reactPillActive: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '5px 11px', borderRadius: 18, cursor: 'pointer',
  fontFamily: 'Sora,sans-serif', fontSize: 12.5,
  color: 'var(--t6, #0d1525)',
  background: 'linear-gradient(155deg,#e3ebf8,#adbbd7)',
  border: '1px solid rgba(108,170,245,.5)',
  boxShadow: '0 6px 14px -6px var(--t35, rgba(0,0,0,.45)), inset 0 1px 0 rgba(255,255,255,.6)',
};

export const reactPillInactive: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '5px 11px', borderRadius: 18, cursor: 'pointer',
  fontFamily: 'Sora,sans-serif', fontSize: 12.5,
  color: 'var(--t18, #919cb3)',
  background: 'var(--t57, rgba(218,229,247,.04))',
  border: '1px solid var(--t63, rgba(218,229,247,.1))',
};

export const segActive: CSSProperties = {
  padding: '5px 13px', borderRadius: 8, cursor: 'pointer',
  fontFamily: 'Sora,sans-serif', fontSize: 12, color: '#16203a',
  background: 'linear-gradient(155deg,#e3ebf8,#adbbd7)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6)',
};

export const segInactive: CSSProperties = {
  padding: '5px 13px', borderRadius: 8, cursor: 'pointer',
  fontFamily: 'Sora,sans-serif', fontSize: 12, color: 'var(--t20, #9aa5bb)',
};

export const iconBtn: CSSProperties = {
  width: 36, height: 36, borderRadius: 11,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', flexShrink: 0,
  fontSize: 15, color: 'var(--t23, #acb7cc)',
  background: 'var(--t59, rgba(218,229,247,.06))',
  border: '1px solid var(--t66, rgba(218,229,247,.14))',
};
