import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useLogs, useDeleteLog } from '../hooks/useLogs';
import { useAuth } from '../hooks/useAuth';

const s = {
  h1:      { fontSize:22, fontWeight:700, color:'#1e3a5f', marginBottom:16 },
  toolbar: { display:'flex', gap:12, marginBottom:16, flexWrap:'wrap', alignItems:'center' },
  input:   { padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13 },
  btn:     { padding:'8px 16px', background:'#2563eb', color:'#fff', border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer', textDecoration:'none', display:'inline-block' },
  table:   { width:'100%', borderCollapse:'collapse', background:'#fff', borderRadius:10, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.08)' },
  th:      { padding:'10px 14px', background:'#f8fafc', textAlign:'left', fontSize:12, fontWeight:700, color:'#64748b', borderBottom:'1px solid #e2e8f0', textTransform:'uppercase', letterSpacing:.5 },
  td:      { padding:'10px 14px', fontSize:13, borderBottom:'1px solid #f1f5f9', color:'#374151' },
  badge:   { display:'inline-block', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600 },
  delBtn:  { padding:'4px 10px', background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:5, cursor:'pointer', fontSize:12 },
};

const activityColors = { PM:'#dbeafe', BD:'#fee2e2', IN:'#dcfce7', TR:'#fef9c3', SV:'#f3e8ff', OF:'#e0f2fe', TL:'#fce7f3', LV:'#f1f5f9' };
const activityText   = { PM:'#1d4ed8', BD:'#dc2626', IN:'#16a34a', TR:'#ca8a04', SV:'#7c3aed', OF:'#0369a1', TL:'#be185d', LV:'#475569' };

export default function Logs() {
  const { user } = useAuth();
  const deleteLog = useDeleteLog();
  const [filters, setFilters] = useState({ date_from:'', date_to:'' });
  const { data, isLoading } = useLogs(filters);

  const handleDelete = async (id) => {
    if (!confirm('Delete this log?')) return;
    try {
      await deleteLog.mutateAsync(id);
      toast.success('Deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h1 style={s.h1}>Activity Logs</h1>
        <Link to="/logs/new" style={s.btn}>+ New Log</Link>
      </div>

      <div style={s.toolbar}>
        <input style={s.input} type="date" value={filters.date_from} onChange={e=>setFilters(f=>({...f,date_from:e.target.value}))} />
        <span style={{ color:'#64748b' }}>to</span>
        <input style={s.input} type="date" value={filters.date_to} onChange={e=>setFilters(f=>({...f,date_to:e.target.value}))} />
        {(filters.date_from||filters.date_to) && (
          <button style={{ ...s.btn, background:'#64748b' }} onClick={()=>setFilters({date_from:'',date_to:''})}>Clear</button>
        )}
        <span style={{ marginLeft:'auto', color:'#64748b', fontSize:13 }}>
          {data?.total ?? 0} records
        </span>
      </div>

      {isLoading ? <p>Loading…</p> : (
        <div style={{ overflowX:'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Date','Engineer','Customer','Activity','Hours','Billing','Status','Notes',''].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.data?.length === 0 && (
                <tr><td colSpan={9} style={{ ...s.td, textAlign:'center', color:'#94a3b8', padding:32 }}>No logs found</td></tr>
              )}
              {data?.data?.map(log => (
                <tr key={log.id}>
                  <td style={s.td}>{format(new Date(log.date), 'dd MMM yy')}</td>
                  <td style={s.td}>{log.engineer_name}</td>
                  <td style={s.td}>{log.customer_name || '—'}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background:activityColors[log.activity_code]||'#f1f5f9', color:activityText[log.activity_code]||'#475569' }}>
                      {log.activity_code}
                    </span>
                  </td>
                  <td style={s.td}>{log.hours ?? '—'}</td>
                  <td style={s.td}>{log.billing_inr > 0 ? `₹${Number(log.billing_inr).toLocaleString('en-IN')}` : '—'}</td>
                  <td style={s.td}>{log.status || '—'}</td>
                  <td style={{ ...s.td, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {log.notes || '—'}
                  </td>
                  <td style={s.td}>
                    {['Director','Manager'].includes(user?.role) && (
                      <button style={s.delBtn} onClick={()=>handleDelete(log.id)}>Del</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
