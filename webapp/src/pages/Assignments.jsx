import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/client';
import colors from '../theme';

const STATUS_BG = { 'Not Started': colors.bgAlt, 'In Progress': colors.blueBg, Completed: colors.greenBg, 'On Hold': colors.amberBg };
const STATUS_TEXT = { 'Not Started': colors.textMuted, 'In Progress': colors.blueDark, Completed: colors.green, 'On Hold': '#ca8a04' };

const s = {
  h1: { fontSize: 22, fontWeight: 700, color: colors.navy },
  btn: { padding: '8px 16px', background: colors.blue, color: colors.white, border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  filter: { padding: '8px 12px', border: `1px solid ${colors.borderInput}`, borderRadius: 7, fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', borderBottom: `2px solid ${colors.border}` },
  td: { padding: '8px 12px', fontSize: 13, borderBottom: `1px solid ${colors.bgAlt}` },
  badge: { padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  link: { background: 'none', border: 'none', color: colors.blue, cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  mcard: { background: colors.white, borderRadius: 12, padding: 28, width: 'min(480px, 100%)', maxHeight: '92vh', overflowY: 'auto' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 5, marginTop: 12 },
  input: { width: '100%', padding: '9px 12px', border: `1px solid ${colors.borderInput}`, borderRadius: 7, fontSize: 14 },
};

const EMPTY = { id: null, project_id: '', activity_type_id: '', engineer_id: '', product: '', planned_days: '', status: 'Not Started', notes: '' };

export default function Assignments() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [projectFilter, setProjectFilter] = useState('');

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments', projectFilter],
    queryFn: () => api.get('/assignments', { params: projectFilter ? { project_id: projectFilter } : {} }).then((r) => r.data),
  });
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => api.get('/projects').then((r) => r.data) });
  const { data: engineers } = useQuery({ queryKey: ['engineers'], queryFn: () => api.get('/engineers').then((r) => r.data) });
  const { data: activityTypes } = useQuery({ queryKey: ['activity-types'], queryFn: () => api.get('/activity-types').then((r) => r.data) });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products').then((r) => r.data) });

  const save = useMutation({
    mutationFn: (d) => (d.id ? api.put(`/assignments/${d.id}`, d) : api.post('/assignments', d)).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); toast.success('Assignment saved'); setModal(false); },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not save'),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/assignments/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); toast.success('Deleted'); },
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const openNew = () => { setForm(EMPTY); setModal(true); };
  const openEdit = (a) => {
    setForm({
      id: a.id, project_id: a.project_id || '', activity_type_id: a.activity_type_id || '',
      engineer_id: a.engineer_id || '', product: a.product || '', planned_days: a.planned_days ?? '',
      status: a.status || 'Not Started', notes: a.notes || '',
    });
    setModal(true);
  };
  const submit = (e) => {
    e.preventDefault();
    if (!form.project_id || !form.engineer_id) return toast.error('Project and engineer are required');
    save.mutate(form);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <h1 style={s.h1}>Assignments</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select style={s.filter} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">All projects</option>
            {(projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button style={s.btn} onClick={openNew}>+ Assign Work</button>
        </div>
      </div>
      <p style={{ color: colors.textMuted, fontSize: 13.5, marginBottom: 16, marginTop: -8 }}>
        Plan who does which activity on each project, and the days budgeted. Drives the Variance report.
      </p>

      {isLoading ? <p>Loading…</p> : !assignments?.length ? (
        <p style={{ color: colors.textMuted }}>No assignments yet.</p>
      ) : (
        <div style={{ overflowX: 'auto', background: colors.white, borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Project', 'Activity', 'Engineer', 'Product', 'Planned Days', 'Status', ''].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id}>
                  <td style={{ ...s.td, fontWeight: 600 }}>{a.project_name}</td>
                  <td style={s.td}>{a.activity_label || '—'}</td>
                  <td style={s.td}>{a.engineer_name}</td>
                  <td style={s.td}>{a.product || '—'}</td>
                  <td style={s.td}>{Number(a.planned_days)}</td>
                  <td style={s.td}><span style={{ ...s.badge, background: STATUS_BG[a.status] || colors.bgAlt, color: STATUS_TEXT[a.status] || colors.text }}>{a.status}</span></td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button style={s.link} onClick={() => openEdit(a)}>Edit</button>
                      <button style={{ ...s.link, color: colors.red }} onClick={() => { if (confirm('Delete this assignment?')) remove.mutate(a.id); }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={s.modal} onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
          <div style={s.mcard}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{form.id ? 'Edit Assignment' : 'Assign Work'}</h2>
            <form onSubmit={submit}>
              <label style={s.label}>Project *</label>
              <select style={s.input} value={form.project_id} onChange={set('project_id')} required>
                <option value="">Select project</option>
                {(projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <label style={s.label}>Activity</label>
              <select style={s.input} value={form.activity_type_id} onChange={set('activity_type_id')}>
                <option value="">Select activity</option>
                {(activityTypes || []).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <label style={s.label}>Engineer *</label>
              <select style={s.input} value={form.engineer_id} onChange={set('engineer_id')} required>
                <option value="">Select engineer</option>
                {(engineers || []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <label style={s.label}>Product / System</label>
              <input style={s.input} list="assign-products" value={form.product} onChange={set('product')} placeholder="e.g. Mitsubishi iQ-R PLC" />
              <datalist id="assign-products">{(products || []).map((p) => <option key={p.id} value={p.name} />)}</datalist>
              <label style={s.label}>Planned Days</label>
              <input style={s.input} type="number" step="0.5" min="0" value={form.planned_days} onChange={set('planned_days')} placeholder="0" />
              <label style={s.label}>Status</label>
              <select style={s.input} value={form.status} onChange={set('status')}>
                {['Not Started', 'In Progress', 'Completed', 'On Hold'].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
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
