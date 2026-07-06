import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useCreateLog } from '../hooks/useLogs';
import api from '../api/client';
import colors from '../theme';

const s = {
  page:  { maxWidth:640 },
  h1:    { fontSize:22, fontWeight:700, color:colors.navy, marginBottom:24 },
  card:  { background:colors.white, borderRadius:10, padding:28, boxShadow:'0 1px 4px rgba(0,0,0,.08)' },
  row:   { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:16, marginBottom:16 },
  group: { marginBottom:16 },
  label: { display:'block', fontSize:13, fontWeight:600, color:colors.text, marginBottom:5 },
  input: { width:'100%', padding:'9px 12px', border:`1px solid ${colors.borderInput}`, borderRadius:7, fontSize:14 },
  select:{ width:'100%', padding:'9px 12px', border:`1px solid ${colors.borderInput}`, borderRadius:7, fontSize:14 },
  textarea:{ width:'100%', padding:'9px 12px', border:`1px solid ${colors.borderInput}`, borderRadius:7, fontSize:14, resize:'vertical' },
  btn:   { padding:'10px 24px', background:colors.navy, color:colors.white, border:'none', borderRadius:7, fontSize:14, fontWeight:600, cursor:'pointer' },
  btnSecondary: { padding:'10px 24px', background:colors.bgAlt, color:colors.text, border:'none', borderRadius:7, fontSize:14, cursor:'pointer', marginRight:12 },
};

export default function LogActivity() {
  const navigate = useNavigate();
  const createLog = useCreateLog();

  const { data: customers } = useQuery({ queryKey:['customers'], queryFn:()=>api.get('/customers').then(r=>r.data) });
  const { data: projects }  = useQuery({ queryKey:['projects'],  queryFn:()=>api.get('/projects').then(r=>r.data) });
  const { data: activityTypes } = useQuery({ queryKey:['activity-types'], queryFn:()=>api.get('/activity-types').then(r=>r.data) });
  const { data: products } = useQuery({ queryKey:['products'], queryFn:()=>api.get('/products').then(r=>r.data) });

  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    activity_code: '',
    customer_id: '',
    project_id: '',
    query_type: '',
    product_type: '',
    work_mode: '',
    ticket_no: '',
    hours: '',
    travel_hours: '',
    billable: true,
    billing_inr: '',
    cost_inr: '',
    status: '',
    location: '',
    notes: '',
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createLog.mutateAsync(form);
      toast.success('Activity logged!');
      navigate('/logs');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    }
  };

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Log Activity</h1>
      <div style={s.card}>
        <form onSubmit={handleSubmit}>
          <div style={s.row}>
            <div style={s.group}>
              <label style={s.label}>Date *</label>
              <input style={s.input} type="date" value={form.date} onChange={set('date')} required />
            </div>
            <div style={s.group}>
              <label style={s.label}>Activity Code *</label>
              <select style={s.select} value={form.activity_code} onChange={set('activity_code')} required>
                <option value="">Select…</option>
                {activityTypes?.map(a => <option key={a.id} value={a.code}>{a.code} — {a.label}</option>)}
              </select>
            </div>
          </div>

          <div style={s.row}>
            <div style={s.group}>
              <label style={s.label}>Customer</label>
              <select style={s.select} value={form.customer_id} onChange={set('customer_id')}>
                <option value="">Select customer…</option>
                {customers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={s.group}>
              <label style={s.label}>Project</label>
              <select style={s.select} value={form.project_id} onChange={set('project_id')}>
                <option value="">Select project…</option>
                {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div style={s.row}>
            <div style={s.group}>
              <label style={s.label}>Query Type</label>
              <input style={s.input} value={form.query_type} onChange={set('query_type')} placeholder="e.g. Breakdown query" />
            </div>
            <div style={s.group}>
              <label style={s.label}>Product / System</label>
              <input style={s.input} list="product-list" value={form.product_type} onChange={set('product_type')} placeholder="e.g. Mitsubishi iQ-R PLC" />
              <datalist id="product-list">
                {products?.map((p) => <option key={p.id} value={p.name} />)}
              </datalist>
            </div>
          </div>

          <div style={s.row}>
            <div style={s.group}>
              <label style={s.label}>Work Mode</label>
              <select style={s.select} value={form.work_mode} onChange={set('work_mode')}>
                <option value="">Select…</option>
                {['Office','Site','Remote'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div style={s.group}>
              <label style={s.label}>Ticket No <span style={{color:colors.textFaint,fontWeight:400}}>(if support work)</span></label>
              <input style={s.input} value={form.ticket_no} onChange={set('ticket_no')} placeholder="e.g. TK-2026-0007" />
            </div>
          </div>

          <div style={s.row}>
            <div style={s.group}>
              <label style={s.label}>Hours</label>
              <input style={s.input} type="number" step="0.5" min="0" value={form.hours} onChange={set('hours')} placeholder="0.0" />
            </div>
            <div style={s.group}>
              <label style={s.label}>Travel Hours</label>
              <input style={s.input} type="number" step="0.5" min="0" value={form.travel_hours} onChange={set('travel_hours')} placeholder="0.0" />
            </div>
          </div>

          <div style={s.row}>
            <div style={s.group}>
              <label style={s.label}>Work Location</label>
              <input style={s.input} value={form.location} onChange={set('location')} placeholder="City / Site name" />
            </div>
            <div style={s.group}>
              <label style={s.label}>Billing (₹)</label>
              <input style={s.input} type="number" min="0" value={form.billing_inr} onChange={set('billing_inr')} placeholder="0" />
            </div>
          </div>

          <div style={s.group}>
            <label style={{ ...s.label, display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
              <input type="checkbox" checked={form.billable} onChange={(e)=>setForm(f=>({...f, billable:e.target.checked}))} />
              Billable to customer
            </label>
            <div style={{ fontSize:12, color:colors.textMuted, marginTop:2 }}>Cost is auto-calculated from your hourly rate; leave Billing blank if not billable.</div>
          </div>

          <div style={s.group}>
            <label style={s.label}>Status</label>
            <select style={s.select} value={form.status} onChange={set('status')}>
              <option value="">Select…</option>
              {['Open','In Progress','Resolved','Closed','Pending Parts'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div style={s.group}>
            <label style={s.label}>Notes</label>
            <textarea style={s.textarea} rows={3} value={form.notes} onChange={set('notes')} placeholder="Describe what was done…" />
          </div>

          <div style={{ marginTop:8 }}>
            <button type="button" style={s.btnSecondary} onClick={() => navigate('/logs')}>Cancel</button>
            <button type="submit" style={s.btn} disabled={createLog.isPending}>
              {createLog.isPending ? 'Saving…' : 'Save Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
