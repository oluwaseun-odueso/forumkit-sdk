import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { ForumProvider } from './hooks/useForumState';
import { Studio } from './routes/Studio';
import { AuroraRoute } from './routes/AuroraRoute';
import { Assistant } from './routes/Assistant';

const NAV_LINK_BASE: React.CSSProperties = {
  fontFamily: 'Sora,sans-serif', fontSize: 11.5, letterSpacing: '.5px',
  padding: '4px 12px', borderRadius: 8, textDecoration: 'none',
  transition: 'background .15s, color .15s',
};

function NavStrip() {
  return (
    <nav aria-label="Treatment switcher" style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      zIndex: 100,
      display: 'flex', gap: 2, padding: '6px 10px',
      borderRadius: '0 0 14px 14px',
      background: 'rgba(9,13,23,.85)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(108,170,245,.12)',
      borderTop: 'none',
    }}>
      {[
        { to: '/', label: 'Studio' },
        { to: '/aurora', label: 'Aurora' },
        { to: '/assistant', label: 'Assistant' },
      ].map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            ...NAV_LINK_BASE,
            color: isActive ? '#e9eff8' : 'rgba(172,183,204,.6)',
            background: isActive ? 'rgba(108,170,245,.13)' : 'transparent',
          })}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ForumProvider>
        <NavStrip />
        <div style={{ position: 'fixed', inset: 0, top: 0 }}>
          <Routes>
            <Route path="/" element={<Studio />} />
            <Route path="/aurora" element={<AuroraRoute />} />
            <Route path="/assistant" element={<Assistant />} />
          </Routes>
        </div>
      </ForumProvider>
    </BrowserRouter>
  );
}
