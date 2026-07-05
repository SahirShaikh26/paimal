import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import colors from '../theme';

const s = {
  page: { minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px' },
  card: { background: colors.white, borderRadius: 14, padding: 32, width: '100%', maxWidth: 520, boxShadow: '0 4px 24px rgba(0,0,0,.1)' },
  brand: { fontSize: 22, fontWeight: 800, color: colors.navy, marginBottom: 4 },
  sub: { color: colors.textMuted, fontSize: 14, marginBottom: 24 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6, marginTop: 14 },
  input: { width: '100%', padding: '10px 12px', border: `1px solid ${colors.borderInput}`, borderRadius: 8, fontSize: 14, boxSizing: 'border-box' },
  btn: { width: '100%', padding: 13, background: colors.blue, color: colors.white, border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 22 },
};

export default function Booking() {
  const { slug } = useParams();
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', customer_email: '', address: '', service_type: '', preferred_date: '', notes: '' });
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { data: company, isLoading, isError } = useQuery({
    queryKey: ['public-booking', slug],
    queryFn: () => api.get(`/public/${slug}`).then((r) => r.data),
    retry: false,
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const { data } = await api.post(`/public/${slug}/booking`, form);
      setDone(data.message || 'Request received!');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <div style={s.page}><div style={s.card}>Loading…</div></div>;
  if (isError) return <div style={s.page}><div style={s.card}><div style={s.brand}>Booking unavailable</div><p style={s.sub}>This company isn't accepting online bookings right now.</p></div></div>;

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.brand}>{company.name}</div>
        <div style={s.sub}>Request a service visit — we'll get back to you shortly.</div>

        {done ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
            <p style={{ color: colors.text, fontSize: 15 }}>{done}</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label style={s.label}>Your Name *</label>
            <input style={s.input} value={form.customer_name} onChange={set('customer_name')} required placeholder="Full name" />

            <label style={s.label}>Phone *</label>
            <input style={s.input} value={form.customer_phone} onChange={set('customer_phone')} required placeholder="10-digit mobile number" />

            <label style={s.label}>Email</label>
            <input style={s.input} type="email" value={form.customer_email} onChange={set('customer_email')} placeholder="you@example.com" />

            {company.services?.length > 0 && (
              <>
                <label style={s.label}>Service Needed</label>
                <select style={s.input} value={form.service_type} onChange={set('service_type')}>
                  <option value="">Select a service</option>
                  {company.services.map((svc) => <option key={svc} value={svc}>{svc}</option>)}
                </select>
              </>
            )}

            <label style={s.label}>Address</label>
            <input style={s.input} value={form.address} onChange={set('address')} placeholder="Service location" />

            <label style={s.label}>Preferred Date</label>
            <input style={s.input} type="date" value={form.preferred_date} onChange={set('preferred_date')} />

            <label style={s.label}>Details</label>
            <input style={s.input} value={form.notes} onChange={set('notes')} placeholder="Describe the issue (optional)" />

            {error && <p style={{ color: colors.red, fontSize: 13, marginTop: 12 }}>{error}</p>}

            <button style={s.btn} type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Request Visit'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
