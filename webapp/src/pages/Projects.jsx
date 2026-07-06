import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import colors from '../theme';

const STATUS_COLORS = {
  Planned:colors.blueBg, 'In Progress':colors.greenBg, Active:colors.greenBg, Completed:'#f0fdf4',
  'On Hold':colors.amberBg, Cancelled:colors.redBg,
};
const STATUS_TEXT = {
  Planned:colors.blueDark, 'In Progress':colors.green, Active:colors.green, Completed:'#15803d',
  'On Hold':'#ca8a04', Cancelled:colors.red,
};

const s = {
  h1:    { fontSize:22, fontWeight:700, color:colors.navy, marginBottom:20 },
  grid:  { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 },
  card:  { background:colors.white, borderRadius:10, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)' },
  badge: { display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, marginBottom:12 },
  name:  { fontSize:16, fontWeight:700, color:colors.navy, marginBottom:6 },
  meta:  { fontSize:13, color:colors.textMuted, marginBottom:4 },
  btn:   { padding:'8px 16px', background:colors.navy, color:colors.white, border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer' },
  modal: { position:'fixed', inset:0, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  mcard: { background:colors.white, borderRadius:12, padding:32, width:'min(480px, calc(100vw - 32px))', maxHeight:'90vh', overflowY:'auto' },
  input: { width:'100%', padding:'9px 12px', border:`1px solid ${colors.borderInput}`, borderRadius:7, fontSize:14, marginBottom:12 },
  select:{ width:'100%', padding:'9px 12px', border:`1px solid ${colors.borderInput}`, borderRadius:7, fontSize:14, marginBottom:12 },
  label: { display:'block', fontSize:13, fontWeight:600, color:colors.text, marginBottom:5 },
  row:   { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
};

const EMPTY = { name:'', customer_id:'', engineer_id:'', project_manager_id:'', status:'Planned', category:'', product_type:'', value_inr:'', quoted_hours:'', start_date:'', end_date:'' };

export default function Projects() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const canEdit = ['Director','Manager'].includes(user?.role);

  const { data: projects, isLoading } = useQuery({ queryKey:['projects'], queryFn:()=>api.get('/projects').then(r=>r.data) });
  const { data: customers } = useQuery({ queryKey:['customers'], queryFn:()=>api.get('/customers').then(r=>r.data) });
  const { data: engineers } = useQuery({ queryKey:['engineers'], queryFn:()=>api.get('/engineers').then(r=>r.data) });

  const save = useMutation({
    mutationFn: (d) => form.id ? api.put(`/projects/${form.id}`,d).then(r=>r.data) : api.post('/projects',d).then(r=>r.data),
    onSuccess: () => { qc.invalidateQueries({queryKey:['projects']}); toast.success('Saved!'); setModal(false); },
    onError: (e) => toast.error(e.response?.data?.error||'Error'),
  });

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const openNew = () => { setForm(EMPTY); setModal(true); };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h1 style={s.h1}>Projects</h1>
        {canEdit && <button style={s.btn} onClick={openNew}>+ New Project</button>}
      </div>

      {isLoading ? <p>Loading…</p> : (
        <div style={s.grid}>
          {projects?.map(p => (
            <div key={p.id} style={s.card}>
              <span style={{ ...s.badge, background:STATUS_COLORS[p.status]||colors.bgAlt, color:STATUS_TEXT[p.status]||'#475569' }}>{p.status}</span>
              <div style={s.name}>{p.name}</div>
              <div style={s.meta}>🏭 {p.customer_name || 'No customer'}</div>
              {p.project_manager_name && <div style={s.meta}>🧑‍💼 PM: {p.project_manager_name}</div>}
              <div style={s.meta}>👷 {p.engineer_name || 'Unassigned'}</div>
              {p.value_inr && <div style={s.meta}>💰 ₹{Number(p.value_inr).toLocaleString('en-IN')}{Number(p.quoted_hours) > 0 ? ` · ${Number(p.quoted_hours)} hrs quoted` : ''}</div>}
              {p.start_date && <div style={s.meta}>📅 {format(new Date(p.start_date),'dd MMM yyyy')}{p.end_date ? ` → ${format(new Date(p.end_date),'dd MMM yyyy')}` : ''}</div>}
              {canEdit && (
                <button style={{ ...s.btn, background:colors.bgSlate, color:colors.text, marginTop:12, fontSize:12, padding:'6px 14px' }}
                  onClick={()=>{ setForm({...p, start_date:p.start_date?.split('T')[0]||'', end_date:p.end_date?.split('T')[0]||''}); setModal(true); }}>
                  Edit
                </button>
              )}
            </div>
          ))}
          {projects?.length === 0 && <p style={{ color:colors.textFaint }}>No projects yet.</p>}
        </div>
      )}

      {modal && (
        <div style={s.modal} onClick={e=>{ if(e.target===e.currentTarget) setModal(false); }}>
          <div style={s.mcard}>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>{form.id ? 'Edit' : 'New'} Project</h2>
            <form onSubmit={e=>{ e.preventDefault(); save.mutate(form); }}>
              <label style={s.label}>Project Name *</label>
              <input style={s.input} value={form.name} onChange={set('name')} required />
              <div style={s.row}>
                <div>
                  <label style={s.label}>Customer</label>
                  <select style={s.select} value={form.customer_id} onChange={set('customer_id')}>
                    <option value="">Select…</option>
                    {customers?.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Assigned Engineer</label>
                  <select style={s.select} value={form.engineer_id} onChange={set('engineer_id')}>
                    <option value="">Select…</option>
                    {engineers?.filter(e=>e.role==='Engineer').map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.row}>
                <div>
                  <label style={s.label}>Project Manager</label>
                  <select style={s.select} value={form.project_manager_id || ''} onChange={set('project_manager_id')}>
                    <option value="">Select…</option>
                    {engineers?.filter(e=>['Director','Manager'].includes(e.role)).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Status</label>
                  <select style={s.select} value={form.status} onChange={set('status')}>
                    {['Planned','In Progress','Active','Completed','On Hold','Cancelled'].map(v=><option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.row}>
                <div>
                  <label style={s.label}>Quoted Value (₹)</label>
                  <input style={s.input} type="number" value={form.value_inr} onChange={set('value_inr')} placeholder="0" />
                </div>
                <div>
                  <label style={s.label}>Quoted Hours</label>
                  <input style={s.input} type="number" value={form.quoted_hours || ''} onChange={set('quoted_hours')} placeholder="0" />
                </div>
              </div>
              <div style={s.row}>
                <div>
                  <label style={s.label}>Start Date</label>
                  <input style={s.input} type="date" value={form.start_date} onChange={set('start_date')} />
                </div>
                <div>
                  <label style={s.label}>End Date</label>
                  <input style={s.input} type="date" value={form.end_date} onChange={set('end_date')} />
                </div>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button type="button" style={{ ...s.btn, background:colors.bgAlt, color:colors.text }} onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" style={s.btn} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
