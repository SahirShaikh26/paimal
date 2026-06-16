import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';

const STATUS_COLORS = {
  Planned:'#dbeafe', 'In Progress':'#dcfce7', Completed:'#f0fdf4',
  'On Hold':'#fef9c3', Cancelled:'#fee2e2',
};
const STATUS_TEXT = {
  Planned:'#1d4ed8', 'In Progress':'#16a34a', Completed:'#15803d',
  'On Hold':'#ca8a04', Cancelled:'#dc2626',
};

const s = {
  h1:    { fontSize:22, fontWeight:700, color:'#1e3a5f', marginBottom:20 },
  grid:  { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 },
  card:  { background:'#fff', borderRadius:10, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)' },
  badge: { display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, marginBottom:12 },
  name:  { fontSize:16, fontWeight:700, color:'#1e3a5f', marginBottom:6 },
  meta:  { fontSize:13, color:'#64748b', marginBottom:4 },
  btn:   { padding:'8px 16px', background:'#2563eb', color:'#fff', border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer' },
  modal: { position:'fixed', inset:0, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  mcard: { background:'#fff', borderRadius:12, padding:32, width:'min(480px, calc(100vw - 32px))', maxHeight:'90vh', overflowY:'auto' },
  input: { width:'100%', padding:'9px 12px', border:'1px solid #d1d5db', borderRadius:7, fontSize:14, marginBottom:12 },
  select:{ width:'100%', padding:'9px 12px', border:'1px solid #d1d5db', borderRadius:7, fontSize:14, marginBottom:12 },
  label: { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:5 },
  row:   { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
};

const EMPTY = { name:'', customer_id:'', engineer_id:'', status:'Planned', category:'', product_type:'', value_inr:'', start_date:'', end_date:'' };

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
              <span style={{ ...s.badge, background:STATUS_COLORS[p.status]||'#f1f5f9', color:STATUS_TEXT[p.status]||'#475569' }}>{p.status}</span>
              <div style={s.name}>{p.name}</div>
              <div style={s.meta}>🏭 {p.customer_name || 'No customer'}</div>
              <div style={s.meta}>👷 {p.engineer_name || 'Unassigned'}</div>
              {p.value_inr && <div style={s.meta}>💰 ₹{Number(p.value_inr).toLocaleString('en-IN')}</div>}
              {p.start_date && <div style={s.meta}>📅 {format(new Date(p.start_date),'dd MMM yyyy')}{p.end_date ? ` → ${format(new Date(p.end_date),'dd MMM yyyy')}` : ''}</div>}
              {canEdit && (
                <button style={{ ...s.btn, background:'#f8fafc', color:'#374151', marginTop:12, fontSize:12, padding:'6px 14px' }}
                  onClick={()=>{ setForm({...p, start_date:p.start_date?.split('T')[0]||'', end_date:p.end_date?.split('T')[0]||''}); setModal(true); }}>
                  Edit
                </button>
              )}
            </div>
          ))}
          {projects?.length === 0 && <p style={{ color:'#94a3b8' }}>No projects yet.</p>}
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
                  <label style={s.label}>Status</label>
                  <select style={s.select} value={form.status} onChange={set('status')}>
                    {['Planned','In Progress','Completed','On Hold','Cancelled'].map(v=><option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Value (₹)</label>
                  <input style={s.input} type="number" value={form.value_inr} onChange={set('value_inr')} placeholder="0" />
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
                <button type="button" style={{ ...s.btn, background:'#f1f5f9', color:'#374151' }} onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" style={s.btn} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
