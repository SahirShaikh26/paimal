import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import colors from '../theme';
import MonthGrid from '../components/MonthGrid';

const s = {
  h1: { fontSize:22, fontWeight:700, color:colors.navy, marginBottom:20 },
  card: { background:colors.white, borderRadius:10, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)' },
  btn: { padding:'8px 16px', background:colors.navy, color:colors.white, border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer' },
  btnGhost: { padding:'7px 14px', background:colors.white, color:colors.text, border:`1px solid ${colors.border}`, borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer' },
  badge: { display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600 },
  tabs: { display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' },
  tab: { padding:'7px 16px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer', border:`1px solid ${colors.border}`, background:colors.white, color:colors.text },
  tabActive: { background:colors.navy, color:colors.white, border:`1px solid ${colors.navy}` },
  meta: { fontSize:13, color:colors.textMuted },
  modal: { position:'fixed', inset:0, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  mcard: { background:colors.white, borderRadius:12, padding:32, width:'min(480px, calc(100vw - 32px))', maxHeight:'90vh', overflowY:'auto' },
  input: { width:'100%', padding:'9px 12px', border:`1px solid ${colors.borderInput}`, borderRadius:7, fontSize:14, marginBottom:12 },
  label: { display:'block', fontSize:13, fontWeight:600, color:colors.text, marginBottom:5 },
  row: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  th: { textAlign:'left', padding:'8px 10px', fontSize:12, fontWeight:700, color:colors.textMuted, textTransform:'uppercase', letterSpacing:'.04em', borderBottom:`2px solid ${colors.border}` },
  td: { padding:'8px 10px', fontSize:13, color:colors.text, borderBottom:`1px solid ${colors.border}` },
};

const STATUS_STYLE = {
  Pending:  { background:colors.amberBg, color:colors.amber },
  Approved: { background:colors.greenBg, color:colors.green },
  Rejected: { background:colors.redBg, color:colors.red },
  Cancelled:{ background:colors.bgAlt, color:colors.textMuted },
};

const EMPTY = { leave_type_id:'', start_date:'', end_date:'', half_day:false, reason:'' };

export default function Leave() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canManage = ['Director', 'Manager'].includes(user?.role);
  const isDirector = user?.role === 'Director';
  const [tab, setTab] = useState('my');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [review, setReview] = useState(null); // {request, status}
  const [comment, setComment] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [typeModal, setTypeModal] = useState(null); // leave-type form

  const { data: types } = useQuery({ queryKey:['leave','types'], queryFn:()=>api.get('/leave/types').then(r=>r.data) });
  const { data: balances } = useQuery({ queryKey:['leave','balances'], queryFn:()=>api.get('/leave/balances').then(r=>r.data) });
  const { data: requests } = useQuery({ queryKey:['leave','requests'], queryFn:()=>api.get('/leave/requests').then(r=>r.data) });
  const { data: calendar } = useQuery({
    queryKey:['leave','calendar',month],
    queryFn:()=>api.get(`/leave/calendar?month=${month}`).then(r=>r.data),
    enabled: tab === 'calendar',
  });
  const { data: team } = useQuery({
    queryKey:['engineers'],
    queryFn:()=>api.get('/engineers').then(r=>r.data),
    enabled: isDirector && tab === 'types',
  });

  const invalidate = () => qc.invalidateQueries({ queryKey:['leave'] });

  const request = useMutation({
    mutationFn: (d) => api.post('/leave/requests', d).then(r=>r.data),
    onSuccess: () => { invalidate(); toast.success('Leave requested!'); setModal(false); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });
  const doReview = useMutation({
    mutationFn: ({ id, status, comment: c }) => api.put(`/leave/requests/${id}/review`, { status, comment: c }).then(r=>r.data),
    onSuccess: (d) => { invalidate(); toast.success(d.status); setReview(null); setComment(''); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });
  const cancel = useMutation({
    mutationFn: (id) => api.put(`/leave/requests/${id}/cancel`).then(r=>r.data),
    onSuccess: () => { invalidate(); toast.success('Cancelled'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });
  const saveType = useMutation({
    mutationFn: (d) => d.id ? api.put(`/leave/types/${d.id}`, d).then(r=>r.data) : api.post('/leave/types', d).then(r=>r.data),
    onSuccess: () => { invalidate(); toast.success('Saved!'); setTypeModal(null); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });
  const removeType = useMutation({
    mutationFn: (id) => api.delete(`/leave/types/${id}`).then(r=>r.data),
    onSuccess: () => { invalidate(); toast.success('Removed'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });
  const adjust = useMutation({
    mutationFn: (d) => api.post('/leave/adjustments', d).then(r=>r.data),
    onSuccess: () => { invalidate(); toast.success('Adjustment added'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const pending = requests?.filter((r) => r.status === 'Pending' && r.user_id !== user?.id) || [];
  const myRequests = requests?.filter((r) => r.user_id === user?.id) || [];

  const tabs = [
    ['my', 'My Leave'],
    ...(canManage ? [['approvals', `Approvals${pending.length ? ` (${pending.length})` : ''}`]] : []),
    ['calendar', 'Calendar'],
    ...(isDirector ? [['types', 'Types & Adjustments']] : []),
  ];

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h1 style={{ ...s.h1, marginBottom:0 }}>Leave</h1>
        <button style={s.btn} onClick={() => { setForm(EMPTY); setModal(true); }}>+ Request Leave</button>
      </div>

      <div style={s.tabs}>
        {tabs.map(([k, label]) => (
          <button key={k} style={{ ...s.tab, ...(tab === k ? s.tabActive : {}) }} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'my' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:20 }}>
            {balances?.map((b) => (
              <div key={b.leave_type_id} style={s.card}>
                <div style={{ fontSize:13, fontWeight:700, color:colors.navy }}>{b.name}</div>
                <div style={{ fontSize:26, fontWeight:800, color:colors.accent, margin:'6px 0 2px' }}>{Number(b.balance)}</div>
                <div style={s.meta}>of {Number(b.entitled)} left · {Number(b.used)} used{!b.paid ? ' · unpaid' : ''}</div>
              </div>
            ))}
          </div>
          <div style={{ ...s.card, overflowX:'auto' }}>
            <table style={{ borderCollapse:'collapse', width:'100%' }}>
              <thead><tr><th style={s.th}>Type</th><th style={s.th}>Dates</th><th style={s.th}>Days</th><th style={s.th}>Status</th><th style={s.th}>Reviewer</th><th style={s.th}></th></tr></thead>
              <tbody>
                {myRequests.map((r) => (
                  <tr key={r.id}>
                    <td style={s.td}>{r.type_name}</td>
                    <td style={s.td}>{format(new Date(r.start_date), 'dd MMM')}{r.end_date !== r.start_date ? ` → ${format(new Date(r.end_date), 'dd MMM')}` : ''}{r.half_day ? ' (half)' : ''}</td>
                    <td style={s.td}>{Number(r.days)}</td>
                    <td style={s.td}><span style={{ ...s.badge, ...STATUS_STYLE[r.status] }}>{r.status}</span></td>
                    <td style={s.td}>{r.reviewer_name || '—'}{r.review_comment ? ` · “${r.review_comment}”` : ''}</td>
                    <td style={s.td}>
                      {r.status === 'Pending' && (
                        <button style={{ ...s.btnGhost, padding:'4px 10px', fontSize:12 }} onClick={() => cancel.mutate(r.id)}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
                {myRequests.length === 0 && <tr><td style={s.td} colSpan={6}>No leave requests yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'approvals' && canManage && (
        <div style={{ display:'grid', gap:12 }}>
          {pending.map((r) => (
            <div key={r.id} style={{ ...s.card, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:colors.navy }}>{r.user_name} — {r.type_name}</div>
                <div style={s.meta}>
                  {format(new Date(r.start_date), 'dd MMM')}{r.end_date !== r.start_date ? ` → ${format(new Date(r.end_date), 'dd MMM')}` : ''}
                  {r.half_day ? ' (half-day)' : ''} · {Number(r.days)} day(s)
                </div>
                {r.reason && <div style={s.meta}>“{r.reason}”</div>}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button style={{ ...s.btn, background:colors.green }} onClick={() => setReview({ request: r, status: 'Approved' })}>Approve</button>
                <button style={{ ...s.btn, background:colors.red }} onClick={() => setReview({ request: r, status: 'Rejected' })}>Reject</button>
              </div>
            </div>
          ))}
          {pending.length === 0 && <p style={{ color:colors.textFaint }}>Nothing waiting for approval.</p>}
        </div>
      )}

      {tab === 'calendar' && (
        <div style={s.card}>
          <MonthGrid month={month} onMonthChange={setMonth} renderDay={(date) => (
            <>
              {calendar?.filter((l) => date >= l.start_date && date <= l.end_date).map((l) => (
                <div key={l.id} title={`${l.name} — ${l.type_name}`} style={{
                  fontSize:11, fontWeight:600, padding:'1px 5px', borderRadius:5, marginBottom:2,
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                  background: l.user_id === user?.id ? colors.blueBg : colors.bgAlt,
                  color: l.user_id === user?.id ? colors.blueDark : colors.text,
                }}>
                  {l.name.split(' ')[0]}{l.half_day ? ' ½' : ''}
                </div>
              ))}
            </>
          )} />
        </div>
      )}

      {tab === 'types' && isDirector && (
        <div style={{ display:'grid', gap:20 }}>
          <div style={{ ...s.card, overflowX:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ fontSize:15, fontWeight:700, color:colors.navy }}>Leave Types</div>
              <button style={s.btnGhost} onClick={() => setTypeModal({ name:'', code:'', annual_quota:0, paid:true })}>+ Add Type</button>
            </div>
            <table style={{ borderCollapse:'collapse', width:'100%' }}>
              <thead><tr><th style={s.th}>Name</th><th style={s.th}>Code</th><th style={s.th}>Annual Quota</th><th style={s.th}>Paid</th><th style={s.th}></th></tr></thead>
              <tbody>
                {types?.map((t) => (
                  <tr key={t.id}>
                    <td style={s.td}>{t.name}</td>
                    <td style={s.td}>{t.code || '—'}</td>
                    <td style={s.td}>{Number(t.annual_quota)}</td>
                    <td style={s.td}>{t.paid ? 'Yes' : 'No'}</td>
                    <td style={s.td}>
                      <button style={{ ...s.btnGhost, padding:'4px 10px', fontSize:12, marginRight:6 }} onClick={() => setTypeModal(t)}>Edit</button>
                      <button style={{ ...s.btnGhost, padding:'4px 10px', fontSize:12, color:colors.red }} onClick={() => removeType.mutate(t.id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={s.card}>
            <div style={{ fontSize:15, fontWeight:700, color:colors.navy, marginBottom:12 }}>Balance Adjustment</div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              adjust.mutate({
                user_id: fd.get('user_id'), leave_type_id: fd.get('leave_type_id'),
                delta_days: Number(fd.get('delta_days')), note: fd.get('note'),
              });
              e.target.reset();
            }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 120px 1fr auto', gap:10, alignItems:'end' }}>
                <div><label style={s.label}>Employee</label>
                  <select name="user_id" required style={{ ...s.input, marginBottom:0 }}>
                    <option value="">Select…</option>
                    {team?.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select></div>
                <div><label style={s.label}>Type</label>
                  <select name="leave_type_id" required style={{ ...s.input, marginBottom:0 }}>
                    <option value="">Select…</option>
                    {types?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select></div>
                <div><label style={s.label}>± Days</label>
                  <input name="delta_days" type="number" step="0.5" required style={{ ...s.input, marginBottom:0 }} /></div>
                <div><label style={s.label}>Note</label>
                  <input name="note" style={{ ...s.input, marginBottom:0 }} placeholder="e.g. carry-forward" /></div>
                <button type="submit" style={s.btn}>Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request modal */}
      {modal && (
        <div style={s.modal} onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
          <div style={s.mcard}>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>Request Leave</h2>
            <form onSubmit={(e) => { e.preventDefault(); request.mutate(form); }}>
              <label style={s.label}>Leave Type *</label>
              <select style={s.input} value={form.leave_type_id} onChange={set('leave_type_id')} required>
                <option value="">Select…</option>
                {types?.map((t) => {
                  const bal = balances?.find((b) => b.leave_type_id === t.id);
                  return <option key={t.id} value={t.id}>{t.name}{bal ? ` (${Number(bal.balance)} left)` : ''}</option>;
                })}
              </select>
              <label style={{ ...s.label, display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <input type="checkbox" checked={form.half_day} onChange={set('half_day')} /> Half day
              </label>
              <div style={s.row}>
                <div>
                  <label style={s.label}>{form.half_day ? 'Date *' : 'From *'}</label>
                  <input style={s.input} type="date" value={form.start_date} onChange={set('start_date')} required />
                </div>
                {!form.half_day && (
                  <div>
                    <label style={s.label}>To</label>
                    <input style={s.input} type="date" value={form.end_date} min={form.start_date} onChange={set('end_date')} />
                  </div>
                )}
              </div>
              <label style={s.label}>Reason</label>
              <input style={s.input} value={form.reason} onChange={set('reason')} placeholder="Optional" />
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button type="button" style={{ ...s.btn, background:colors.bgAlt, color:colors.text }} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" style={s.btn} disabled={request.isPending}>{request.isPending ? 'Submitting…' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review modal */}
      {review && (
        <div style={s.modal} onClick={(e) => { if (e.target === e.currentTarget) setReview(null); }}>
          <div style={s.mcard}>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>{review.status === 'Approved' ? 'Approve' : 'Reject'} leave?</h2>
            <p style={{ ...s.meta, marginBottom:16 }}>
              {review.request.user_name} — {review.request.type_name}, {Number(review.request.days)} day(s)
            </p>
            <label style={s.label}>Comment</label>
            <input style={s.input} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional" />
            <div style={{ display:'flex', gap:10 }}>
              <button style={{ ...s.btn, background:colors.bgAlt, color:colors.text }} onClick={() => setReview(null)}>Back</button>
              <button
                style={{ ...s.btn, background: review.status === 'Approved' ? colors.green : colors.red }}
                disabled={doReview.isPending}
                onClick={() => doReview.mutate({ id: review.request.id, status: review.status, comment })}
              >
                Confirm {review.status === 'Approved' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave-type modal */}
      {typeModal && (
        <div style={s.modal} onClick={(e) => { if (e.target === e.currentTarget) setTypeModal(null); }}>
          <div style={s.mcard}>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>{typeModal.id ? 'Edit' : 'New'} Leave Type</h2>
            <form onSubmit={(e) => { e.preventDefault(); saveType.mutate(typeModal); }}>
              <label style={s.label}>Name *</label>
              <input style={s.input} value={typeModal.name} onChange={(e) => setTypeModal((t) => ({ ...t, name: e.target.value }))} required />
              <div style={s.row}>
                <div>
                  <label style={s.label}>Code</label>
                  <input style={s.input} value={typeModal.code || ''} onChange={(e) => setTypeModal((t) => ({ ...t, code: e.target.value }))} />
                </div>
                <div>
                  <label style={s.label}>Annual Quota</label>
                  <input style={s.input} type="number" step="0.5" value={typeModal.annual_quota} onChange={(e) => setTypeModal((t) => ({ ...t, annual_quota: e.target.value }))} />
                </div>
              </div>
              <label style={{ ...s.label, display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <input type="checkbox" checked={!!typeModal.paid} onChange={(e) => setTypeModal((t) => ({ ...t, paid: e.target.checked }))} /> Paid leave (deducts balance)
              </label>
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button type="button" style={{ ...s.btn, background:colors.bgAlt, color:colors.text }} onClick={() => setTypeModal(null)}>Cancel</button>
                <button type="submit" style={s.btn} disabled={saveType.isPending}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
