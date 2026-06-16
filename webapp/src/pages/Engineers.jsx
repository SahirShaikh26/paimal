import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';

const ROLE_COLORS = { Director:'#dbeafe', Manager:'#dcfce7', Engineer:'#f3e8ff' };
const ROLE_TEXT   = { Director:'#1d4ed8', Manager:'#16a34a', Engineer:'#7c3aed' };

const s = {
  h1:    { fontSize:22, fontWeight:700, color:'#1e3a5f', marginBottom:20 },
  grid:  { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 },
  card:  { background:'#fff', borderRadius:10, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)' },
  badge: { display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, marginBottom:10 },
  name:  { fontSize:16, fontWeight:700, color:'#1e3a5f', marginBottom:4 },
  meta:  { fontSize:13, color:'#64748b', marginBottom:3 },
  btn:   { padding:'8px 16px', background:'#2563eb', color:'#fff', border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer' },
  modal: { position:'fixed', inset:0, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  mcard: { background:'#fff', borderRadius:12, padding:32, width:'min(440px, calc(100vw - 32px))', maxHeight:'90vh', overflowY:'auto' },
  label: { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:5 },
  input: { width:'100%', padding:'9px 12px', border:'1px solid #d1d5db', borderRadius:7, fontSize:14, marginBottom:12 },
  select:{ width:'100%', padding:'9px 12px', border:'1px solid #d1d5db', borderRadius:7, fontSize:14, marginBottom:12 },
};

const EMPTY = { name:'', email:'', password:'', role:'Engineer', dept:'', reports_to:'' };

export default function Engineers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const canCreate = user?.role === 'Director';

  const { data, isLoading } = useQuery({ queryKey:['engineers'], queryFn:()=>api.get('/engineers').then(r=>r.data) });

  const create = useMutation({
    mutationFn: (d) => api.post('/engineers', d).then(r=>r.data),
    onSuccess: () => { qc.invalidateQueries({queryKey:['engineers']}); toast.success('User created!'); setModal(false); },
    onError: (e) => toast.error(e.response?.data?.error||'Error'),
  });

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h1 style={s.h1}>Team</h1>
        {canCreate && <button style={s.btn} onClick={()=>{ setForm(EMPTY); setModal(true); }}>+ Add User</button>}
      </div>

      {isLoading ? <p>Loading…</p> : (
        <div style={s.grid}>
          {data?.map(e=>(
            <div key={e.id} style={s.card}>
              <span style={{ ...s.badge, background:ROLE_COLORS[e.role]||'#f1f5f9', color:ROLE_TEXT[e.role]||'#475569' }}>{e.role}</span>
              <div style={s.name}>{e.name}</div>
              <div style={s.meta}>✉️ {e.email}</div>
              {e.dept && <div style={s.meta}>🏢 {e.dept}</div>}
              <div style={{ ...s.meta, marginTop:8 }}>
                <span style={{ padding:'2px 8px', borderRadius:20, fontSize:11, background:e.active?'#dcfce7':'#fee2e2', color:e.active?'#16a34a':'#dc2626', fontWeight:600 }}>
                  {e.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div style={s.modal} onClick={e=>{ if(e.target===e.currentTarget) setModal(false); }}>
          <div style={s.mcard}>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>Add User</h2>
            <form onSubmit={e=>{ e.preventDefault(); create.mutate(form); }}>
              <label style={s.label}>Full Name *</label>
              <input style={s.input} value={form.name} onChange={set('name')} required />
              <label style={s.label}>Email *</label>
              <input style={s.input} type="email" value={form.email} onChange={set('email')} required />
              <label style={s.label}>Password *</label>
              <input style={s.input} type="password" value={form.password} onChange={set('password')} required minLength={6} />
              <label style={s.label}>Role *</label>
              <select style={s.select} value={form.role} onChange={set('role')}>
                <option value="Engineer">Engineer</option>
                <option value="Manager">Manager</option>
                <option value="Director">Director</option>
              </select>
              <label style={s.label}>Department</label>
              <input style={s.input} value={form.dept} onChange={set('dept')} placeholder="e.g. Field Service" />
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button type="button" style={{ ...s.btn, background:'#f1f5f9', color:'#374151' }} onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" style={s.btn} disabled={create.isPending}>{create.isPending?'Creating…':'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
