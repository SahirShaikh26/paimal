import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import colors from '../theme';

const s = {
  h1: { fontSize:22, fontWeight:700, color:colors.navy, marginBottom:0 },
  card: { background:colors.white, borderRadius:10, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)' },
  btn: { padding:'8px 16px', background:colors.navy, color:colors.white, border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer' },
  btnGhost: { padding:'7px 14px', background:colors.white, color:colors.text, border:`1px solid ${colors.border}`, borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer' },
  badge: { display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600 },
  tabs: { display:'flex', gap:8, marginBottom:16 },
  tab: { padding:'7px 16px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer', border:`1px solid ${colors.border}`, background:colors.white, color:colors.text },
  tabActive: { background:colors.navy, color:colors.white, border:`1px solid ${colors.navy}` },
  th: { textAlign:'left', padding:'8px 10px', fontSize:12, fontWeight:700, color:colors.textMuted, textTransform:'uppercase', letterSpacing:'.04em', borderBottom:`2px solid ${colors.border}` },
  td: { padding:'8px 10px', fontSize:13, color:colors.text, borderBottom:`1px solid ${colors.border}` },
  modal: { position:'fixed', inset:0, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  mcard: { background:colors.white, borderRadius:12, padding:32, width:'min(560px, calc(100vw - 32px))', maxHeight:'90vh', overflowY:'auto' },
  input: { width:'100%', padding:'9px 12px', border:`1px solid ${colors.borderInput}`, borderRadius:7, fontSize:14, marginBottom:12 },
  label: { display:'block', fontSize:13, fontWeight:600, color:colors.text, marginBottom:5 },
  meta: { fontSize:13, color:colors.textMuted },
};

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Allowance/deduction editor (adapted LineItemEditor pattern: repeatable rows).
function LineItems({ items, onChange }) {
  const set = (i, k, v) => onChange(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  return (
    <div style={{ marginBottom:12 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 130px 120px auto', gap:8, marginBottom:6 }}>
          <input style={{ ...s.input, marginBottom:0 }} placeholder="Label (e.g. HRA, PF)" value={it.label}
            onChange={(e) => set(i, 'label', e.target.value)} />
          <select style={{ ...s.input, marginBottom:0 }} value={it.type} onChange={(e) => set(i, 'type', e.target.value)}>
            <option value="allowance">Allowance</option>
            <option value="deduction">Deduction</option>
          </select>
          <input style={{ ...s.input, marginBottom:0 }} type="number" min="0" step="0.01" placeholder="Amount" value={it.amount}
            onChange={(e) => set(i, 'amount', e.target.value)} />
          <button type="button" style={{ ...s.btnGhost, padding:'6px 10px', color:colors.red }}
            onClick={() => onChange(items.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button type="button" style={{ ...s.btnGhost, fontSize:12 }}
        onClick={() => onChange([...items, { label:'', type:'allowance', amount:'' }])}>
        + Add line item
      </button>
    </div>
  );
}

export default function Payroll() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('runs');
  const [salaryModal, setSalaryModal] = useState(null);
  const [runModal, setRunModal] = useState(false);
  const [runMonth, setRunMonth] = useState(new Date().toISOString().slice(0, 7));
  const [openRun, setOpenRun] = useState(null);
  const [slipEdit, setSlipEdit] = useState(null);

  const isDirector = user?.role === 'Director';

  const { data: salaries } = useQuery({
    queryKey:['payroll','salaries'],
    queryFn:()=>api.get('/payroll/salaries').then(r=>r.data),
    enabled: isDirector,
  });
  const { data: runs } = useQuery({
    queryKey:['payroll','runs'],
    queryFn:()=>api.get('/payroll/runs').then(r=>r.data),
    enabled: isDirector,
  });
  const { data: runDetail } = useQuery({
    queryKey:['payroll','run',openRun],
    queryFn:()=>api.get(`/payroll/runs/${openRun}`).then(r=>r.data),
    enabled: isDirector && !!openRun,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey:['payroll'] });

  const saveSalary = useMutation({
    mutationFn: (d) => api.put(`/payroll/salaries/${d.user_id}`, d).then(r=>r.data),
    onSuccess: () => { invalidate(); toast.success('Salary saved'); setSalaryModal(null); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });
  const createRun = useMutation({
    mutationFn: (d) => api.post('/payroll/runs', d).then(r=>r.data),
    onSuccess: (run) => { invalidate(); toast.success('Draft run created'); setRunModal(false); setOpenRun(run.id); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });
  const saveSlip = useMutation({
    mutationFn: (d) => api.put(`/payroll/payslips/${d.id}`, d).then(r=>r.data),
    onSuccess: () => { invalidate(); toast.success('Payslip updated'); setSlipEdit(null); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });
  const finalize = useMutation({
    mutationFn: (id) => api.post(`/payroll/runs/${id}/finalize`).then(r=>r.data),
    onSuccess: () => { invalidate(); toast.success('Run finalized — payslips are now visible to employees'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });
  const removeRun = useMutation({
    mutationFn: (id) => api.delete(`/payroll/runs/${id}`).then(r=>r.data),
    onSuccess: () => { invalidate(); toast.success('Draft deleted'); setOpenRun(null); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  if (!isDirector) {
    return <p style={{ color:colors.textMuted }}>Only Directors can manage payroll. Your payslips are under “My Payslips”.</p>;
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h1 style={s.h1}>Payroll</h1>
        {tab === 'runs' && <button style={s.btn} onClick={() => setRunModal(true)}>+ New Payroll Run</button>}
      </div>

      <div style={s.tabs}>
        {[['runs', 'Runs'], ['salaries', 'Salaries']].map(([k, label]) => (
          <button key={k} style={{ ...s.tab, ...(tab === k ? s.tabActive : {}) }} onClick={() => { setTab(k); setOpenRun(null); }}>{label}</button>
        ))}
      </div>

      {tab === 'salaries' && (
        <div style={{ ...s.card, overflowX:'auto' }}>
          <p style={{ ...s.meta, marginBottom:12 }}>
            Monthly base + allowance/deduction lines per employee. Statutory items (PF, ESI, TDS) are manual
            deduction lines — Paimal doesn't compute them.
          </p>
          <table style={{ borderCollapse:'collapse', width:'100%' }}>
            <thead><tr><th style={s.th}>Employee</th><th style={s.th}>Base / month</th><th style={s.th}>Allowances</th><th style={s.th}>Deductions</th><th style={s.th}></th></tr></thead>
            <tbody>
              {salaries?.map((r) => {
                const items = r.line_items || [];
                const sum = (type) => items.filter((i) => i.type === type).reduce((a, i) => a + Number(i.amount || 0), 0);
                return (
                  <tr key={r.user_id}>
                    <td style={{ ...s.td, fontWeight:600 }}>{r.name}{r.job_title ? <span style={{ color:colors.textMuted, fontWeight:400 }}> · {r.job_title}</span> : ''}</td>
                    <td style={s.td}>{r.id ? inr(r.monthly_base) : <span style={{ color:colors.textFaint }}>Not set</span>}</td>
                    <td style={s.td}>{r.id ? inr(sum('allowance')) : '—'}</td>
                    <td style={s.td}>{r.id ? inr(sum('deduction')) : '—'}</td>
                    <td style={s.td}>
                      <button style={{ ...s.btnGhost, padding:'5px 12px', fontSize:12 }}
                        onClick={() => setSalaryModal({ user_id: r.user_id, name: r.name, monthly_base: r.monthly_base || '', line_items: items })}>
                        {r.id ? 'Edit' : 'Set salary'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'runs' && !openRun && (
        <div style={{ display:'grid', gap:12 }}>
          {runs?.map((r) => (
            <div key={r.id} style={{ ...s.card, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }} onClick={() => setOpenRun(r.id)}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:colors.navy }}>{format(new Date(`${r.month}-01`), 'MMMM yyyy')}</div>
                <div style={s.meta}>{r.payslip_count} payslip(s) · {r.working_days} working days · total net {inr(r.total_net)}</div>
              </div>
              <span style={{ ...s.badge, background: r.status === 'Finalized' ? colors.greenBg : colors.amberBg, color: r.status === 'Finalized' ? colors.green : colors.amber }}>
                {r.status}
              </span>
            </div>
          ))}
          {runs?.length === 0 && <p style={{ color:colors.textFaint }}>No payroll runs yet. Set salaries first, then create a run.</p>}
        </div>
      )}

      {tab === 'runs' && openRun && runDetail && (
        <div style={{ ...s.card, overflowX:'auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10 }}>
            <div>
              <button style={{ ...s.btnGhost, marginRight:10, padding:'4px 10px' }} onClick={() => setOpenRun(null)}>‹ Back</button>
              <span style={{ fontSize:16, fontWeight:700, color:colors.navy }}>{format(new Date(`${runDetail.month}-01`), 'MMMM yyyy')}</span>
              <span style={{ ...s.badge, marginLeft:10, background: runDetail.status === 'Finalized' ? colors.greenBg : colors.amberBg, color: runDetail.status === 'Finalized' ? colors.green : colors.amber }}>
                {runDetail.status}
              </span>
            </div>
            {runDetail.status === 'Draft' && (
              <div style={{ display:'flex', gap:8 }}>
                <button style={{ ...s.btnGhost, color:colors.red }} onClick={() => { if (confirm('Delete this draft run?')) removeRun.mutate(runDetail.id); }}>Delete draft</button>
                <button style={{ ...s.btn, background:colors.green }} onClick={() => { if (confirm('Finalize? Payslips lock and become visible to employees.')) finalize.mutate(runDetail.id); }}>
                  Finalize
                </button>
              </div>
            )}
          </div>
          <table style={{ borderCollapse:'collapse', width:'100%' }}>
            <thead><tr>
              <th style={s.th}>Employee</th><th style={s.th}>Base</th><th style={s.th}>LOP days</th>
              <th style={s.th}>LOP</th><th style={s.th}>Gross</th><th style={s.th}>Deductions</th><th style={s.th}>Net</th><th style={s.th}></th>
            </tr></thead>
            <tbody>
              {runDetail.payslips?.map((p) => (
                <tr key={p.id}>
                  <td style={{ ...s.td, fontWeight:600 }}>{p.name}</td>
                  <td style={s.td}>{inr(p.monthly_base)}</td>
                  <td style={s.td}>{Number(p.lop_days)}</td>
                  <td style={{ ...s.td, color: Number(p.lop_amount) > 0 ? colors.red : colors.text }}>−{inr(p.lop_amount)}</td>
                  <td style={s.td}>{inr(p.gross)}</td>
                  <td style={s.td}>−{inr(p.deductions_total)}</td>
                  <td style={{ ...s.td, fontWeight:700 }}>{inr(p.net_pay)}</td>
                  <td style={s.td}>
                    {runDetail.status === 'Draft' && (
                      <button style={{ ...s.btnGhost, padding:'4px 10px', fontSize:12 }}
                        onClick={() => setSlipEdit({ ...p, line_items: p.line_items || [] })}>Edit</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...s.td, fontWeight:700 }}>Total</td>
                <td style={s.td} colSpan={5}></td>
                <td style={{ ...s.td, fontWeight:800 }}>{inr(runDetail.payslips?.reduce((a, p) => a + Number(p.net_pay), 0))}</td>
                <td style={s.td}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Salary modal */}
      {salaryModal && (
        <div style={s.modal} onClick={(e) => { if (e.target === e.currentTarget) setSalaryModal(null); }}>
          <div style={s.mcard}>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>Salary — {salaryModal.name}</h2>
            <form onSubmit={(e) => { e.preventDefault(); saveSalary.mutate(salaryModal); }}>
              <label style={s.label}>Monthly Base (₹) *</label>
              <input style={s.input} type="number" min="0" step="0.01" value={salaryModal.monthly_base}
                onChange={(e) => setSalaryModal((m) => ({ ...m, monthly_base: e.target.value }))} required />
              <label style={s.label}>Allowances & Deductions</label>
              <LineItems items={salaryModal.line_items} onChange={(items) => setSalaryModal((m) => ({ ...m, line_items: items }))} />
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button type="button" style={{ ...s.btn, background:colors.bgAlt, color:colors.text }} onClick={() => setSalaryModal(null)}>Cancel</button>
                <button type="submit" style={s.btn} disabled={saveSalary.isPending}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New run modal */}
      {runModal && (
        <div style={s.modal} onClick={(e) => { if (e.target === e.currentTarget) setRunModal(false); }}>
          <div style={s.mcard}>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>New Payroll Run</h2>
            <p style={{ ...s.meta, marginBottom:16 }}>
              Creates draft payslips for every employee with a salary. LOP days are suggested from
              attendance and approved paid leave — you can adjust each payslip before finalizing.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); createRun.mutate({ month: runMonth }); }}>
              <label style={s.label}>Month *</label>
              <input style={s.input} type="month" value={runMonth} onChange={(e) => setRunMonth(e.target.value)} required />
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button type="button" style={{ ...s.btn, background:colors.bgAlt, color:colors.text }} onClick={() => setRunModal(false)}>Cancel</button>
                <button type="submit" style={s.btn} disabled={createRun.isPending}>{createRun.isPending ? 'Creating…' : 'Create Draft'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip edit modal */}
      {slipEdit && (
        <div style={s.modal} onClick={(e) => { if (e.target === e.currentTarget) setSlipEdit(null); }}>
          <div style={s.mcard}>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>Payslip — {slipEdit.name}</h2>
            <form onSubmit={(e) => { e.preventDefault(); saveSlip.mutate({ id: slipEdit.id, lop_days: Number(slipEdit.lop_days), line_items: slipEdit.line_items }); }}>
              <label style={s.label}>LOP days</label>
              <input style={s.input} type="number" min="0" step="0.5" value={slipEdit.lop_days}
                onChange={(e) => setSlipEdit((m) => ({ ...m, lop_days: e.target.value }))} />
              <label style={s.label}>Line items (this month)</label>
              <LineItems items={slipEdit.line_items} onChange={(items) => setSlipEdit((m) => ({ ...m, line_items: items }))} />
              <div style={{ display:'flex', gap:10, marginTop:8 }}>
                <button type="button" style={{ ...s.btn, background:colors.bgAlt, color:colors.text }} onClick={() => setSlipEdit(null)}>Cancel</button>
                <button type="submit" style={s.btn} disabled={saveSlip.isPending}>Save & Recompute</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
