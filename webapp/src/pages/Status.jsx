import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../api/client';
import colors from '../theme';

const card = { background: colors.white, borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.08)' };

const s = {
  h1: { fontSize: 22, fontWeight: 700, color: colors.navy, marginBottom: 4 },
  sub: { fontSize: 13, color: colors.textMuted, marginBottom: 20 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 24 },
  statValue: { fontSize: 28, fontWeight: 800, color: colors.navy },
  statLabel: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: `2px solid ${colors.border}`, color: colors.textMuted, fontWeight: 600 },
  td: { padding: '8px 10px', borderBottom: `1px solid ${colors.bgAlt}`, color: colors.text },
  sectionTitle: { fontSize: 15, fontWeight: 600, marginBottom: 12, color: colors.navy },
};

export default function Status() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['status-summary'],
    queryFn: () => api.get('/status/summary').then((r) => r.data),
    refetchInterval: 60000,
  });

  const { data: acc } = useQuery({
    queryKey: ['status-accounts'],
    queryFn: () => api.get('/status/accounts').then((r) => r.data),
    refetchInterval: 60000,
  });

  if (error) {
    return <p style={{ color: colors.red }}>Could not load status — you may not have owner access.</p>;
  }

  return (
    <div>
      <h1 style={s.h1}>System Status</h1>
      <p style={s.sub}>Platform-wide account &amp; error overview across all tenants</p>

      {acc && (
        <>
          <div style={s.grid}>
            <div style={card}><div style={s.statValue}>{acc.tenants.total}</div><div style={s.statLabel}>Total accounts (companies)</div></div>
            <div style={card}><div style={{ ...s.statValue, color: colors.green }}>{acc.tenants.active_30d}</div><div style={s.statLabel}>Active in last 30 days</div></div>
            <div style={card}><div style={s.statValue}>{acc.tenants.new_30d}</div><div style={s.statLabel}>New accounts (30 days)</div></div>
            <div style={card}><div style={s.statValue}>{acc.users.total}</div><div style={s.statLabel}>Total users</div></div>
          </div>

          <div style={{ ...card, marginBottom: 20 }}>
            <h3 style={s.sectionTitle}>Accounts</h3>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16, fontSize: 13, color: colors.textMuted }}>
              <span>By status:&nbsp;{acc.tenants.by_status.map((r) => `${r.plan_status} ${r.count}`).join(' · ')}</span>
              <span>By plan:&nbsp;{acc.tenants.by_plan.map((r) => `${r.plan} ${r.count}`).join(' · ')}</span>
              <span>By role:&nbsp;{acc.users.by_role.map((r) => `${r.role} ${r.count}`).join(' · ')}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Company</th>
                    <th style={s.th}>Plan</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Users</th>
                    <th style={s.th}>Last activity</th>
                    <th style={s.th}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {acc.list.map((t) => (
                    <tr key={t.slug}>
                      <td style={s.td}>{t.name}{!t.active && <span style={{ color: colors.red }}> (inactive)</span>}</td>
                      <td style={s.td}>{t.plan}</td>
                      <td style={s.td}>{t.plan_status}</td>
                      <td style={s.td}>{t.users}</td>
                      <td style={s.td}>{t.last_activity ? format(new Date(t.last_activity), 'MMM d, yyyy') : '—'}</td>
                      <td style={s.td}>{format(new Date(t.created_at), 'MMM d, yyyy')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <h3 style={{ ...s.sectionTitle, fontSize: 17, marginTop: 8 }}>Errors</h3>

      {isLoading ? <p>Loading…</p> : (
        <>
          <div style={s.grid}>
            <div style={card}>
              <div style={s.statValue}>{data.count_24h}</div>
              <div style={s.statLabel}>Errors — last 24h</div>
            </div>
            <div style={card}>
              <div style={s.statValue}>{data.count_7d}</div>
              <div style={s.statLabel}>Errors — last 7 days</div>
            </div>
          </div>

          <div style={{ ...card, marginBottom: 20 }}>
            <h3 style={s.sectionTitle}>Errors by Route (last 7 days)</h3>
            {data.by_route.length === 0 ? <p style={{ color: colors.textMuted, fontSize: 13 }}>No errors recorded 🎉</p> : (
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Route</th>
                    <th style={s.th}>Method</th>
                    <th style={s.th}>Count</th>
                    <th style={s.th}>Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_route.map((r, i) => (
                    <tr key={i}>
                      <td style={s.td}>{r.route}</td>
                      <td style={s.td}>{r.method}</td>
                      <td style={s.td}>{r.count}</td>
                      <td style={s.td}>{format(new Date(r.last_seen), 'MMM d, HH:mm')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={card}>
            <h3 style={s.sectionTitle}>Recent Errors</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Time</th>
                    <th style={s.th}>Route</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((e) => (
                    <tr key={e.id}>
                      <td style={s.td}>{format(new Date(e.created_at), 'MMM d, HH:mm:ss')}</td>
                      <td style={s.td}>{e.method} {e.route}</td>
                      <td style={s.td}>{e.status_code}</td>
                      <td style={s.td}>{e.message}</td>
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
