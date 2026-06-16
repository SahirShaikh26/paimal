import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useIsMobile } from '../hooks/useIsMobile';

const NAV = [
  { to: '/',          label: 'Dashboard',    icon: '📊' },
  { to: '/logs',      label: 'Activity Logs', icon: '📋' },
  { to: '/logs/new',  label: 'Log Activity', icon: '✏️' },
  { to: '/projects',  label: 'Projects',     icon: '🗂️' },
  { to: '/customers', label: 'Customers',    icon: '🏭' },
  { to: '/engineers', label: 'Team',         icon: '👷' },
  { to: '/analytics', label: 'Analytics',   icon: '📈' },
  { to: '/reports',   label: 'Reports',     icon: '📁' },
  { to: '/import',    label: 'Import Data', icon: '📥' },
];

const navLink   = { display:'flex', alignItems:'center', gap:10, padding:'10px 20px', color:'rgba(255,255,255,.75)', textDecoration:'none', fontSize:14 };
const navActive = { background:'rgba(255,255,255,.15)', color:'#fff', borderRight:'3px solid #60a5fa' };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:40 }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: '#1e3a5f',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        padding: '0 0 16px',
        flexShrink: 0,
        ...(isMobile ? {
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-220px)',
          transition: 'transform 0.25s ease',
        } : {}),
      }}>
        <div style={{ padding:'20px 20px 24px', fontSize:20, fontWeight:700, letterSpacing:1, borderBottom:'1px solid rgba(255,255,255,.15)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>⚡ FieldPilot</span>
          {isMobile && (
            <button
              onClick={closeSidebar}
              style={{ background:'none', border:'none', color:'rgba(255,255,255,.7)', cursor:'pointer', fontSize:20, padding:0, lineHeight:1 }}
            >✕</button>
          )}
        </div>
        <nav style={{ flex:1, padding:'12px 0', overflowY:'auto' }}>
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={isMobile ? closeSidebar : undefined}
              style={({ isActive }) => ({ ...navLink, ...(isActive ? navActive : {}) })}
            >
              <span>{icon}</span>{label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding:'12px 20px', borderTop:'1px solid rgba(255,255,255,.15)', fontSize:13, color:'rgba(255,255,255,.7)' }}>
          <div style={{ fontWeight:600, color:'#fff' }}>{user?.name}</div>
          <div>{user?.role}</div>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                style={{ background:'none', border:'none', cursor:'pointer', padding:'4px 6px', fontSize:22, color:'#1e3a5f', lineHeight:1 }}
              >☰</button>
            )}
            <span style={{ fontWeight:600, color:'#1e3a5f', fontSize:15 }}>FieldPilot</span>
          </div>
          <button
            style={{ padding:'6px 14px', background:'#ef4444', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:13 }}
            onClick={handleLogout}
          >Logout</button>
        </div>
        <main style={{ flex:1, padding: isMobile ? '16px 12px' : 24, overflowY:'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
