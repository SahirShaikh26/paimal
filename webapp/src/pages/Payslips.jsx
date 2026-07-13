import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import colors from '../theme';

const s = {
  h1: { fontSize:22, fontWeight:700, color:colors.navy, marginBottom:20 },
  card: { background:colors.white, borderRadius:10, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)' },
  btn: { padding:'8px 16px', background:colors.navy, color:colors.white, border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer' },
  meta: { fontSize:13, color:colors.textMuted },
  modal: { position:'fixed', inset:0, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 },
  mcard: { background:colors.white, borderRadius:12, padding:32, width:'min(560px, calc(100vw - 32px))', maxHeight:'90vh', overflowY:'auto' },
  th: { textAlign:'left', padding:'6px 8px', fontSize:12, fontWeight:700, color:colors.textMuted, borderBottom:`2px solid ${colors.border}` },
  td: { padding:'6px 8px', fontSize:13, color:colors.text, borderBottom:`1px solid ${colors.border}` },
};

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function Payslips() {
  const { user } = useAuth();
  const [open, setOpen] = useState(null);

  const { data: slips } = useQuery({
    queryKey:['payroll','payslips','me'],
    queryFn:()=>api.get('/payroll/payslips/me').then(r=>r.data),
  });
  const { data: tenant } = useQuery({
    queryKey:['tenant-settings'],
    queryFn:()=>api.get('/tenant').then(r=>r.data),
  });

  const slip = open ? slips?.find((p) => p.id === open) : null;
  const allowances = (slip?.line_items || []).filter((i) => i.type === 'allowance');
  const deductions = (slip?.line_items || []).filter((i) => i.type === 'deduction');

  return (
    <div>
      <h1 style={s.h1}>My Payslips</h1>
      <div style={{ display:'grid', gap:10, maxWidth:560 }}>
        {slips?.map((p) => (
          <div key={p.id} style={{ ...s.card, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', cursor:'pointer' }}
            onClick={() => setOpen(p.id)}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:colors.navy }}>{format(new Date(`${p.month}-01`), 'MMMM yyyy')}</div>
              <div style={s.meta}>{Number(p.lop_days) > 0 ? `${Number(p.lop_days)} LOP day(s) · ` : ''}gross {inr(p.gross)}</div>
            </div>
            <span style={{ fontSize:15, fontWeight:800, color:colors.accent }}>{inr(p.net_pay)}</span>
          </div>
        ))}
        {slips?.length === 0 && <p style={{ color:colors.textFaint }}>No payslips yet — they appear here once payroll is finalized.</p>}
      </div>

      {slip && (
        <div style={s.modal} onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
          <div style={s.mcard}>
            <div id="payslip-print">
              <div style={{ borderBottom:`2px solid ${colors.navy}`, paddingBottom:12, marginBottom:16 }}>
                <div style={{ fontSize:18, fontWeight:800, color:colors.navy }}>{tenant?.name || 'Company'}</div>
                <div style={s.meta}>Payslip — {format(new Date(`${slip.month}-01`), 'MMMM yyyy')}</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:16, fontSize:13 }}>
                <div><span style={{ color:colors.textMuted }}>Employee: </span><b>{user?.name}</b></div>
                <div><span style={{ color:colors.textMuted }}>Working days: </span>{slip.working_days}</div>
                <div><span style={{ color:colors.textMuted }}>LOP days: </span>{Number(slip.lop_days)}</div>
                <div><span style={{ color:colors.textMuted }}>Generated: </span>{format(new Date(slip.created_at), 'dd MMM yyyy')}</div>
              </div>

              <table style={{ borderCollapse:'collapse', width:'100%', marginBottom:16 }}>
                <thead><tr><th style={s.th}>Earnings</th><th style={{ ...s.th, textAlign:'right' }}>Amount</th></tr></thead>
                <tbody>
                  <tr><td style={s.td}>Basic salary</td><td style={{ ...s.td, textAlign:'right' }}>{inr(slip.monthly_base)}</td></tr>
                  {allowances.map((i, k) => (
                    <tr key={k}><td style={s.td}>{i.label}</td><td style={{ ...s.td, textAlign:'right' }}>{inr(i.amount)}</td></tr>
                  ))}
                  {Number(slip.lop_amount) > 0 && (
                    <tr><td style={{ ...s.td, color:colors.red }}>Loss of pay ({Number(slip.lop_days)} day(s))</td>
                      <td style={{ ...s.td, textAlign:'right', color:colors.red }}>−{inr(slip.lop_amount)}</td></tr>
                  )}
                  <tr><td style={{ ...s.td, fontWeight:700 }}>Gross</td><td style={{ ...s.td, textAlign:'right', fontWeight:700 }}>{inr(slip.gross)}</td></tr>
                </tbody>
              </table>

              {deductions.length > 0 && (
                <table style={{ borderCollapse:'collapse', width:'100%', marginBottom:16 }}>
                  <thead><tr><th style={s.th}>Deductions</th><th style={{ ...s.th, textAlign:'right' }}>Amount</th></tr></thead>
                  <tbody>
                    {deductions.map((i, k) => (
                      <tr key={k}><td style={s.td}>{i.label}</td><td style={{ ...s.td, textAlign:'right' }}>−{inr(i.amount)}</td></tr>
                    ))}
                    <tr><td style={{ ...s.td, fontWeight:700 }}>Total deductions</td><td style={{ ...s.td, textAlign:'right', fontWeight:700 }}>−{inr(slip.deductions_total)}</td></tr>
                  </tbody>
                </table>
              )}

              <div style={{ background:colors.blueBg, borderRadius:8, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:14, fontWeight:700, color:colors.navy }}>Net Pay</span>
                <span style={{ fontSize:18, fontWeight:800, color:colors.blueDark }}>{inr(slip.net_pay)}</span>
              </div>
            </div>

            <div style={{ display:'flex', gap:10, marginTop:20 }} className="no-print">
              <button style={{ ...s.btn, background:colors.bgAlt, color:colors.text }} onClick={() => setOpen(null)}>Close</button>
              <button style={s.btn} onClick={() => window.print()}>Print</button>
            </div>
          </div>
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #payslip-print, #payslip-print * { visibility: visible; }
              #payslip-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
