import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import colors from '../theme';

const s = {
  h1: { fontSize: 22, fontWeight: 700, color: colors.navy, marginBottom: 4 },
  sub: { color: colors.textMuted, fontSize: 14, marginBottom: 20 },
  th: { textAlign: 'left', padding: '9px 12px', fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', borderBottom: `2px solid ${colors.border}` },
  td: { padding: '9px 12px', fontSize: 13, borderBottom: `1px solid ${colors.bgAlt}` },
  num: { textAlign: 'right' },
};

export default function Variance() {
  const { data, isLoading } = useQuery({
    queryKey: ['variance'],
    queryFn: () => api.get('/reports/variance').then((r) => r.data),
  });

  const rows = data || [];
  const totPlanned = rows.reduce((s2, r) => s2 + Number(r.planned_days || 0), 0);
  const totActual = rows.reduce((s2, r) => s2 + Number(r.actual_days || 0), 0);
  const maxDays = Math.max(...rows.map((r) => Math.max(Number(r.planned_days || 0), Number(r.actual_days || 0))), 1);

  const Bar = ({ planned, actual }) => {
    const p = (Number(planned || 0) / maxDays) * 100;
    const a = (Number(actual || 0) / maxDays) * 100;
    return (
      <div style={{ minWidth: 120 }}>
        <div style={{ height: 7, background: colors.bgAlt, borderRadius: 4, marginBottom: 3, overflow: 'hidden' }}>
          <div style={{ width: `${p}%`, height: '100%', background: colors.blueLight }} />
        </div>
        <div style={{ height: 7, background: colors.bgAlt, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${a}%`, height: '100%', background: colors.green }} />
        </div>
      </div>
    );
  };

  return (
    <div>
      <h1 style={s.h1}>Planned vs Actual</h1>
      <p style={s.sub}>
        Budgeted days (from Assignments) vs days actually logged (logged hours ÷ 8), per project, engineer and activity.
        <span style={{ marginLeft: 10, color: colors.blueLight, fontWeight: 700 }}>▬ Planned</span>
        <span style={{ marginLeft: 8, color: colors.green, fontWeight: 700 }}>▬ Actual</span>
      </p>

      {isLoading ? <p>Loading…</p> : !rows.length ? (
        <p style={{ color: colors.textMuted }}>No assignments yet — add some on the Assignments page to track variance.</p>
      ) : (
        <div style={{ overflowX: 'auto', background: colors.white, borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Project', 'Engineer', 'Activity', 'Progress', 'Planned', 'Actual', 'Variance', '% Done'].map((h) => (
                  <th key={h} style={{ ...s.th, ...(['Planned', 'Actual', 'Variance', '% Done'].includes(h) ? s.num : {}) }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const planned = Number(r.planned_days || 0);
                const actual = Number(r.actual_days || 0);
                const variance = Number(r.variance_days || 0);
                const pct = planned > 0 ? Math.round((actual / planned) * 100) : 0;
                // variance = planned − actual: positive = under budget (good), negative = over budget
                const over = variance < 0;
                return (
                  <tr key={i}>
                    <td style={{ ...s.td, fontWeight: 600 }}>{r.project_name || '—'}</td>
                    <td style={s.td}>{r.engineer_name || '—'}</td>
                    <td style={s.td}>{r.activity_label || '—'}</td>
                    <td style={s.td}><Bar planned={planned} actual={actual} /></td>
                    <td style={{ ...s.td, ...s.num }}>{planned.toFixed(1)}</td>
                    <td style={{ ...s.td, ...s.num }}>{actual.toFixed(1)}</td>
                    <td style={{ ...s.td, ...s.num, color: over ? colors.red : colors.green, fontWeight: 700 }}>
                      {variance > 0 ? '+' : ''}{variance.toFixed(1)}
                    </td>
                    <td style={{ ...s.td, ...s.num, fontWeight: 600, color: pct > 100 ? colors.red : colors.text }}>{pct}%</td>
                  </tr>
                );
              })}
              <tr style={{ background: colors.bgSlate }}>
                <td style={{ ...s.td, fontWeight: 800 }} colSpan={4}>TOTAL</td>
                <td style={{ ...s.td, ...s.num, fontWeight: 800 }}>{totPlanned.toFixed(1)}</td>
                <td style={{ ...s.td, ...s.num, fontWeight: 800 }}>{totActual.toFixed(1)}</td>
                <td style={{ ...s.td, ...s.num, fontWeight: 800, color: totActual > totPlanned ? colors.red : colors.green }}>
                  {(totPlanned - totActual) > 0 ? '+' : ''}{(totPlanned - totActual).toFixed(1)}
                </td>
                <td style={{ ...s.td, ...s.num, fontWeight: 800 }}>{totPlanned > 0 ? Math.round((totActual / totPlanned) * 100) : 0}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
