import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useLogs, useDeleteLog } from '../hooks/useLogs';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';
import colors from '../theme';

const s = {
  h1:      { fontSize:22, fontWeight:700, color:colors.navy, marginBottom:16 },
  toolbar: { display:'flex', gap:12, marginBottom:16, flexWrap:'wrap', alignItems:'center' },
  input:   { padding:'8px 12px', border:`1px solid ${colors.borderInput}`, borderRadius:7, fontSize:13 },
  btn:     { padding:'8px 16px', background:colors.blue, color:colors.white, border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer', textDecoration:'none', display:'inline-block' },
  table:   { width:'100%', borderCollapse:'collapse', background:colors.white, borderRadius:10, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.08)' },
  th:      { padding:'10px 14px', background:colors.bgSlate, textAlign:'left', fontSize:12, fontWeight:700, color:colors.textMuted, borderBottom:`1px solid ${colors.border}`, textTransform:'uppercase', letterSpacing:.5 },
  td:      { padding:'10px 14px', fontSize:13, borderBottom:`1px solid ${colors.bgAlt}`, color:colors.text },
  badge:   { display:'inline-block', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600 },
  delBtn:  { padding:'4px 10px', background:colors.redBg, color:colors.red, border:'none', borderRadius:5, cursor:'pointer', fontSize:12 },
};

export default function Logs() {
  const { user } = useAuth();
  const deleteLog = useDeleteLog();
  const [filters, setFilters] = useState({ date_from:'', date_to:'' });
  const { data, isLoading } = useLogs(filters);
  const { data: activityTypes } = useQuery({ queryKey:['activity-types'], queryFn:()=>api.get('/activity-types').then(r=>r.data) });
  const activityTypeMap = Object.fromEntries((activityTypes || []).map(t => [t.code, t]));

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
        <span style={{ color:colors.textMuted }}>to</span>
        <input style={s.input} type="date" value={filters.date_to} onChange={e=>setFilters(f=>({...f,date_to:e.target.value}))} />
        {(filters.date_from||filters.date_to) && (
          <button style={{ ...s.btn, background:colors.textMuted }} onClick={()=>setFilters({date_from:'',date_to:''})}>Clear</button>
        )}
        <span style={{ marginLeft:'auto', color:colors.textMuted, fontSize:13 }}>
          {data?.total ?? 0} records
        </span>
      </div>

      {isLoading ? <p>Loading…</p> : (
        <div style={{ overflowX:'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>
                {['Date','Engineer','Customer','Activity','Mode','Hours','Bill?','Billing','Status','Notes','Photos',''].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.data?.length === 0 && (
                <tr><td colSpan={12} style={{ ...s.td, textAlign:'center', color:colors.textFaint, padding:32 }}>No logs found</td></tr>
              )}
              {data?.data?.map(log => (
                <tr key={log.id}>
                  <td style={s.td}>{format(new Date(log.date), 'dd MMM yy')}</td>
                  <td style={s.td}>{log.engineer_name}</td>
                  <td style={s.td}>{log.customer_name || '—'}</td>
                  <td style={s.td}>
                    <span style={{
                      ...s.badge,
                      background: activityTypeMap[log.activity_code] ? `${activityTypeMap[log.activity_code].color}1A` : colors.bgAlt,
                      color: activityTypeMap[log.activity_code]?.color || '#475569',
                    }}>
                      {log.activity_code}
                    </span>
                  </td>
                  <td style={s.td}>{log.work_mode || '—'}</td>
                  <td style={s.td}>{log.hours ?? '—'}{log.ticket_no ? <span style={{ display:'block', fontSize:10, color:colors.textFaint }}>{log.ticket_no}</span> : null}</td>
                  <td style={s.td}>{log.billable === false ? '—' : '✓'}</td>
                  <td style={s.td}>{log.billing_inr > 0 ? `₹${Number(log.billing_inr).toLocaleString('en-IN')}` : '—'}</td>
                  <td style={s.td}>{log.status || '—'}</td>
                  <td style={{ ...s.td, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {log.notes || '—'}
                  </td>
                  <td style={s.td}>
                    {log.photo_urls?.length > 0 && (
                      <div style={{ display:'flex', gap:4 }}>
                        {log.photo_urls.slice(0, 3).map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer">
                            <img src={url} alt="" style={{ width:32, height:32, objectFit:'cover', borderRadius:5, border:`1px solid ${colors.border}` }} />
                          </a>
                        ))}
                        {log.photo_urls.length > 3 && (
                          <span style={{ fontSize:11, color:colors.textMuted, alignSelf:'center' }}>+{log.photo_urls.length - 3}</span>
                        )}
                      </div>
                    )}
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
