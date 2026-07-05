import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import colors from '../theme';

const PRIORITY_BG = { Low: colors.bgAlt, Medium: colors.blueBg, High: colors.amberBg, Critical: colors.redBg };
const PRIORITY_TEXT = { Low: colors.textMuted, Medium: colors.blueDark, High: '#ca8a04', Critical: colors.red };

const s = {
  h1: { fontSize: 22, fontWeight: 700, color: colors.navy },
  btn: { padding: '8px 16px', background: colors.blue, color: colors.white, border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  filter: { padding: '8px 12px', border: `1px solid ${colors.borderInput}`, borderRadius: 7, fontSize: 13 },
  card: { background: colors.white, borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 10 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  badge: { padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 3 },
  link: { background: 'none', border: 'none', color: colors.blue, cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  mcard: { background: colors.white, borderRadius: 12, padding: 28, width: 'min(520px, 100%)', maxHeight: '92vh', overflowY: 'auto' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 5, marginTop: 12 },
  input: { width: '100%', padding: '9px 12px', border: `1px solid ${colors.borderInput}`, borderRadius: 7, fontSize: 14 },
  rowGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
};

const EMPTY = { id: null, project_id: '', customer_id: '', activity_type_id: '', product: '', type: '', priority: 'Medium', issue: '', assigned_engineer_id: '', hours: '', billable: true, status: 'Open' };

export default function SupportTickets() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canManage = ['Director', 'Manager'].includes(user?.role);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['support-tickets', statusFilter],
    queryFn: () => api.get('/support-tickets', { params: statusFilter ? { status: statusFilter } : {} }).then((r) => r.data),
  });
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => api.get('/projects').then((r) => r.data) });
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: () => api.get('/customers').then((r) => r.data) });
  const { data: engineers } = useQuery({ queryKey: ['engineers'], queryFn: () => api.get('/engineers').then((r) => r.data) });
  const { data: activityTypes } = useQuery({ queryKey: ['activity-types'], queryFn: () => api.get('/activity-types').then((r) => r.data) });

  const save = useMutation({
    mutationFn: (d) => (d.id ? api.put(`/support-tickets/${d.id}`, d) : api.post('/support-tickets', d)).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['support-tickets'] }); toast.success('Ticket saved'); setModal(false); },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not save ticket'),
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }) => api.put(`/support-tickets/${id}`, { status }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['support-tickets'] }); toast.success('Updated'); },
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/support-tickets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['support-tickets'] }); toast.success('Deleted'); },
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const openNew = () => { setForm(EMPTY); setModal(true); };
  const openEdit = (t) => {
    setForm({
      id: t.id, project_id: t.project_id || '', customer_id: t.customer_id || '', activity_type_id: t.activity_type_id || '',
      product: t.product || '', type: t.type || '', priority: t.priority || 'Medium', issue: t.issue || '',
      assigned_engineer_id: t.assigned_engineer_id || '', hours: t.hours ?? '', billable: t.billable !== false, status: t.status || 'Open',
    });
    setModal(true);
  };
  const submit = (e) => {
    e.preventDefault();
    if (!form.issue) return toast.error('Describe the issue');
    save.mutate(form);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={s.h1}>Support Tickets</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select style={s.filter} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
          </select>
          <button style={s.btn} onClick={openNew}>+ New Ticket</button>
        </div>
      </div>

      {isLoading ? <p>Loading…</p> : !tickets?.length ? (
        <p style={{ color: colors.textMuted }}>No tickets{statusFilter ? ` (${statusFilter})` : ''}.</p>
      ) : tickets.map((t) => (
        <div style={s.card} key={t.id}>
          <div style={s.row}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 700, color: colors.navy }}>
                {t.ticket_no} {t.type ? `· ${t.type}` : ''}
                <span style={{ ...s.badge, marginLeft: 8, background: PRIORITY_BG[t.priority] || colors.bgAlt, color: PRIORITY_TEXT[t.priority] || colors.text }}>{t.priority}</span>
                <span style={{ ...s.badge, marginLeft: 6, background: t.status === 'Open' ? colors.amberBg : colors.greenBg, color: t.status === 'Open' ? '#ca8a04' : colors.green }}>{t.status}</span>
              </div>
              <div style={{ fontSize: 14, color: colors.text, marginTop: 5 }}>{t.issue}</div>
              <div style={s.meta}>
                {t.project_name ? `🗂️ ${t.project_name}` : ''}{t.customer_name ? ` · 🏭 ${t.customer_name}` : ''}
                {t.engineer_name ? ` · 👷 ${t.engineer_name}` : ''}{Number(t.hours) > 0 ? ` · ${Number(t.hours)}h` : ''}
                {t.date_raised ? ` · raised ${format(new Date(t.date_raised), 'MMM d')}` : ''}{t.closed_date ? ` · closed ${format(new Date(t.closed_date), 'MMM d')}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button style={s.link} onClick={() => openEdit(t)}>Edit</button>
              {t.status === 'Open'
                ? <button style={{ ...s.link, color: colors.green }} onClick={() => setStatus.mutate({ id: t.id, status: 'Closed' })}>Close</button>
                : <button style={s.link} onClick={() => setStatus.mutate({ id: t.id, status: 'Open' })}>Reopen</button>}
              {canManage && <button style={{ ...s.link, color: colors.red }} onClick={() => { if (confirm(`Delete ${t.ticket_no}?`)) remove.mutate(t.id); }}>Delete</button>}
            </div>
          </div>
        </div>
      ))}

      {modal && (
        <div style={s.modal} onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
          <div style={s.mcard}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{form.id ? 'Edit Ticket' : 'New Ticket'}</h2>
            <form onSubmit={submit}>
              <label style={s.label}>Issue / Work Description *</label>
              <textarea style={{ ...s.input, resize: 'vertical' }} rows={2} value={form.issue} onChange={set('issue')} required />
              <div style={s.rowGrid}>
                <div>
                  <label style={s.label}>Type</label>
                  <input style={s.input} value={form.type} onChange={set('type')} placeholder="e.g. Bug, Query, Breakdown" />
                </div>
                <div>
                  <label style={s.label}>Priority</label>
                  <select style={s.input} value={form.priority} onChange={set('priority')}>
                    {['Low', 'Medium', 'High', 'Critical'].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.rowGrid}>
                <div>
                  <label style={s.label}>Project</label>
                  <select style={s.input} value={form.project_id} onChange={set('project_id')}>
                    <option value="">—</option>
                    {(projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Customer</label>
                  <select style={s.input} value={form.customer_id} onChange={set('customer_id')}>
                    <option value="">—</option>
                    {(customers || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.rowGrid}>
                <div>
                  <label style={s.label}>Assigned Engineer</label>
                  <select style={s.input} value={form.assigned_engineer_id} onChange={set('assigned_engineer_id')}>
                    <option value="">—</option>
                    {(engineers || []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Activity</label>
                  <select style={s.input} value={form.activity_type_id} onChange={set('activity_type_id')}>
                    <option value="">—</option>
                    {(activityTypes || []).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.rowGrid}>
                <div>
                  <label style={s.label}>Hours Spent</label>
                  <input style={s.input} type="number" step="0.5" min="0" value={form.hours} onChange={set('hours')} placeholder="0" />
                </div>
                <div>
                  <label style={s.label}>Status</label>
                  <select style={s.input} value={form.status} onChange={set('status')}>
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>
              <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.billable} onChange={(e) => setForm((f) => ({ ...f, billable: e.target.checked }))} />
                Billable to customer
              </label>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="button" style={{ ...s.btn, background: colors.bgAlt, color: colors.text }} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" style={s.btn} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
