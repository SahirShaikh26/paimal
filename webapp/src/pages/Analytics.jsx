import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths, startOfMonth } from 'date-fns';
import api from '../api/client';
import colors from '../theme';

// Hand-rolled SVG/CSS charts — no recharts (that was ~152 kB gzip lazy-loaded
// only here). These render instantly and add nothing to the bundle.
const SLICE = ['#E4881F', '#3F8F5B', '#C08A1B', '#7c3aed', '#C0492F', '#0891b2', '#be185d'];
const card = { background: colors.white, borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(28,24,18,.08)', border: `1px solid ${colors.border}` };
const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

// Vertical bars, one or two series per category.
function Bars({ data, series, labelKey, height = 190 }) {
  const max = Math.max(...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)), 1);
  if (!data.length) return <div style={{ color: colors.textMuted, fontSize: 13, padding: '30px 0', textAlign: 'center' }}>No data for this range.</div>;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height, paddingTop: 6 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 0, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: '100%', width: '100%', justifyContent: 'center' }}>
              {series.map((s) => {
                const val = Number(d[s.key]) || 0;
                return <div key={s.key} title={`${d[labelKey]} · ${s.label}: ${s.fmt ? s.fmt(val) : val}`}
                  style={{ width: series.length > 1 ? 14 : 26, height: `${Math.max((val / max) * 100, 1.5)}%`, background: s.color, borderRadius: '4px 4px 0 0', transition: 'height .3s ease' }} />;
              })}
            </div>
            <div style={{ fontSize: 10.5, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{d[labelKey]}</div>
          </div>
        ))}
      </div>
      {series.length > 1 && (
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12 }}>
          {series.map((s) => (
            <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: colors.textMuted }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: s.color }} />{s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// SVG donut using the r=15.915 (circumference=100) trick → dasharray is percent.
function Donut({ data, valueKey, labelKey }) {
  const total = data.reduce((s, d) => s + (Number(d[valueKey]) || 0), 0);
  if (!total) return <div style={{ color: colors.textMuted, fontSize: 13, padding: '30px 0', textAlign: 'center' }}>No activity in this range.</div>;
  let acc = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg viewBox="0 0 42 42" width={150} height={150} style={{ flexShrink: 0 }}>
        <circle cx="21" cy="21" r="15.915" fill="none" stroke={colors.bgAlt} strokeWidth="5" />
        {data.map((d, i) => {
          const pct = ((Number(d[valueKey]) || 0) / total) * 100;
          const seg = <circle key={i} cx="21" cy="21" r="15.915" fill="none" stroke={SLICE[i % SLICE.length]} strokeWidth="5"
            strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={25 - acc} />;
          acc += pct;
          return seg;
        })}
        <text x="21" y="20.5" textAnchor="middle" style={{ fontSize: 6, fontWeight: 700, fill: colors.textDark }}>{total}</text>
        <text x="21" y="25.5" textAnchor="middle" style={{ fontSize: 2.6, fill: colors.textMuted }}>logs</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 120 }}>
        {data.map((d, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: SLICE[i % SLICE.length], flexShrink: 0 }} />
            <b style={{ fontWeight: 700 }}>{d[labelKey]}</b>
            <span style={{ color: colors.textMuted }}>{d[valueKey]} · {(((Number(d[valueKey]) || 0) / total) * 100).toFixed(0)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Analytics() {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data, isLoading } = useQuery({
    queryKey: ['reports-summary', dateFrom, dateTo],
    queryFn: () => api.get('/reports/summary', { params: { date_from: dateFrom, date_to: dateTo } }).then((r) => r.data),
  });

  const s = {
    h1: { fontSize: 22, fontWeight: 700, color: colors.navy, marginBottom: 4 },
    filter: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' },
    label: { fontSize: 13, color: colors.textMuted },
    input: { padding: '7px 12px', border: `1px solid ${colors.borderInput}`, borderRadius: 8, fontSize: 13 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20, marginBottom: 20 },
    h3: { fontSize: 15, fontWeight: 700, marginBottom: 16, color: colors.navy },
  };

  return (
    <div>
      <h1 style={s.h1}>Analytics</h1>
      <div style={s.filter}>
        <span style={s.label}>From</span>
        <input style={s.input} type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span style={s.label}>To</span>
        <input style={s.input} type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      {isLoading ? <p>Loading…</p> : (
        <>
          <div style={s.grid}>
            <div style={card}>
              <h3 style={s.h3}>Monthly Billing Trend (₹)</h3>
              <Bars data={data?.by_month || []} labelKey="month" series={[{ key: 'billing', label: 'Billing', color: colors.blue, fmt: inr }]} />
            </div>
            <div style={card}>
              <h3 style={s.h3}>Activity Breakdown</h3>
              <Donut data={data?.by_activity || []} valueKey="count" labelKey="activity_code" />
            </div>
          </div>

          <div style={{ ...card, marginBottom: 20 }}>
            <h3 style={s.h3}>Engineer Performance</h3>
            <Bars data={data?.by_engineer || []} labelKey="name" height={210}
              series={[{ key: 'billing', label: 'Billing (₹)', color: colors.blue, fmt: inr }, { key: 'hours', label: 'Hours', color: colors.green }]} />
          </div>

          <div style={card}>
            <h3 style={s.h3}>Activity Summary</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                    {['Code', 'Count', 'Hours', 'Billing'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: colors.textMuted, fontWeight: 600 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(data?.by_activity || []).map((a) => (
                    <tr key={a.activity_code} style={{ borderBottom: `1px solid ${colors.bgAlt}` }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}>{a.activity_code}</td>
                      <td style={{ padding: '8px 12px' }}>{a.count}</td>
                      <td style={{ padding: '8px 12px' }}>{Number(a.hours || 0).toFixed(1)}</td>
                      <td style={{ padding: '8px 12px' }}>{inr(a.billing)}</td>
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
