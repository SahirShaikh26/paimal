import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';

const s = {
  h1:    { fontSize:22, fontWeight:700, color:'#1e3a5f', marginBottom:20 },
  toolbar:{ display:'flex', gap:12, marginBottom:16 },
  input: { padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, width:'100%', maxWidth:360 },
  btn:   { padding:'8px 16px', background:'#2563eb', color:'#fff', border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer' },
  table: { width:'100%', borderCollapse:'collapse', background:'#fff', borderRadius:10, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.08)' },
  th:    { padding:'10px 14px', background:'#f8fafc', textAlign:'left', fontSize:12, fontWeight:700, color:'#64748b', borderBottom:'1px solid #e2e8f0', textTransform:'uppercase' },
  td:    { padding:'10px 14px', fontSize:13, borderBottom:'1px solid #f1f5f9', color:'#374151' },
  modal: { position:'fixed', inset:0, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  mcard: { background:'#fff', borderRadius:12, padding:32, width:'min(480px, calc(100vw - 32px))', maxHeight:'90vh', overflowY:'auto' },
  label: { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:5 },
  minput:{ width:'100%', padding:'9px 12px', border:'1px solid #d1d5db', borderRadius:7, fontSize:14, marginBottom:12 },
  row:   { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
};

const EMPTY = { code:'', name:'', city:'', region:'', contact_name:'', contact_phone:'', address:'' };

export default function Customers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const canEdit = ['Director','Manager'].includes(user?.role);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => api.get('/customers', { params: search ? { search } : {} }).then(r=>r.data),
  });

  const save = useMutation({
    mutationFn: (d) => form.id ? api.put(`/customers/${form.id}`,d).then(r=>r.data) : api.post('/customers',d).then(r=>r.data),
    onSuccess: () => { qc.invalidateQueries({queryKey:['customers']}); toast.success('Saved!'); setModal(false); },
    onError: (e) => toast.error(e.response?.data?.error||'Error'),
  });

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h1 style={s.h1}>Customers</h1>
        {canEdit && <button style={s.btn} onClick={()=>{ setForm(EMPTY); setModal(true); }}>+ Add Customer</button>}
      </div>

      <div style={s.toolbar}>
        <input style={s.input} placeholder="Search by name, code, contact…" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      {isLoading ? <p>Loading…</p> : (
        <div style={{ overflowX:'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Code','Name','City','Region','Contact','Phone',''].map(h=>(
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.length === 0 && <tr><td colSpan={7} style={{ ...s.td, textAlign:'center', color:'#94a3b8', padding:32 }}>No customers found</td></tr>}
              {data?.map(c=>(
                <tr key={c.id}>
                  <td style={{ ...s.td, fontWeight:600 }}>{c.code}</td>
                  <td style={s.td}>{c.name}</td>
                  <td style={s.td}>{c.city||'—'}</td>
                  <td style={s.td}>{c.region||'—'}</td>
                  <td style={s.td}>{c.contact_name||'—'}</td>
                  <td style={s.td}>{c.contact_phone||'—'}</td>
                  <td style={s.td}>
                    {canEdit && <button style={{ ...s.btn, background:'#f8fafc', color:'#374151', fontSize:12, padding:'5px 12px' }}
                      onClick={()=>{ setForm(c); setModal(true); }}>Edit</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={s.modal} onClick={e=>{ if(e.target===e.currentTarget) setModal(false); }}>
          <div style={s.mcard}>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>{form.id ? 'Edit' : 'New'} Customer</h2>
            <form onSubmit={e=>{ e.preventDefault(); save.mutate(form); }}>
              <div style={s.row}>
                <div><label style={s.label}>Code *</label><input style={s.minput} value={form.code} onChange={set('code')} required placeholder="CUST001" /></div>
                <div><label style={s.label}>Name *</label><input style={s.minput} value={form.name} onChange={set('name')} required placeholder="Company name" /></div>
              </div>
              <div style={s.row}>
                <div><label style={s.label}>City</label><input style={s.minput} value={form.city} onChange={set('city')} /></div>
                <div><label style={s.label}>Region</label><input style={s.minput} value={form.region} onChange={set('region')} /></div>
              </div>
              <div style={s.row}>
                <div><label style={s.label}>Contact Name</label><input style={s.minput} value={form.contact_name} onChange={set('contact_name')} /></div>
                <div><label style={s.label}>Contact Phone</label><input style={s.minput} value={form.contact_phone} onChange={set('contact_phone')} /></div>
              </div>
              <label style={s.label}>Address</label>
              <input style={s.minput} value={form.address} onChange={set('address')} placeholder="Full address" />
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button type="button" style={{ ...s.btn, background:'#f1f5f9', color:'#374151' }} onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" style={s.btn} disabled={save.isPending}>{save.isPending?'Saving…':'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
