import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client';

const card = { background:'#fff', borderRadius:10, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)' };
const statCard = { ...card, textAlign:'center' };

function StatCard({ label, value, color = '#2563eb' }) {
  return (
    <div style={statCard}>
      <div style={{ fontSize:28, fontWeight:800, color }}>{value ?? '—'}</div>
      <div style={{ fontSize:13, color:'#64748b', marginTop:4 }}>{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const dateFrom = format(startOfMonth(new Date()), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['reports-summary', dateFrom],
    queryFn: () => api.get('/reports/summary', { params: { date_from: dateFrom } }).then(r => r.data),
  });

  const t = data?.totals;

  return (
    <div>
      <h1 style={{ fontSize:22, fontWeight:700, color:'#1e3a5f', marginBottom:4 }}>Dashboard</h1>
      <p style={{ color:'#64748b', fontSize:14, marginBottom:24 }}>Month to date — {format(new Date(), 'MMMM yyyy')}</p>

      {isLoading ? <p>Loading…</p> : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:16, marginBottom:28 }}>
            <StatCard label="Activity Logs" value={t?.total_logs} />
            <StatCard label="Total Hours" value={t?.total_hours ? Number(t.total_hours).toFixed(1) : 0} color="#059669" />
            <StatCard label="Billing (₹)" value={t?.total_billing ? `₹${Number(t.total_billing).toLocaleString('en-IN')}` : '₹0'} color="#d97706" />
            <StatCard label="Engineers Active" value={t?.active_engineers} color="#7c3aed" />
            <StatCard label="Customers Served" value={t?.customers_served} color="#0891b2" />
          </div>

          {data?.by_month?.length > 0 && (
            <div style={{ ...card, marginBottom:24 }}>
              <h2 style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>Monthly Billing (₹)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.by_month}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize:12 }} />
                  <YAxis tick={{ fontSize:12 }} />
                  <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                  <Bar dataKey="billing" fill="#2563eb" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {data?.by_engineer?.length > 0 && (
            <div style={card}>
              <h2 style={{ fontSize:16, fontWeight:600, marginBottom:12 }}>Engineer Performance</h2>
              <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
                <thead>
                  <tr style={{ borderBottom:'2px solid #e2e8f0' }}>
                    {['Engineer','Logs','Hours','Billing'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'8px 12px', color:'#64748b', fontWeight:600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.by_engineer.map((e) => (
                    <tr key={e.engineer_id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'8px 12px', fontWeight:500 }}>{e.name}</td>
                      <td style={{ padding:'8px 12px' }}>{e.logs}</td>
                      <td style={{ padding:'8px 12px' }}>{Number(e.hours||0).toFixed(1)}</td>
                      <td style={{ padding:'8px 12px' }}>₹{Number(e.billing||0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
