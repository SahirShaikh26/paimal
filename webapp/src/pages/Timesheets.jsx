import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import colors from '../theme';

const s = {
  h1: { fontSize:22, fontWeight:700, color:colors.navy, marginBottom:0 },
  card: { background:colors.white, borderRadius:10, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)' },
  btn: { padding:'8px 16px', background:colors.navy, color:colors.white, border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer' },
  btnGhost: { padding:'7px 14px', background:colors.white, color:colors.text, border:`1px solid ${colors.border}`, borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer' },
  badge: { display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600 },
  select: { padding:'8px 12px', border:`1px solid ${colors.borderInput}`, borderRadius:7, fontSize:14, background:colors.white },
  th: { textAlign:'left', padding:'8px 10px', fontSize:12, fontWeight:700, color:colors.textMuted, textTransform:'uppercase', letterSpacing:'.04em', borderBottom:`2px solid ${colors.border}` },
  td: { padding:'8px 10px', fontSize:13, color:colors.text, borderBottom:`1px solid ${colors.border}` },
  meta: { fontSize:13, color:colors.textMuted },
};

function DayDetail({ days }) {
  if (!days?.length) return <p style={{ ...s.meta, padding:'8px 10px' }}>No activity in this period.</p>;
  return (
    <table style={{ borderCollapse:'collapse', width:'100%', background:colors.bgAlt, borderRadius:8 }}>
      <thead><tr>
        <th style={s.th}>Date</th><th style={s.th}>In</th><th style={s.th}>Out</th>
        <th style={s.th}>Attendance hrs</th><th style={s.th}>Logged hrs</th>
      </tr></thead>
      <tbody>
        {days.map((d) => (
          <tr key={d.date}>
            <td style={s.td}>{format(new Date(d.date), 'dd MMM (EEE)')}</td>
            <td style={s.td}>{d.check_in ? format(new Date(d.check_in), 'HH:mm') : '—'}</td>
            <td style={s.td}>{d.check_out ? format(new Date(d.check_out), 'HH:mm') : '—'}</td>
            <td style={s.td}>{d.attendance_hours || '—'}</td>
            <td style={s.td}>{d.activity_hours || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Timesheets() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canManage = ['Director', 'Manager'].includes(user?.role);
  const isDirector = user?.role === 'Director';
  const [periodStart, setPeriodStart] = useState('');
  const [expanded, setExpanded] = useState(null);

  const { data: periods } = useQuery({
    queryKey:['timesheets','periods'],
    queryFn:()=>api.get('/timesheets/periods?count=8').then(r=>r.data),
  });
  const period = periodStart || periods?.[0]?.start || '';

  const { data: sheet } = useQuery({
    queryKey:['timesheets','all',period],
    queryFn:()=>api.get(`/timesheets?period_start=${period}`).then(r=>r.data),
    enabled: canManage && !!period,
  });
  const { data: mySheet } = useQuery({
    queryKey:['timesheets','me',period],
    queryFn:()=>api.get(`/timesheets/me?period_start=${period}`).then(r=>r.data),
    enabled: !!period,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey:['timesheets'] });

  const approve = useMutation({
    mutationFn: (user_id) => api.post('/timesheets/approve', { user_id, period_start: period }).then(r=>r.data),
    onSuccess: () => { invalidate(); toast.success('Approved & locked'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });
  const reopen = useMutation({
    mutationFn: (id) => api.delete(`/timesheets/${id}`).then(r=>r.data),
    onSuccess: () => { invalidate(); toast.success('Reopened'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const exportCsv = async () => {
    try {
      const res = await api.get(`/timesheets/export?period_start=${period}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timesheets_${period}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:12 }}>
        <h1 style={s.h1}>Timesheets</h1>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <select style={s.select} value={period} onChange={(e) => { setPeriodStart(e.target.value); setExpanded(null); }}>
            {periods?.map((p) => <option key={p.start} value={p.start}>{p.label}</option>)}
          </select>
          {canManage && <button style={s.btnGhost} onClick={exportCsv}>Export CSV</button>}
        </div>
      </div>

      {canManage ? (
        <div style={{ ...s.card, overflowX:'auto' }}>
          <table style={{ borderCollapse:'collapse', width:'100%' }}>
            <thead><tr>
              <th style={s.th}>Employee</th><th style={s.th}>Attendance hrs</th><th style={s.th}>Logged hrs</th>
              <th style={s.th}>Regular</th><th style={s.th}>Overtime</th><th style={s.th}>Status</th><th style={s.th}></th>
            </tr></thead>
            <tbody>
              {sheet?.rows?.map((r) => (
                <>
                  <tr key={r.user_id} style={{ cursor:'pointer' }} onClick={() => setExpanded(expanded === r.user_id ? null : r.user_id)}>
                    <td style={{ ...s.td, fontWeight:600 }}>{expanded === r.user_id ? '▾ ' : '▸ '}{r.name}</td>
                    <td style={s.td}>{r.attendance_hours}</td>
                    <td style={s.td}>{r.activity_hours}</td>
                    <td style={s.td}>{r.regular_hours}</td>
                    <td style={{ ...s.td, color: Number(r.overtime_hours) > 0 ? colors.amber : colors.text, fontWeight: Number(r.overtime_hours) > 0 ? 700 : 400 }}>{r.overtime_hours}</td>
                    <td style={s.td}>
                      {r.approved
                        ? <span style={{ ...s.badge, background:colors.greenBg, color:colors.green }} title={`by ${r.approved_by} · ${r.approved_at ? format(new Date(r.approved_at), 'dd MMM HH:mm') : ''}`}>Approved</span>
                        : <span style={{ ...s.badge, background:colors.amberBg, color:colors.amber }}>Open</span>}
                    </td>
                    <td style={s.td} onClick={(e) => e.stopPropagation()}>
                      {!r.approved && (
                        <button style={{ ...s.btnGhost, padding:'5px 12px', fontSize:12 }} onClick={() => approve.mutate(r.user_id)} disabled={approve.isPending}>
                          Approve
                        </button>
                      )}
                      {r.approved && isDirector && (
                        <button style={{ ...s.btnGhost, padding:'5px 12px', fontSize:12, color:colors.red }} onClick={() => reopen.mutate(r.timesheet_id)}>
                          Reopen
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === r.user_id && (
                    <tr key={`${r.user_id}-detail`}>
                      <td colSpan={7} style={{ padding:'4px 10px 14px' }}><DayDetail days={r.days} /></td>
                    </tr>
                  )}
                </>
              ))}
              {sheet?.rows?.length === 0 && <tr><td style={s.td} colSpan={7}>No team members.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={s.card}>
          <div style={{ display:'flex', gap:24, marginBottom:16, flexWrap:'wrap' }}>
            {[['Attendance hrs', mySheet?.attendance_hours], ['Logged hrs', mySheet?.activity_hours],
              ['Regular', mySheet?.regular_hours], ['Overtime', mySheet?.overtime_hours]].map(([label, val]) => (
              <div key={label}>
                <div style={s.meta}>{label}</div>
                <div style={{ fontSize:22, fontWeight:800, color:colors.navy }}>{val ?? '—'}</div>
              </div>
            ))}
            <div>
              <div style={s.meta}>Status</div>
              {mySheet?.approved
                ? <span style={{ ...s.badge, background:colors.greenBg, color:colors.green }}>Approved</span>
                : <span style={{ ...s.badge, background:colors.amberBg, color:colors.amber }}>Open</span>}
            </div>
          </div>
          <DayDetail days={mySheet?.days} />
        </div>
      )}
    </div>
  );
}
