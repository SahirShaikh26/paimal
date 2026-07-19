import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format, addDays, startOfWeek } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import colors from '../theme';

const s = {
  h1: { fontSize:22, fontWeight:700, color:colors.navy, marginBottom:0 },
  card: { background:colors.white, borderRadius:10, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)' },
  btn: { padding:'8px 16px', background:colors.navy, color:colors.white, border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer' },
  btnGhost: { padding:'7px 14px', background:colors.white, color:colors.text, border:`1px solid ${colors.border}`, borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer' },
  th: { textAlign:'left', padding:'8px 10px', fontSize:12, fontWeight:700, color:colors.textMuted, textTransform:'uppercase', letterSpacing:'.04em', borderBottom:`2px solid ${colors.border}` },
  td: { padding:'6px 6px', fontSize:13, color:colors.text, borderBottom:`1px solid ${colors.border}`, verticalAlign:'top' },
  chip: { display:'block', width:'100%', textAlign:'left', fontSize:11, fontWeight:700, padding:'4px 7px', borderRadius:6, border:'none', cursor:'pointer', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  modal: { position:'fixed', inset:0, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  mcard: { background:colors.white, borderRadius:12, padding:32, width:'min(480px, calc(100vw - 32px))', maxHeight:'90vh', overflowY:'auto' },
  input: { width:'100%', padding:'9px 12px', border:`1px solid ${colors.borderInput}`, borderRadius:7, fontSize:14, marginBottom:12 },
  label: { display:'block', fontSize:13, fontWeight:600, color:colors.text, marginBottom:5 },
  row: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  meta: { fontSize:13, color:colors.textMuted },
};

const fmt = (d) => format(d, 'yyyy-MM-dd');
const t5 = (t) => String(t || '').slice(0, 5);

export default function Shifts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canManage = ['Director', 'Manager'].includes(user?.role);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [cellPick, setCellPick] = useState(null); // {user_id, user_name, date, current}
  const [repeatWeeks, setRepeatWeeks] = useState(0);
  const [tplModal, setTplModal] = useState(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const from = fmt(days[0]);
  const to = fmt(days[6]);

  const { data: templates } = useQuery({ queryKey:['shifts','templates'], queryFn:()=>api.get('/shifts/templates').then(r=>r.data) });
  const { data: assignments } = useQuery({
    queryKey:['shifts', from, to],
    queryFn:()=>api.get(`/shifts?from=${from}&to=${to}`).then(r=>r.data),
  });
  const { data: team } = useQuery({ queryKey:['engineers'], queryFn:()=>api.get('/engineers').then(r=>r.data), enabled: canManage });
  const { data: mine } = useQuery({
    queryKey:['shifts','me'],
    queryFn:()=>api.get('/shifts/me?days=14').then(r=>r.data),
    enabled: !canManage,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey:['shifts'] });

  const assign = useMutation({
    mutationFn: (d) => api.post('/shifts/assign', d).then(r=>r.data),
    onSuccess: () => { invalidate(); toast.success('Shift assigned'); setCellPick(null); setRepeatWeeks(0); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });
  const unassign = useMutation({
    mutationFn: (id) => api.delete(`/shifts/${id}`).then(r=>r.data),
    onSuccess: () => { invalidate(); toast.success('Cleared'); setCellPick(null); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });
  const saveTpl = useMutation({
    mutationFn: (d) => d.id ? api.put(`/shifts/templates/${d.id}`, d).then(r=>r.data) : api.post('/shifts/templates', d).then(r=>r.data),
    onSuccess: () => { invalidate(); toast.success('Saved!'); setTplModal(null); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });
  const removeTpl = useMutation({
    mutationFn: (id) => api.delete(`/shifts/templates/${id}`).then(r=>r.data),
    onSuccess: () => { invalidate(); toast.success('Removed'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const byUserDate = {};
  for (const a of assignments || []) {
    byUserDate[`${a.user_id}|${a.date}`] = a;
  }

  // Engineer view: personal upcoming list.
  if (!canManage) {
    return (
      <div>
        <h1 style={{ ...s.h1, marginBottom:20 }}>My Shifts</h1>
        <div style={{ display:'grid', gap:10, maxWidth:560 }}>
          {mine?.map((sh) => (
            <div key={sh.id} style={{ ...s.card, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px' }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:colors.navy }}>{format(new Date(sh.date), 'EEEE, dd MMM')}</div>
                <div style={s.meta}>{sh.name}</div>
              </div>
              <span style={{ fontSize:13, fontWeight:700, color:sh.color || colors.accent }}>{t5(sh.start_time)} – {t5(sh.end_time)}</span>
            </div>
          ))}
          {mine?.length === 0 && <p style={{ color:colors.textFaint }}>No upcoming shifts assigned.</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:12 }}>
        <h1 style={s.h1}>Shifts</h1>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button style={s.btnGhost} onClick={() => setWeekStart((w) => addDays(w, -7))}>‹ Prev</button>
          <span style={{ fontSize:14, fontWeight:700, color:colors.navy }}>
            {format(days[0], 'dd MMM')} – {format(days[6], 'dd MMM yyyy')}
          </span>
          <button style={s.btnGhost} onClick={() => setWeekStart((w) => addDays(w, 7))}>Next ›</button>
          <button style={s.btn} onClick={() => setTplModal({ name:'', start_time:'09:00', end_time:'18:00', color:'#1d4ed8' })}>+ Shift Template</button>
        </div>
      </div>

      {/* Templates strip */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        {templates?.map((t) => (
          <button key={t.id} style={{ ...s.btnGhost, borderLeft:`4px solid ${t.color}`, fontSize:12 }} onClick={() => setTplModal(t)}>
            {t.name} · {t5(t.start_time)}–{t5(t.end_time)}
          </button>
        ))}
        {templates?.length === 0 && <span style={s.meta}>No shift templates yet — create one to start scheduling.</span>}
      </div>

      {/* Week board */}
      <div style={{ ...s.card, overflowX:'auto', padding:12 }}>
        <table style={{ borderCollapse:'collapse', width:'100%', minWidth:760 }}>
          <thead>
            <tr>
              <th style={{ ...s.th, position:'sticky', left:0, background:colors.white }}>Employee</th>
              {days.map((d) => (
                <th key={fmt(d)} style={{ ...s.th, textAlign:'center' }}>
                  {format(d, 'EEE')}<br /><span style={{ fontWeight:500 }}>{format(d, 'dd MMM')}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {team?.filter((u) => u.active).map((u) => (
              <tr key={u.id}>
                <td style={{ ...s.td, fontWeight:600, whiteSpace:'nowrap', position:'sticky', left:0, background:colors.white }}>{u.name}</td>
                {days.map((d) => {
                  const date = fmt(d);
                  const a = byUserDate[`${u.id}|${date}`];
                  return (
                    <td key={date} style={{ ...s.td, minWidth:92 }}>
                      <button
                        style={{
                          ...s.chip,
                          background: a ? `${a.color}22` : colors.bgAlt,
                          color: a ? a.color : colors.textFaint,
                          minHeight:30,
                        }}
                        onClick={() => setCellPick({ user_id: u.id, user_name: u.name, date, current: a })}
                        title={a ? `${a.name} ${t5(a.start_time)}–${t5(a.end_time)}` : 'Assign shift'}
                      >
                        {a ? `${a.name} ${t5(a.start_time)}` : '+'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cell picker */}
      {cellPick && (
        <div style={s.modal} onClick={(e) => { if (e.target === e.currentTarget) setCellPick(null); }}>
          <div style={s.mcard}>
            <h2 style={{ fontSize:17, fontWeight:700, marginBottom:6 }}>{cellPick.user_name}</h2>
            <p style={{ ...s.meta, marginBottom:16 }}>{format(new Date(cellPick.date), 'EEEE, dd MMM yyyy')}</p>
            <div style={{ display:'grid', gap:8, marginBottom:16 }}>
              {templates?.map((t) => (
                <button key={t.id}
                  style={{ ...s.btnGhost, borderLeft:`4px solid ${t.color}`, textAlign:'left', ...(cellPick.current?.shift_template_id === t.id ? { background:colors.blueBg } : {}) }}
                  onClick={() => assign.mutate({ user_id: cellPick.user_id, shift_template_id: t.id, dates: [cellPick.date], repeat_weeks: repeatWeeks })}>
                  {t.name} · {t5(t.start_time)}–{t5(t.end_time)}
                </button>
              ))}
            </div>
            <label style={{ ...s.label, display:'flex', alignItems:'center', gap:8 }}>
              Repeat for
              <select value={repeatWeeks} onChange={(e) => setRepeatWeeks(Number(e.target.value))}
                style={{ padding:'4px 8px', border:`1px solid ${colors.borderInput}`, borderRadius:6 }}>
                {[0, 1, 2, 3, 4, 8, 12].map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
              more week(s)
            </label>
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              {cellPick.current && (
                <button style={{ ...s.btn, background:colors.red }} onClick={() => unassign.mutate(cellPick.current.id)}>Clear shift</button>
              )}
              <button style={{ ...s.btn, background:colors.bgAlt, color:colors.text, marginLeft:'auto' }} onClick={() => setCellPick(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Template modal */}
      {tplModal && (
        <div style={s.modal} onClick={(e) => { if (e.target === e.currentTarget) setTplModal(null); }}>
          <div style={s.mcard}>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>{tplModal.id ? 'Edit' : 'New'} Shift Template</h2>
            <form onSubmit={(e) => { e.preventDefault(); saveTpl.mutate(tplModal); }}>
              <label style={s.label}>Name *</label>
              <input style={s.input} value={tplModal.name} onChange={(e) => setTplModal((t) => ({ ...t, name: e.target.value }))} required placeholder="e.g. Morning" />
              <div style={s.row}>
                <div>
                  <label style={s.label}>Start *</label>
                  <input style={s.input} type="time" value={t5(tplModal.start_time)} onChange={(e) => setTplModal((t) => ({ ...t, start_time: e.target.value }))} required />
                </div>
                <div>
                  <label style={s.label}>End *</label>
                  <input style={s.input} type="time" value={t5(tplModal.end_time)} onChange={(e) => setTplModal((t) => ({ ...t, end_time: e.target.value }))} required />
                </div>
              </div>
              <label style={s.label}>Colour</label>
              <input style={{ ...s.input, height:42, padding:4 }} type="color" value={tplModal.color || '#1d4ed8'} onChange={(e) => setTplModal((t) => ({ ...t, color: e.target.value }))} />
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                {tplModal.id && (
                  <button type="button" style={{ ...s.btn, background:colors.red }} onClick={() => { removeTpl.mutate(tplModal.id); setTplModal(null); }}>Delete</button>
                )}
                <button type="button" style={{ ...s.btn, background:colors.bgAlt, color:colors.text, marginLeft:'auto' }} onClick={() => setTplModal(null)}>Cancel</button>
                <button type="submit" style={s.btn} disabled={saveTpl.isPending}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
