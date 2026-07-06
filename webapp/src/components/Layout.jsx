import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useIsMobile } from '../hooks/useIsMobile';
import colors from '../theme';
import { PaimalMark } from './PaimalMark';

const OWNER_EMAILS = (import.meta.env.VITE_OWNER_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

const NAV = [
  { to: '/',          label: 'Dashboard',    icon: '📊' },
  { to: '/logs',      label: 'Activity Logs', icon: '📋' },
  { to: '/logs/new',  label: 'Log Activity', icon: '✏️' },
  { to: '/projects',  label: 'Projects',     icon: '🗂️' },
  { to: '/assignments', label: 'Assignments', icon: '🧩', roles: ['Director', 'Manager'] },
  { to: '/schedule',  label: 'Schedule',     icon: '🗓️' },
  { to: '/tickets',   label: 'Support Tickets', icon: '🎫' },
  { to: '/quotes',    label: 'Quotes',       icon: '📝', roles: ['Director', 'Manager'] },
  { to: '/invoices',  label: 'Invoices',     icon: '🧾', roles: ['Director', 'Manager'] },
  { to: '/customers', label: 'Customers',    icon: '🏭' },
  { to: '/engineers', label: 'Team',         icon: '👷' },
  { to: '/analytics', label: 'Analytics',   icon: '📈' },
  { to: '/variance',  label: 'Planned vs Actual', icon: '🎯', roles: ['Director', 'Manager'] },
  { to: '/reports',   label: 'Reports',     icon: '📁' },
  { to: '/import',    label: 'Import Data', icon: '📥' },
  { to: '/digest',    label: 'Daily Digest', icon: '🧠', roles: ['Director', 'Manager'] },
  { to: '/billing',   label: 'Billing',     icon: '💳', roles: ['Director'] },
  { to: '/settings',  label: 'Settings',    icon: '⚙️', roles: ['Director'] },
  { to: '/status',    label: 'Status',      icon: '🩺', ownerOnly: true },
];

const navLink   = { display:'flex', alignItems:'center', gap:10, padding:'10px 20px', color:'rgba(255,255,255,.75)', textDecoration:'none', fontSize:14 };
const navActive = { background:'rgba(255,255,255,.15)', color:colors.white, borderRight:`3px solid ${colors.blueLight}` };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const closeSidebar = () => setSidebarOpen(false);
  const initials = (user?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

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
        background: colors.navy,
        color: colors.white,
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
        <div style={{ padding:'18px 20px 22px', fontSize:20, fontWeight:750, letterSpacing:'-.02em', borderBottom:'1px solid rgba(255,255,255,.12)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span className="pm-hover" style={{ display:'flex', alignItems:'center', gap:10 }}>
            <PaimalMark size={30} tile="#2B241B" glyph={colors.accent} />
            Paimal
          </span>
          {isMobile && (
            <button
              onClick={closeSidebar}
              style={{ background:'none', border:'none', color:'rgba(255,255,255,.7)', cursor:'pointer', fontSize:20, padding:0, lineHeight:1 }}
            >✕</button>
          )}
        </div>
        <nav style={{ flex:1, padding:'12px 0', overflowY:'auto' }}>
          {NAV.filter(({ roles, ownerOnly }) => {
            if (roles && !roles.includes(user?.role)) return false;
            if (ownerOnly && !OWNER_EMAILS.includes((user?.email || '').toLowerCase())) return false;
            return true;
          }).map(({ to, label, icon }) => (
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
          <div style={{ fontWeight:600, color:colors.white }}>{user?.name}</div>
          <div>{user?.role}</div>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <div style={{ background:colors.white, borderBottom:`1px solid ${colors.border}`, padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                style={{ background:'none', border:'none', cursor:'pointer', padding:'4px 6px', fontSize:22, color:colors.navy, lineHeight:1 }}
              >☰</button>
            )}
            <span className="pm-hover" style={{ display:'flex', alignItems:'center', gap:9, fontWeight:750, color:colors.navy, fontSize:17, letterSpacing:'-.02em' }}>
              <PaimalMark size={26} />
              Paimal
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <span style={{ fontSize:18, position:'relative' }} title="Notifications">🔔
              <span style={{ position:'absolute', top:-1, right:-1, width:7, height:7, borderRadius:'50%', background:colors.red }} />
            </span>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:colors.navy, color:colors.white, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, flexShrink:0 }}>{initials}</div>
              {!isMobile && (
                <div style={{ lineHeight:1.2 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:colors.textDark }}>{user?.name}</div>
                  <div style={{ fontSize:11, color:colors.textMuted }}>{user?.role}</div>
                </div>
              )}
            </div>
            <button
              style={{ padding:'6px 14px', background:colors.red, color:colors.white, border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 }}
              onClick={handleLogout}
            >Logout</button>
          </div>
        </div>
        <main style={{ flex:1, padding: isMobile ? '16px 12px' : 24, overflowY:'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
