import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import colors from '../theme';
import MonthGrid from '../components/MonthGrid';

const COLUMNS = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

const PRIORITY_DOT = { Low:'#94a3b8', Medium:colors.blueDark, High:colors.amber, Urgent:colors.red };

const s = {
  h1: { fontSize:22, fontWeight:700, color:colors.navy, marginBottom:0 },
  btn: { padding:'8px 16px', background:colors.navy, color:colors.white, border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer' },
  btnGhost: { padding:'7px 14px', background:colors.white, color:colors.text, border:`1px solid ${colors.border}`, borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer' },
  card: { background:colors.white, borderRadius:10, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)' },
  tabs: { display:'flex', gap:8 },
  tab: { padding:'7px 16px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer', border:`1px solid ${colors.border}`, background:colors.white, color:colors.text },
  tabActive: { background:colors.navy, color:colors.white, border:`1px solid ${colors.navy}` },
  select: { padding:'7px 10px', border:`1px solid ${colors.borderInput}`, borderRadius:7, fontSize:13, background:colors.white },
  col: { background:colors.bgAlt, borderRadius:10, padding:10, minHeight:220, display:'flex', flexDirection:'column', gap:8 },
  colHead: { fontSize:12, fontWeight:700, color:colors.textMuted, textTransform:'uppercase', letterSpacing:'.05em', padding:'2px 4px 6px', display:'flex', justifyContent:'space-between' },
  task: { background:colors.white, borderRadius:8, padding:'10px 12px', boxShadow:'0 1px 3px rgba(0,0,0,.07)', cursor:'grab' },
  meta: { fontSize:12, color:colors.textMuted },
  chip: { display:'inline-flex', alignItems:'center', justifyContent:'center', width:22, height:22, borderRadius:'50%', background:colors.blueBg, color:colors.blueDark, fontSize:10, fontWeight:700 },
  modal: { position:'fixed', inset:0, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  mcard: { background:colors.white, borderRadius:12, padding:32, width:'min(540px, calc(100vw - 32px))', maxHeight:'90vh', overflowY:'auto' },
  input: { width:'100%', padding:'9px 12px', border:`1px solid ${colors.borderInput}`, borderRadius:7, fontSize:14, marginBottom:12 },
  label: { display:'block', fontSize:13, fontWeight:600, color:colors.text, marginBottom:5 },
  row: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  th: { textAlign:'left', padding:'8px 10px', fontSize:12, fontWeight:700, color:colors.textMuted, textTransform:'uppercase', letterSpacing:'.04em', borderBottom:`2px solid ${colors.border}` },
  td: { padding:'8px 10px', fontSize:13, color:colors.text, borderBottom:`1px solid ${colors.border}`, cursor:'pointer' },
};

const EMPTY = { title:'', description:'', project_id:'', assignee_id:'', status:'todo', priority:'Medium', due_date:'', checklist:[] };

function initials(name) {
  return (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function Tasks() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canManage = ['Director', 'Manager'].includes(user?.role);
  const [params, setParams] = useSearchParams();
  const view = params.get('view') || 'board';
  const [filters, setFilters] = useState({ project_id:'', assignee_id:'', priority:'' });
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dragId, setDragId] = useState(null);

  const { data: tasks } = useQuery({ queryKey:['tasks'], queryFn:()=>api.get('/tasks').then(r=>r.data) });
  const { data: projects } = useQuery({ queryKey:['projects'], queryFn:()=>api.get('/projects').then(r=>r.data) });
  const { data: team } = useQuery({ queryKey:['engineers'], queryFn:()=>api.get('/engineers').then(r=>r.data) });

  const invalidate = () => qc.invalidateQueries({ queryKey:['tasks'] });

  const save = useMutation({
    mutationFn: (d) => d.id ? api.put(`/tasks/${d.id}`, d).then(r=>r.data) : api.post('/tasks', d).then(r=>r.data),
    onSuccess: () => { invalidate(); toast.success('Saved!'); setModal(false); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`).then(r=>r.data),
    onSuccess: () => { invalidate(); toast.success('Deleted'); setModal(false); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });
  // Optimistic kanban move: update the cache immediately, roll back on error.
  const move = useMutation({
    mutationFn: ({ id, status, index }) => api.put(`/tasks/${id}/move`, { status, index }).then(r=>r.data),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey:['tasks'] });
      const prev = qc.getQueryData(['tasks']);
      qc.setQueryData(['tasks'], (old) => old?.map((t) => (t.id === id ? { ...t, status } : t)));
      return { prev };
    },
    onError: (e, _v, ctx) => { qc.setQueryData(['tasks'], ctx.prev); toast.error(e.response?.data?.error || 'Error'); },
    onSettled: invalidate,
  });

  const filtered = (tasks || []).filter((t) =>
    (!filters.project_id || t.project_id === filters.project_id) &&
    (!filters.assignee_id || t.assignee_id === filters.assignee_id) &&
    (!filters.priority || t.priority === filters.priority)
  );

  const setView = (v) => setParams((p) => { p.set('view', v); return p; }, { replace: true });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const openTask = (t) => {
    setForm({ ...t, due_date: t.due_date?.split('T')[0] || '', project_id: t.project_id || '', assignee_id: t.assignee_id || '', checklist: t.checklist || [] });
    setModal(true);
  };

  const checklistProgress = (t) => {
    const c = t.checklist || [];
    return c.length ? `${c.filter((i) => i.done).length}/${c.length}` : null;
  };

  const engineerLocked = !canManage; // engineers: only status/checklist/description editable

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:12 }}>
        <h1 style={s.h1}>Tasks</h1>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <div style={s.tabs}>
            {[['board', 'Board'], ['list', 'List'], ['calendar', 'Calendar']].map(([k, label]) => (
              <button key={k} style={{ ...s.tab, ...(view === k ? s.tabActive : {}) }} onClick={() => setView(k)}>{label}</button>
            ))}
          </div>
          <button style={s.btn} onClick={() => { setForm({ ...EMPTY, assignee_id: canManage ? '' : user.id }); setModal(true); }}>+ New Task</button>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <select style={s.select} value={filters.project_id} onChange={(e) => setFilters((f) => ({ ...f, project_id: e.target.value }))}>
          <option value="">All projects</option>
          {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {canManage && (
          <select style={s.select} value={filters.assignee_id} onChange={(e) => setFilters((f) => ({ ...f, assignee_id: e.target.value }))}>
            <option value="">All assignees</option>
            {team?.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
        <select style={s.select} value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}>
          <option value="">All priorities</option>
          {Object.keys(PRIORITY_DOT).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {canManage && (
          <button style={{ ...s.btnGhost, ...(filters.assignee_id === user.id ? { borderColor:colors.accent, color:colors.accent } : {}) }}
            onClick={() => setFilters((f) => ({ ...f, assignee_id: f.assignee_id === user.id ? '' : user.id }))}>
            My Tasks
          </button>
        )}
      </div>

      {view === 'board' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))', gap:12, alignItems:'start' }}>
          {COLUMNS.map((col) => {
            const items = filtered.filter((t) => t.status === col.key);
            return (
              <div key={col.key} style={s.col}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId) move.mutate({ id: dragId, status: col.key, index: items.length });
                  setDragId(null);
                }}>
                <div style={s.colHead}><span>{col.label}</span><span>{items.length}</span></div>
                {items.map((t) => (
                  <div key={t.id} style={s.task} draggable
                    onDragStart={() => setDragId(t.id)}
                    onClick={() => openTask(t)}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:PRIORITY_DOT[t.priority], flexShrink:0 }} title={t.priority} />
                      <span style={{ fontSize:13, fontWeight:600, color:colors.navy }}>{t.title}</span>
                    </div>
                    {t.project_name && <div style={{ ...s.meta, marginBottom:4 }}>{t.project_name}</div>}
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      {t.assignee_name && <span style={s.chip} title={t.assignee_name}>{initials(t.assignee_name)}</span>}
                      {t.due_date && (
                        <span style={{ ...s.meta, color: t.due_date.split('T')[0] < new Date().toISOString().split('T')[0] && t.status !== 'done' ? colors.red : colors.textMuted }}>
                          {format(new Date(t.due_date), 'dd MMM')}
                        </span>
                      )}
                      {checklistProgress(t) && <span style={s.meta}>☑ {checklistProgress(t)}</span>}
                      {/* click-to-move fallback for touch devices */}
                      <select
                        value={t.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => move.mutate({ id: t.id, status: e.target.value, index: 0 })}
                        style={{ marginLeft:'auto', border:'none', background:'transparent', fontSize:11, color:colors.textMuted, cursor:'pointer' }}>
                        {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {view === 'list' && (
        <div style={{ ...s.card, overflowX:'auto' }}>
          <table style={{ borderCollapse:'collapse', width:'100%' }}>
            <thead><tr>
              <th style={s.th}>Task</th><th style={s.th}>Project</th><th style={s.th}>Assignee</th>
              <th style={s.th}>Priority</th><th style={s.th}>Due</th><th style={s.th}>Status</th><th style={s.th}>Checklist</th>
            </tr></thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} onClick={() => openTask(t)}>
                  <td style={{ ...s.td, fontWeight:600 }}>{t.title}</td>
                  <td style={s.td}>{t.project_name || '—'}</td>
                  <td style={s.td}>{t.assignee_name || '—'}</td>
                  <td style={s.td}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:PRIORITY_DOT[t.priority], display:'inline-block', marginRight:6 }} />
                    {t.priority}
                  </td>
                  <td style={s.td}>{t.due_date ? format(new Date(t.due_date), 'dd MMM yyyy') : '—'}</td>
                  <td style={s.td}>{COLUMNS.find((c) => c.key === t.status)?.label}</td>
                  <td style={s.td}>{checklistProgress(t) || '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td style={s.td} colSpan={7}>No tasks.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {view === 'calendar' && (
        <div style={s.card}>
          <MonthGrid month={month} onMonthChange={setMonth} renderDay={(date) => (
            <>
              {filtered.filter((t) => t.due_date?.split('T')[0] === date).map((t) => (
                <div key={t.id} onClick={() => openTask(t)} title={t.title} style={{
                  fontSize:11, fontWeight:600, padding:'1px 5px', borderRadius:5, marginBottom:2, cursor:'pointer',
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                  background: t.status === 'done' ? colors.greenBg : colors.blueBg,
                  color: t.status === 'done' ? colors.green : colors.blueDark,
                }}>
                  {t.title}
                </div>
              ))}
            </>
          )} />
        </div>
      )}

      {modal && (
        <div style={s.modal} onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
          <div style={s.mcard}>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>{form.id ? 'Edit' : 'New'} Task</h2>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}>
              <label style={s.label}>Title *</label>
              <input style={s.input} value={form.title} onChange={set('title')} required disabled={form.id && engineerLocked} />
              <label style={s.label}>Description</label>
              <textarea style={{ ...s.input, minHeight:64, fontFamily:'inherit' }} value={form.description || ''} onChange={set('description')} />
              <div style={s.row}>
                <div>
                  <label style={s.label}>Project</label>
                  <select style={s.input} value={form.project_id} onChange={set('project_id')} disabled={form.id && engineerLocked}>
                    <option value="">None (standalone)</option>
                    {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Assignee</label>
                  <select style={s.input} value={form.assignee_id} onChange={set('assignee_id')} disabled={engineerLocked}>
                    <option value="">Unassigned</option>
                    {team?.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.row}>
                <div>
                  <label style={s.label}>Status</label>
                  <select style={s.input} value={form.status} onChange={set('status')}>
                    {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Priority</label>
                  <select style={s.input} value={form.priority} onChange={set('priority')} disabled={form.id && engineerLocked}>
                    {Object.keys(PRIORITY_DOT).map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <label style={s.label}>Due Date</label>
              <input style={s.input} type="date" value={form.due_date} onChange={set('due_date')} disabled={form.id && engineerLocked} />

              <label style={s.label}>Checklist</label>
              {(form.checklist || []).map((item, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <input type="checkbox" checked={!!item.done}
                    onChange={(e) => setForm((f) => ({ ...f, checklist: f.checklist.map((c, j) => (j === i ? { ...c, done: e.target.checked } : c)) }))} />
                  <input style={{ ...s.input, marginBottom:0, textDecoration: item.done ? 'line-through' : 'none' }} value={item.text}
                    onChange={(e) => setForm((f) => ({ ...f, checklist: f.checklist.map((c, j) => (j === i ? { ...c, text: e.target.value } : c)) }))} />
                  <button type="button" style={{ ...s.btnGhost, padding:'6px 10px', color:colors.red }}
                    onClick={() => setForm((f) => ({ ...f, checklist: f.checklist.filter((_, j) => j !== i) }))}>✕</button>
                </div>
              ))}
              <button type="button" style={{ ...s.btnGhost, marginBottom:16, fontSize:12 }}
                onClick={() => setForm((f) => ({ ...f, checklist: [...(f.checklist || []), { text: '', done: false }] }))}>
                + Add item
              </button>

              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                {form.id && (canManage || form.created_by === user?.id) && (
                  <button type="button" style={{ ...s.btn, background:colors.red }} onClick={() => remove.mutate(form.id)}>Delete</button>
                )}
                <button type="button" style={{ ...s.btn, background:colors.bgAlt, color:colors.text, marginLeft:'auto' }} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" style={s.btn} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
