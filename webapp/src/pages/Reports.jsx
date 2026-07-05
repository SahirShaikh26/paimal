import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import colors from '../theme';

const card = { background:colors.white, borderRadius:10, padding:24, boxShadow:'0 1px 4px rgba(0,0,0,.08)', marginBottom:20 };
const s = {
  h1:    { fontSize:22, fontWeight:700, color:colors.navy, marginBottom:20 },
  filter:{ display:'flex', gap:12, alignItems:'center', marginBottom:24, flexWrap:'wrap' },
  label: { fontSize:13, color:colors.textMuted },
  input: { padding:'7px 12px', border:`1px solid ${colors.borderInput}`, borderRadius:7, fontSize:13 },
  btn:   { padding:'8px 16px', background:colors.blue, color:colors.white, border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer' },
  th:    { textAlign:'left', padding:'8px 12px', color:colors.textMuted, fontWeight:600, fontSize:12, textTransform:'uppercase', borderBottom:`2px solid ${colors.border}` },
  td:    { padding:'8px 12px', fontSize:13, borderBottom:`1px solid ${colors.bgAlt}` },
};

export default function Reports() {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo,   setDateTo]   = useState(format(new Date(), 'yyyy-MM-dd'));

  const canExport = ['Director','Manager'].includes(user?.role);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reports-summary-reports', dateFrom, dateTo],
    queryFn: () => api.get('/reports/summary', { params: { date_from:dateFrom, date_to:dateTo } }).then(r=>r.data),
  });

  const handleExport = async () => {
    try {
      const res = await api.get('/reports/export/csv', {
        params: { date_from:dateFrom, date_to:dateTo },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fieldpilot-${dateFrom}-to-${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  const t = data?.totals;

  return (
    <div>
      <h1 style={s.h1}>Reports</h1>

      <div style={s.filter}>
        <span style={s.label}>From</span>
        <input style={s.input} type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
        <span style={s.label}>To</span>
        <input style={s.input} type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
        <button style={s.btn} onClick={()=>refetch()}>Run Report</button>
        {canExport && <button style={{ ...s.btn, background:'#059669' }} onClick={handleExport}>Export CSV</button>}

      </div>

      {isLoading ? <p>Loading…</p> : t && (
        <>
          <div style={{ ...card }}>
            <h3 style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>Summary</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12 }}>
              {[
                { label:'Total Logs',       value: t.total_logs },
                { label:'Total Hours',      value: Number(t.total_hours||0).toFixed(1) },
                { label:'Total Billing',    value: `₹${Number(t.total_billing||0).toLocaleString('en-IN')}` },
                { label:'Total Cost',       value: `₹${Number(t.total_cost||0).toLocaleString('en-IN')}` },
                { label:'Gross Margin',     value: t.total_billing && t.total_cost ? `₹${Number(t.total_billing - t.total_cost).toLocaleString('en-IN')}` : '—' },
                { label:'Customers Served', value: t.customers_served },
              ].map(({ label, value }) => (
                <div key={label} style={{ background:colors.bgSlate, borderRadius:8, padding:'12px 16px' }}>
                  <div style={{ fontSize:18, fontWeight:800, color:colors.navy }}>{value}</div>
                  <div style={{ fontSize:12, color:colors.textMuted, marginTop:3 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <h3 style={{ fontSize:16, fontWeight:600, marginBottom:12 }}>By Engineer</h3>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    {['Engineer','Logs','Hours','Billing (₹)','Cost (₹)'].map(h=><th key={h} style={s.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(data?.by_engineer||[]).map(e=>(
                    <tr key={e.engineer_id}>
                      <td style={{ ...s.td, fontWeight:600 }}>{e.name}</td>
                      <td style={s.td}>{e.logs}</td>
                      <td style={s.td}>{Number(e.hours||0).toFixed(1)}</td>
                      <td style={s.td}>₹{Number(e.billing||0).toLocaleString('en-IN')}</td>
                      <td style={s.td}>₹{Number(e.cost||0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={card}>
            <h3 style={{ fontSize:16, fontWeight:600, marginBottom:12 }}>Monthly Breakdown</h3>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>{['Month','Logs','Hours','Billing (₹)'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {(data?.by_month||[]).map(m=>(
                    <tr key={m.month}>
                      <td style={{ ...s.td, fontWeight:600 }}>{m.month}</td>
                      <td style={s.td}>{m.logs}</td>
                      <td style={s.td}>{Number(m.hours||0).toFixed(1)}</td>
                      <td style={s.td}>₹{Number(m.billing||0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
