import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import colors from '../theme';

const ROLE_COLORS = { Director:colors.blueBg, Manager:colors.greenBg, Engineer:colors.purpleBg };
const ROLE_TEXT   = { Director:colors.blueDark, Manager:colors.green, Engineer:colors.purple };

const s = {
  h1:    { fontSize:22, fontWeight:700, color:colors.navy, marginBottom:20 },
  grid:  { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 },
  card:  { background:colors.white, borderRadius:10, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)' },
  badge: { display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, marginBottom:10 },
  name:  { fontSize:16, fontWeight:700, color:colors.navy, marginBottom:4 },
  meta:  { fontSize:13, color:colors.textMuted, marginBottom:3 },
  btn:   { padding:'8px 16px', background:colors.navy, color:colors.white, border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer' },
  modal: { position:'fixed', inset:0, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  mcard: { background:colors.white, borderRadius:12, padding:32, width:'min(440px, calc(100vw - 32px))', maxHeight:'90vh', overflowY:'auto' },
  label: { display:'block', fontSize:13, fontWeight:600, color:colors.text, marginBottom:5 },
  input: { width:'100%', padding:'9px 12px', border:`1px solid ${colors.borderInput}`, borderRadius:7, fontSize:14, marginBottom:12 },
  select:{ width:'100%', padding:'9px 12px', border:`1px solid ${colors.borderInput}`, borderRadius:7, fontSize:14, marginBottom:12 },
};

const EMPTY = { name:'', email:'', password:'', role:'Engineer', dept:'', reports_to:'', job_title:'', cost_per_hour:'' };

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
              <span style={{ ...s.badge, background:ROLE_COLORS[e.role]||colors.bgAlt, color:ROLE_TEXT[e.role]||'#475569' }}>{e.role}</span>
              <div style={s.name}>{e.name}</div>
              {e.job_title && <div style={s.meta}>🛠️ {e.job_title}</div>}
              <div style={s.meta}>✉️ {e.email}</div>
              {e.dept && <div style={s.meta}>🏢 {e.dept}</div>}
              {Number(e.cost_per_hour) > 0 && <div style={s.meta}>💰 ₹{Number(e.cost_per_hour).toLocaleString('en-IN')}/hr</div>}
              <div style={{ ...s.meta, marginTop:8 }}>
                <span style={{ padding:'2px 8px', borderRadius:20, fontSize:11, background:e.active?colors.greenBg:colors.redBg, color:e.active?colors.green:colors.red, fontWeight:600 }}>
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
              <label style={s.label}>Job Title</label>
              <input style={s.input} value={form.job_title} onChange={set('job_title')} placeholder="e.g. PLC Engineer" />
              <label style={s.label}>Cost / Hour (₹)</label>
              <input style={s.input} type="number" min="0" value={form.cost_per_hour} onChange={set('cost_per_hour')} placeholder="e.g. 650" />
              <label style={s.label}>Department</label>
              <input style={s.input} value={form.dept} onChange={set('dept')} placeholder="e.g. Field Service" />
              <label style={s.label}>Team Lead</label>
              <select style={s.select} value={form.reports_to} onChange={set('reports_to')}>
                <option value="">None</option>
                {data?.map((eng) => <option key={eng.id} value={eng.id}>{eng.name}</option>)}
              </select>
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button type="button" style={{ ...s.btn, background:colors.bgAlt, color:colors.text }} onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" style={s.btn} disabled={create.isPending}>{create.isPending?'Creating…':'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
