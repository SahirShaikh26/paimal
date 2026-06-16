import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths, startOfMonth } from 'date-fns';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import api from '../api/client';

const COLORS = ['#2563eb','#059669','#d97706','#7c3aed','#dc2626','#0891b2','#be185d'];
const card = { background:'#fff', borderRadius:10, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,.08)' };

export default function Analytics() {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(subMonths(new Date(),5)), 'yyyy-MM-dd'));
  const [dateTo,   setDateTo]   = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data, isLoading } = useQuery({
    queryKey: ['reports-summary', dateFrom, dateTo],
    queryFn: () => api.get('/reports/summary', { params: { date_from:dateFrom, date_to:dateTo } }).then(r=>r.data),
  });

  const s = {
    h1:    { fontSize:22, fontWeight:700, color:'#1e3a5f', marginBottom:4 },
    filter:{ display:'flex', gap:12, alignItems:'center', marginBottom:24, flexWrap:'wrap' },
    label: { fontSize:13, color:'#64748b' },
    input: { padding:'7px 12px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13 },
    grid:  { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20, marginBottom:20 },
  };

  return (
    <div>
      <h1 style={s.h1}>Analytics</h1>
      <div style={s.filter}>
        <span style={s.label}>From</span>
        <input style={s.input} type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
        <span style={s.label}>To</span>
        <input style={s.input} type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
      </div>

      {isLoading ? <p>Loading…</p> : (
        <>
          <div style={s.grid}>
            {/* Monthly trend */}
            <div style={card}>
              <h3 style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Monthly Billing Trend (₹)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.by_month||[]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize:11 }} />
                  <YAxis tick={{ fontSize:11 }} />
                  <Tooltip formatter={v=>`₹${Number(v).toLocaleString('en-IN')}`} />
                  <Bar dataKey="billing" fill="#2563eb" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Activity breakdown pie */}
            <div style={card}>
              <h3 style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Activity Breakdown</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data?.by_activity||[]} dataKey="count" nameKey="activity_code" cx="50%" cy="50%" outerRadius={70} label={({activity_code,percent})=>`${activity_code} ${(percent*100).toFixed(0)}%`}>
                    {(data?.by_activity||[]).map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Engineer bar chart */}
          <div style={{ ...card, marginBottom:20 }}>
            <h3 style={{ fontSize:15, fontWeight:600, marginBottom:16 }}>Engineer Performance</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.by_engineer||[]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize:11 }} />
                <YAxis tick={{ fontSize:11 }} />
                <Tooltip formatter={v=>`₹${Number(v).toLocaleString('en-IN')}`} />
                <Legend />
                <Bar dataKey="billing" name="Billing (₹)" fill="#2563eb" radius={[3,3,0,0]} />
                <Bar dataKey="hours" name="Hours" fill="#059669" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Activity table */}
          <div style={card}>
            <h3 style={{ fontSize:15, fontWeight:600, marginBottom:12 }}>Activity Summary</h3>
            <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:'2px solid #e2e8f0' }}>
                  {['Code','Count','Hours','Billing'].map(h=><th key={h} style={{ textAlign:'left', padding:'8px 12px', color:'#64748b', fontWeight:600 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {(data?.by_activity||[]).map(a=>(
                  <tr key={a.activity_code} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'8px 12px', fontWeight:700 }}>{a.activity_code}</td>
                    <td style={{ padding:'8px 12px' }}>{a.count}</td>
                    <td style={{ padding:'8px 12px' }}>{Number(a.hours||0).toFixed(1)}</td>
                    <td style={{ padding:'8px 12px' }}>₹{Number(a.billing||0).toLocaleString('en-IN')}</td>
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
