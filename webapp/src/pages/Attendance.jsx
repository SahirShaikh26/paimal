import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import colors from '../theme';

const s = {
  h1: { fontSize:22, fontWeight:700, color:colors.navy, marginBottom:20 },
  card: { background:colors.white, borderRadius:10, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)' },
  btn: { padding:'8px 16px', background:colors.navy, color:colors.white, border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer' },
  badge: { display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600 },
  tabs: { display:'flex', gap:8, marginBottom:16 },
  tab: { padding:'7px 16px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer', border:`1px solid ${colors.border}`, background:colors.white, color:colors.text },
  tabActive: { background:colors.navy, color:colors.white, border:`1px solid ${colors.navy}` },
  meta: { fontSize:13, color:colors.textMuted },
  th: { textAlign:'left', padding:'8px 10px', fontSize:12, fontWeight:700, color:colors.textMuted, textTransform:'uppercase', letterSpacing:'.04em', borderBottom:`2px solid ${colors.border}` },
  td: { padding:'8px 10px', fontSize:13, color:colors.text, borderBottom:`1px solid ${colors.border}` },
};

const STATUS_STYLE = {
  in:     { background:colors.greenBg, color:colors.green, label:'Checked in' },
  out:    { background:colors.bgAlt, color:colors.textMuted, label:'Checked out' },
  leave:  { background:colors.blueBg, color:colors.blueDark, label:'On leave' },
  absent: { background:colors.redBg, color:colors.red, label:'Absent' },
};

const CELL_STYLE = {
  'P':  { background:colors.greenBg, color:colors.green },
  'P!': { background:colors.amberBg, color:colors.amber },
  'L':  { background:colors.blueBg, color:colors.blueDark },
  'H':  { background:colors.blueBg, color:colors.blueDark },
  'A':  { background:colors.redBg, color:colors.red },
  '':   { background:'transparent', color:colors.textFaint },
};

function useTicker(active) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [active]);
}

function duration(from) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 60000));
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
}

function getPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({});
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({}), // best-effort: check in without GPS if denied
      { timeout: 5000 }
    );
  });
}

export default function Attendance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canManage = ['Director', 'Manager'].includes(user?.role);
  const [tab, setTab] = useState(canManage ? 'today' : 'me');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const { data: mine } = useQuery({
    queryKey: ['attendance', 'me', month],
    queryFn: () => api.get(`/attendance/me?month=${month}`).then((r) => r.data),
  });
  const today = new Date().toISOString().split('T')[0];
  const todayRow = mine?.find((a) => a.date?.split('T')[0] === today);
  useTicker(todayRow?.check_in && !todayRow?.check_out);

  const { data: board } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => api.get('/attendance/today').then((r) => r.data),
    enabled: canManage,
    refetchInterval: 60000,
  });
  const { data: grid } = useQuery({
    queryKey: ['attendance', 'grid', month],
    queryFn: () => api.get(`/attendance/grid?month=${month}`).then((r) => r.data),
    enabled: canManage && tab === 'grid',
  });

  const checkin = useMutation({
    mutationFn: async () => {
      const pos = await getPosition();
      return api.post('/attendance/checkin', pos).then((r) => r.data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); toast.success('Checked in!'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });
  const checkout = useMutation({
    mutationFn: () => api.post('/attendance/checkout').then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); toast.success('Checked out!'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  return (
    <div>
      <h1 style={s.h1}>Attendance</h1>

      {/* Clock card */}
      <div style={{ ...s.card, marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:colors.navy }}>
            {todayRow?.check_in
              ? todayRow.check_out
                ? `Done for today — ${format(new Date(todayRow.check_in), 'HH:mm')} to ${format(new Date(todayRow.check_out), 'HH:mm')}`
                : `On the clock since ${format(new Date(todayRow.check_in), 'HH:mm')} · ${duration(todayRow.check_in)}`
              : 'Not checked in yet'}
          </div>
          <div style={s.meta}>{format(new Date(), 'EEEE, dd MMM yyyy')}</div>
        </div>
        {!todayRow?.check_in && (
          <button style={s.btn} onClick={() => checkin.mutate()} disabled={checkin.isPending}>
            {checkin.isPending ? 'Checking in…' : 'Check In'}
          </button>
        )}
        {todayRow?.check_in && !todayRow?.check_out && (
          <button style={{ ...s.btn, background:colors.red }} onClick={() => checkout.mutate()} disabled={checkout.isPending}>
            {checkout.isPending ? '…' : 'Check Out'}
          </button>
        )}
      </div>

      {canManage && (
        <div style={s.tabs}>
          {[['today', 'Today'], ['grid', 'Monthly Grid'], ['me', 'My Attendance']].map(([k, label]) => (
            <button key={k} style={{ ...s.tab, ...(tab === k ? s.tabActive : {}) }} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
      )}

      {/* Today board (managers) */}
      {canManage && tab === 'today' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 }}>
          {board?.map((p) => {
            const st = STATUS_STYLE[p.status] || STATUS_STYLE.absent;
            return (
              <div key={p.id} style={s.card}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:colors.navy }}>{p.name}</div>
                  <span style={{ ...s.badge, background:st.background, color:st.color }}>{st.label}</span>
                </div>
                {p.dept && <div style={s.meta}>{p.dept}{p.job_title ? ` · ${p.job_title}` : ''}</div>}
                {p.check_in && (
                  <div style={s.meta}>
                    In {format(new Date(p.check_in), 'HH:mm')}
                    {p.check_out ? ` → out ${format(new Date(p.check_out), 'HH:mm')}` : ''}
                    {p.late && <span style={{ ...s.badge, background:colors.amberBg, color:colors.amber, marginLeft:6, fontSize:11 }}>Late</span>}
                  </div>
                )}
                {p.shift_name && <div style={s.meta}>Shift: {p.shift_name} ({String(p.shift_start).slice(0, 5)})</div>}
                {p.location && <div style={s.meta}>📍 {p.location}</div>}
              </div>
            );
          })}
          {board?.length === 0 && <p style={{ color:colors.textFaint }}>No team members.</p>}
        </div>
      )}

      {/* Monthly grid (managers) */}
      {canManage && tab === 'grid' && (
        <div style={{ ...s.card, overflowX:'auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              style={{ padding:'6px 10px', border:`1px solid ${colors.borderInput}`, borderRadius:7, fontSize:13 }} />
            <div style={{ display:'flex', gap:10, fontSize:12, color:colors.textMuted, flexWrap:'wrap' }}>
              <span><span style={{ ...s.badge, ...CELL_STYLE.P, padding:'1px 7px' }}>P</span> Present</span>
              <span><span style={{ ...s.badge, ...CELL_STYLE['P!'], padding:'1px 7px' }}>P!</span> Late</span>
              <span><span style={{ ...s.badge, ...CELL_STYLE.L, padding:'1px 7px' }}>L</span> Leave</span>
              <span><span style={{ ...s.badge, ...CELL_STYLE.H, padding:'1px 7px' }}>H</span> Half-day</span>
              <span><span style={{ ...s.badge, ...CELL_STYLE.A, padding:'1px 7px' }}>A</span> Absent</span>
            </div>
          </div>
          <table style={{ borderCollapse:'collapse', width:'100%' }}>
            <thead>
              <tr>
                <th style={{ ...s.th, position:'sticky', left:0, background:colors.white }}>Employee</th>
                {grid?.days?.map((d) => <th key={d} style={{ ...s.th, padding:'8px 4px', textAlign:'center' }}>{Number(d.slice(8))}</th>)}
              </tr>
            </thead>
            <tbody>
              {grid?.grid?.map((row) => (
                <tr key={row.id}>
                  <td style={{ ...s.td, fontWeight:600, whiteSpace:'nowrap', position:'sticky', left:0, background:colors.white }}>{row.name}</td>
                  {row.cells.map((c, i) => (
                    <td key={i} style={{ ...s.td, padding:'4px 2px', textAlign:'center' }}>
                      {c && <span style={{ ...s.badge, ...CELL_STYLE[c], padding:'2px 6px', fontSize:11 }}>{c}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* My attendance list */}
      {tab === 'me' && (
        <div style={{ ...s.card, overflowX:'auto' }}>
          <div style={{ marginBottom:14 }}>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              style={{ padding:'6px 10px', border:`1px solid ${colors.borderInput}`, borderRadius:7, fontSize:13 }} />
          </div>
          <table style={{ borderCollapse:'collapse', width:'100%' }}>
            <thead>
              <tr><th style={s.th}>Date</th><th style={s.th}>Check In</th><th style={s.th}>Check Out</th><th style={s.th}>Hours</th><th style={s.th}>Location</th></tr>
            </thead>
            <tbody>
              {mine?.map((a) => {
                const hours = a.check_out ? ((new Date(a.check_out) - new Date(a.check_in)) / 3600000).toFixed(1) : '—';
                return (
                  <tr key={a.id}>
                    <td style={s.td}>{format(new Date(a.date), 'dd MMM (EEE)')}</td>
                    <td style={s.td}>{a.check_in ? format(new Date(a.check_in), 'HH:mm') : '—'}</td>
                    <td style={s.td}>{a.check_out ? format(new Date(a.check_out), 'HH:mm') : '—'}</td>
                    <td style={s.td}>{hours}</td>
                    <td style={s.td}>{a.location || '—'}</td>
                  </tr>
                );
              })}
              {mine?.length === 0 && <tr><td style={s.td} colSpan={5}>No records this month.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
