import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import colors from '../theme';

const card = { background:colors.white, borderRadius:14, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)' };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// Small QR-code-style glyph (three finder squares) — echoes the mobile Home card.
function QrGlyph() {
  const finder = { width:18, height:18, border:`2.5px solid rgba(255,255,255,.9)`, borderRadius:3, display:'flex', alignItems:'center', justifyContent:'center' };
  const dot = { width:5, height:5, background:'rgba(255,255,255,.9)' };
  const sq = (key) => <div key={key} style={finder}><div style={dot} /></div>;
  return (
    <div style={{ width:44, height:44, display:'flex', flexDirection:'column', justifyContent:'space-between', flexShrink:0 }}>
      <div style={{ display:'flex', justifyContent:'space-between' }}>{sq('a')}{sq('b')}</div>
      <div style={{ display:'flex', justifyContent:'space-between' }}>{sq('c')}<div style={{ width:18, height:18 }} /></div>
    </div>
  );
}

// Pure-CSS bar chart — avoids pulling the 150 kB-gzip recharts bundle onto the
// Dashboard (recharts stays lazy-loaded on Analytics for the richer charts).
function BillingBars({ data }) {
  const max = Math.max(...data.map((d) => Number(d.billing) || 0), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:10, height:220, paddingTop:8 }}>
      {data.map((d) => {
        const val = Number(d.billing) || 0;
        const h = Math.max((val / max) * 170, 2);
        const label = `₹${val.toLocaleString('en-IN')}`;
        return (
          <div key={d.month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6, minWidth:0 }}>
            <div style={{ fontSize:11, color:colors.textMuted, fontWeight:600, whiteSpace:'nowrap' }}>{label}</div>
            <div
              title={`${d.month}: ${label}`}
              style={{ width:'100%', maxWidth:48, height:h, background:`linear-gradient(180deg, ${colors.blueLight}, ${colors.blue})`, borderRadius:'4px 4px 0 0', transition:'height .3s ease' }}
            />
            <div style={{ fontSize:11, color:colors.textMuted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%' }}>{d.month}</div>
          </div>
        );
      })}
    </div>
  );
}

function MiniStat({ value, label, color = colors.navy }) {
  return (
    <div style={{ ...card, padding:'16px 10px', textAlign:'center', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
      <div style={{ fontSize:24, fontWeight:800, color }}>{value ?? '—'}</div>
      <div style={{ fontSize:12, color:colors.textMuted, marginTop:4 }}>{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');
  const dateFrom = format(startOfMonth(new Date()), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['reports-summary', dateFrom],
    queryFn: () => api.get('/reports/summary', { params: { date_from: dateFrom } }).then(r => r.data),
  });
  const { data: maintenanceDue } = useQuery({
    queryKey: ['maintenance-due'],
    queryFn: () => api.get('/reports/maintenance-due').then(r => r.data),
  });
  const { data: todayLogs } = useQuery({
    queryKey: ['logs-today', today],
    queryFn: () => api.get('/logs', { params: { date_from: today, date_to: today } }).then(r => r.data?.data || []),
  });
  const { data: visits } = useQuery({
    queryKey: ['visits-today'],
    queryFn: () => api.get('/visits', { params: { date: 'today', status: 'Scheduled' } }).then(r => r.data || []),
  });

  const t = data?.totals;
  const initials = (user?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const hoursToday = (todayLogs || []).reduce((s, l) => s + (Number(l.hours) || 0), 0);
  const visitCount = (visits || []).length;

  const TILES = [
    { label:'Log Activity',  icon:'✏️', bg:colors.tileBlue,    to:'/logs/new' },
    { label:'Activity Logs', icon:'📋', bg:colors.tileAmber,   to:'/logs' },
    { label:'Schedule',      icon:'🗓️', bg:colors.tileGreen,   to:'/schedule' },
    { label:'Projects',      icon:'🗂️', bg:colors.tileIndigo,  to:'/projects' },
    { label:'Analytics',     icon:'📊', bg:colors.tileFuchsia, to:'/analytics' },
    { label:'Customers',     icon:'🏭', bg:colors.tileRose,    to:'/customers' },
    { label:'Reports',       icon:'📁', bg:colors.tileBlue,    to:'/reports' },
    { label:'Import Data',   icon:'📥', bg:colors.tileAmber,   to:'/import', roles:['Director','Manager'] },
  ];
  const tiles = TILES.filter((x) => !x.roles || x.roles.includes(user?.role));

  return (
    <div style={{ maxWidth:1100 }}>
      {/* Profile greeting hero — mirrors the mobile Home card */}
      <div style={{ display:'flex', alignItems:'center', gap:16, background:`linear-gradient(135deg, ${colors.navy}, #33291D)`, borderRadius:18, padding:'22px 24px', boxShadow:'0 6px 18px rgba(32,28,22,.28)' }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(255,255,255,.92)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ fontSize:24, fontWeight:800, color:colors.navy }}>{initials}</span>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ color:colors.orange, fontSize:19, fontWeight:800 }}>{greeting()}</div>
          <div style={{ color:colors.white, fontSize:22, fontWeight:800, marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{(user?.name || 'User').toUpperCase()}</div>
          <div style={{ color:'rgba(255,255,255,.75)', fontSize:13, fontWeight:600, marginTop:2 }}>{(user?.job_title || user?.role || '').toUpperCase()}</div>
        </div>
        <QrGlyph />
      </div>

      {/* Hours logged today + Today's visits */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16, marginTop:16 }}>
        <div style={{ ...card, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:15, color:colors.textDark, fontWeight:600 }}>Hours Logged</div>
            <div style={{ fontSize:12, color:colors.textMuted, marginTop:3 }}>{format(new Date(), 'EEE, MMM d').toUpperCase()}</div>
          </div>
          <div style={{ fontSize:26, fontWeight:800, color:colors.blue }}>{hoursToday.toFixed(2)} <span style={{ fontSize:14, fontWeight:700, color:colors.textMuted }}>Hrs</span></div>
        </div>
        <div
          onClick={() => visitCount && navigate('/schedule')}
          style={{ ...card, display:'flex', alignItems:'center', justifyContent:'space-between', cursor: visitCount ? 'pointer' : 'default' }}
        >
          <div style={{ fontSize:14.5, color:colors.textDark, fontWeight:600 }}>🗓️  Today's Scheduled Visits</div>
          <div style={{ minWidth:28, height:28, borderRadius:14, background:colors.red, color:colors.white, fontWeight:800, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 8px' }}>{visitCount}</div>
        </div>
      </div>

      {isLoading ? <p style={{ marginTop:24 }}>Loading…</p> : (
        <>
          {/* Month-to-date mini stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14, marginTop:16 }}>
            <MiniStat value={t?.total_logs} label="Logs (MTD)" />
            <MiniStat value={t?.total_hours != null ? Number(t.total_hours).toFixed(0) : 0} label="Hours" color={colors.green} />
            <MiniStat value={t?.total_billing != null ? `₹${Number(t.total_billing).toLocaleString('en-IN')}` : '₹0'} label="Billing" color={colors.amber} />
            <MiniStat value={t?.active_engineers} label="Engineers" color={colors.purple} />
            <MiniStat value={t?.customers_served} label="Customers" color={colors.cyan} />
          </div>

          {/* Quick-action tile grid — the mobile Home signature */}
          <h2 style={{ fontSize:15, fontWeight:700, color:colors.navy, margin:'26px 0 14px' }}>Quick Actions</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:16 }}>
            {tiles.map((tile) => (
              <button
                key={tile.label}
                onClick={() => navigate(tile.to)}
                style={{ ...card, padding:'18px 8px', display:'flex', flexDirection:'column', alignItems:'center', gap:10, border:'none', cursor:'pointer', transition:'transform .12s ease, box-shadow .12s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.08)'; }}
              >
                <div style={{ width:56, height:56, borderRadius:16, background:tile.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>{tile.icon}</div>
                <span style={{ fontSize:13, color:colors.textDark, fontWeight:600, textAlign:'center' }}>{tile.label}</span>
              </button>
            ))}
          </div>

          {data?.by_month?.length > 0 && (
            <div style={{ ...card, marginTop:26 }}>
              <h2 style={{ fontSize:16, fontWeight:700, marginBottom:16, color:colors.navy }}>Monthly Billing (₹)</h2>
              <BillingBars data={data.by_month} />
            </div>
          )}

          {maintenanceDue?.length > 0 && (
            <div style={{ ...card, marginTop:20, borderLeft:`3px solid ${colors.amber}` }}>
              <h2 style={{ fontSize:16, fontWeight:700, marginBottom:12, color:colors.navy }}>⚠️ Machines Due for Service</h2>
              {maintenanceDue.map((m) => (
                <div key={m.id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:`1px solid ${colors.bgAlt}`, fontSize:13.5 }}>
                  <span>{m.machine} — {m.customer}</span>
                  <span style={{ color:colors.amber, fontWeight:600 }}>Warranty expires {format(new Date(m.warranty_until), 'MMM d, yyyy')}</span>
                </div>
              ))}
            </div>
          )}

          {data?.by_engineer?.length > 0 && (
            <div style={{ ...card, marginTop:20 }}>
              <h2 style={{ fontSize:16, fontWeight:700, marginBottom:12, color:colors.navy }}>Engineer Performance</h2>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
                  <thead>
                    <tr style={{ borderBottom:`2px solid ${colors.border}` }}>
                      {['Engineer','Logs','Hours','Billing'].map(h => (
                        <th key={h} style={{ textAlign:'left', padding:'8px 12px', color:colors.textMuted, fontWeight:600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_engineer.map((e) => (
                      <tr key={e.engineer_id} style={{ borderBottom:`1px solid ${colors.bgAlt}` }}>
                        <td style={{ padding:'8px 12px', fontWeight:500 }}>{e.name}</td>
                        <td style={{ padding:'8px 12px' }}>{e.logs}</td>
                        <td style={{ padding:'8px 12px' }}>{Number(e.hours||0).toFixed(1)}</td>
                        <td style={{ padding:'8px 12px' }}>₹{Number(e.billing||0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
