import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import colors from '../theme';

const TIERS = [
  { key: 'starter', label: 'Starter', seatCap: 5, blurb: 'Small teams getting started' },
  { key: 'pro', label: 'Pro', seatCap: 25, blurb: 'Growing mid-size teams' },
  { key: 'enterprise', label: 'Enterprise', seatCap: null, blurb: 'Unlimited seats, custom terms' },
];

const s = {
  h1: { fontSize: 22, fontWeight: 700, color: colors.navy, marginBottom: 4 },
  sub: { fontSize: 13, color: colors.textMuted, marginBottom: 24 },
  card: { background: colors.white, borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 20 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: colors.blueBg, color: colors.blueDark },
  usageBar: { width: '100%', height: 8, background: colors.bgAlt, borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  usageFill: { height: '100%', background: colors.blue },
  btn: { padding: '8px 16px', background: colors.blue, color: colors.white, border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnOutline: { padding: '8px 16px', background: colors.white, color: colors.blue, border: `1.5px solid ${colors.blue}`, borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 },
  tierCard: { border: `1.5px solid ${colors.border}`, borderRadius: 10, padding: 18 },
  tierName: { fontSize: 16, fontWeight: 700, color: colors.navy, marginBottom: 4 },
  tierBlurb: { fontSize: 12, color: colors.textMuted, marginBottom: 14 },
};

export default function Billing() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isDirector = user?.role === 'Director';

  const { data, isLoading } = useQuery({
    queryKey: ['billing-subscription'],
    queryFn: () => api.get('/billing/subscription').then((r) => r.data),
  });

  const checkout = useMutation({
    mutationFn: (tier) => api.post('/billing/checkout', { tier }).then((r) => r.data),
    onSuccess: (d) => { window.location.href = d.url; },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not start checkout'),
  });

  const cancel = useMutation({
    mutationFn: () => api.post('/billing/cancel').then((r) => r.data),
    onSuccess: () => { toast.success('Subscription cancelled'); qc.invalidateQueries({ queryKey: ['billing-subscription'] }); },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not cancel subscription'),
  });

  if (!isDirector) {
    return <p style={{ color: colors.textMuted }}>Only Directors can manage billing.</p>;
  }

  return (
    <div>
      <h1 style={s.h1}>Billing & Subscription</h1>
      <p style={s.sub}>Manage your Paimal plan and team seats · pay via UPI, card, or netbanking</p>

      {isLoading ? <p>Loading…</p> : (
        <>
          <div style={s.card}>
            <div style={s.row}>
              <div>
                <span style={s.badge}>{data.plan?.toUpperCase()} — {data.plan_status}</span>
                <div style={{ marginTop: 10, fontSize: 14, color: colors.text }}>
                  {data.seats_used} seat{data.seats_used === 1 ? '' : 's'} used
                  {data.seat_cap ? ` of ${data.seat_cap}` : ' (unlimited)'}
                </div>
                {data.seat_cap && (
                  <div style={s.usageBar}>
                    <div style={{ ...s.usageFill, width: `${Math.min(100, (data.seats_used / data.seat_cap) * 100)}%` }} />
                  </div>
                )}
                {data.plan_status === 'trialing' && data.trial_ends_at && (
                  <div style={{ marginTop: 8, fontSize: 12, color: colors.amber }}>
                    Trial ends {format(new Date(data.trial_ends_at), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
              {data.plan_status === 'active' && (
                <button
                  style={{ ...s.btnOutline, color: colors.red, borderColor: colors.red }}
                  onClick={() => { if (confirm('Cancel your subscription? You will be moved to the Starter plan.')) cancel.mutate(); }}
                  disabled={cancel.isPending}
                >
                  {cancel.isPending ? 'Cancelling…' : 'Cancel Subscription'}
                </button>
              )}
            </div>
          </div>

          <div style={s.grid}>
            {TIERS.map((t) => (
              <div key={t.key} style={s.tierCard}>
                <div style={s.tierName}>{t.label}</div>
                <div style={s.tierBlurb}>{t.blurb} · {t.seatCap ? `up to ${t.seatCap} seats` : 'unlimited seats'}</div>
                {t.key === 'enterprise' ? (
                  <a href="mailto:sales@fieldpilot.app?subject=Enterprise%20Plan" style={{ ...s.btn, display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
                    Contact Us
                  </a>
                ) : (
                  <button
                    style={s.btn}
                    onClick={() => checkout.mutate(t.key)}
                    disabled={checkout.isPending || data.plan === t.key}
                  >
                    {data.plan === t.key ? 'Current Plan' : checkout.isPending ? 'Redirecting…' : `Choose ${t.label}`}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
