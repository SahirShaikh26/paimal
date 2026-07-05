import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import colors from '../theme';

const STATUS_BG = { Scheduled: colors.blueBg, Completed: colors.greenBg, Cancelled: colors.redBg };
const STATUS_TEXT = { Scheduled: colors.blueDark, Completed: colors.green, Cancelled: colors.red };
const FREQUENCY_LABEL = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly' };

const s = {
  h1: { fontSize: 22, fontWeight: 700, color: colors.navy, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: colors.navy, margin: '28px 0 12px' },
  card: { background: colors.white, borderRadius: 10, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 12 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  date: { fontSize: 13, fontWeight: 700, color: colors.navy },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  btn: { padding: '8px 16px', background: colors.blue, color: colors.white, border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  mcard: { background: colors.white, borderRadius: 12, padding: 32, width: 'min(440px, calc(100vw - 32px))', maxHeight: '90vh', overflowY: 'auto' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', border: `1px solid ${colors.borderInput}`, borderRadius: 7, fontSize: 14, marginBottom: 12 },
  select: { width: '100%', padding: '9px 12px', border: `1px solid ${colors.borderInput}`, borderRadius: 7, fontSize: 14, marginBottom: 12 },
  empty: { color: colors.textMuted, fontSize: 14 },
  modeTabs: { display: 'flex', gap: 8, marginBottom: 16 },
  modeTab: (active) => ({
    flex: 1, padding: '8px 12px', borderRadius: 7, border: `1.5px solid ${active ? colors.blue : colors.borderInput}`,
    background: active ? colors.blueBg : colors.white, color: active ? colors.blueDark : colors.text,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center',
  }),
};

const EMPTY = { engineer_id: '', customer_id: '', machine_id: '', scheduled_date: '', notes: '', frequency: 'monthly' };

export default function Schedule() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [mode, setMode] = useState('once'); // 'once' | 'recurring'
  const [form, setForm] = useState(EMPTY);
  const canCreate = ['Director', 'Manager'].includes(user?.role);

  const { data: visits, isLoading } = useQuery({
    queryKey: ['visits'],
    queryFn: () => api.get('/visits').then((r) => r.data),
  });
  const { data: templates } = useQuery({
    queryKey: ['recurring-visits'],
    queryFn: () => api.get('/visits/recurring').then((r) => r.data),
    enabled: canCreate,
  });
  const { data: engineers } = useQuery({
    queryKey: ['engineers'],
    queryFn: () => api.get('/engineers').then((r) => r.data),
    enabled: canCreate,
  });
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then((r) => r.data),
    enabled: canCreate,
  });
  // Machines belonging to the customer currently selected in the form, so a
  // visit can be tied to a specific unit. GET /customers/:id returns them.
  const { data: customerDetail } = useQuery({
    queryKey: ['customer-machines', form.customer_id],
    queryFn: () => api.get(`/customers/${form.customer_id}`).then((r) => r.data),
    enabled: canCreate && !!form.customer_id,
  });
  const machines = customerDetail?.machines || [];

  const create = useMutation({
    mutationFn: (d) => api.post('/visits', d).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['visits'] }); toast.success('Visit scheduled'); setModal(false); },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not schedule visit'),
  });

  const createRecurring = useMutation({
    mutationFn: (d) => api.post('/visits/recurring', d).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring-visits'] });
      qc.invalidateQueries({ queryKey: ['visits'] });
      toast.success('Recurring contract created');
      setModal(false);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not create recurring contract'),
  });

  const cancelVisit = useMutation({
    mutationFn: (id) => api.put(`/visits/${id}`, { status: 'Cancelled' }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['visits'] }); toast.success('Visit cancelled'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not cancel visit'),
  });

  const toggleTemplate = useMutation({
    mutationFn: ({ id, active }) => api.put(`/visits/recurring/${id}`, { active }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring-visits'] });
      qc.invalidateQueries({ queryKey: ['visits'] });
      toast.success('Updated');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not update contract'),
  });

  const { data: bookingRequests } = useQuery({
    queryKey: ['booking-requests'],
    queryFn: () => api.get('/booking-requests', { params: { status: 'Pending' } }).then((r) => r.data),
    enabled: canCreate,
  });

  const onTheWay = useMutation({
    mutationFn: (id) => api.post(`/visits/${id}/on-the-way`).then((r) => r.data),
    onSuccess: () => toast.success('Customer notified'),
    onError: (e) => toast.error(e.response?.data?.error || 'Could not notify'),
  });
  const approveRequest = useMutation({
    mutationFn: (id) => api.post(`/booking-requests/${id}/approve`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['booking-requests'] }); qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Approved — customer added'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not approve'),
  });
  const declineRequest = useMutation({
    mutationFn: (id) => api.post(`/booking-requests/${id}/decline`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['booking-requests'] }); toast.success('Declined'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not decline'),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const engineerList = (engineers || []).filter((e) => e.role === 'Engineer');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'recurring') {
      createRecurring.mutate({
        engineer_id: form.engineer_id, customer_id: form.customer_id,
        machine_id: form.machine_id || null, notes: form.notes, frequency: form.frequency,
      });
    } else {
      create.mutate(form);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={s.h1}>Schedule</h1>
        {canCreate && <button style={s.btn} onClick={() => { setForm(EMPTY); setMode('once'); setModal(true); }}>+ Schedule Visit</button>}
      </div>

      {canCreate && bookingRequests && bookingRequests.length > 0 && (
        <>
          <div style={s.sectionTitle}>🔔 New Booking Requests ({bookingRequests.length})</div>
          {bookingRequests.map((b) => (
            <div style={{ ...s.card, borderLeft: `3px solid ${colors.amber}` }} key={b.id}>
              <div style={s.row}>
                <div>
                  <div style={s.date}>{b.customer_name} · 📞 {b.customer_phone}</div>
                  <div style={s.meta}>
                    {b.service_type ? `${b.service_type}` : 'Service request'}
                    {b.preferred_date ? ` · prefers ${format(new Date(b.preferred_date), 'MMM d, yyyy')}` : ''}
                    {b.address ? ` · ${b.address}` : ''}
                  </div>
                  {b.notes && <div style={s.meta}>{b.notes}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button style={{ ...s.btn, padding: '6px 12px', fontSize: 12 }} onClick={() => approveRequest.mutate(b.id)}>Approve</button>
                  <button style={{ ...s.btn, background: colors.bgAlt, color: colors.text, padding: '6px 12px', fontSize: 12 }} onClick={() => declineRequest.mutate(b.id)}>Decline</button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {isLoading ? <p>Loading…</p> : (!visits || visits.length === 0) ? (
        <p style={s.empty}>No visits scheduled yet.</p>
      ) : (
        visits.map((v) => (
          <div style={s.card} key={v.id}>
            <div style={s.row}>
              <div>
                <div style={s.date}>
                  {format(new Date(v.scheduled_date), 'EEE, MMM d, yyyy')}
                  {v.template_id && <span style={{ ...s.badge, background: colors.purpleBg, color: colors.purple, marginLeft: 8 }}>Recurring</span>}
                </div>
                <div style={s.meta}>👷 {v.engineer_name} · 🏭 {v.customer_name}{v.machine_name ? ` · ⚙️ ${v.machine_name}` : ''}</div>
                {v.notes && <div style={s.meta}>{v.notes}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ ...s.badge, background: STATUS_BG[v.status] || colors.bgAlt, color: STATUS_TEXT[v.status] || colors.text }}>{v.status}</span>
                {canCreate && v.status === 'Scheduled' && (
                  <>
                    <button
                      style={{ ...s.btn, background: colors.blueBg, color: colors.blueDark, padding: '5px 10px', fontSize: 12 }}
                      onClick={() => onTheWay.mutate(v.id)}
                      title="WhatsApp/SMS the customer that the engineer is on the way"
                    >
                      On the way
                    </button>
                    <button
                      style={{ ...s.btn, background: colors.bgAlt, color: colors.text, padding: '5px 10px', fontSize: 12 }}
                      onClick={() => cancelVisit.mutate(v.id)}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {canCreate && templates && templates.length > 0 && (
        <>
          <div style={s.sectionTitle}>Recurring Contracts</div>
          {templates.map((t) => (
            <div style={s.card} key={t.id}>
              <div style={s.row}>
                <div>
                  <div style={s.date}>{FREQUENCY_LABEL[t.frequency]} — 👷 {t.engineer_name} · 🏭 {t.customer_name}</div>
                  {t.notes && <div style={s.meta}>{t.notes}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ ...s.badge, background: t.active ? colors.greenBg : colors.bgAlt, color: t.active ? colors.green : colors.textMuted }}>
                    {t.active ? 'Active' : 'Paused'}
                  </span>
                  <button
                    style={{ ...s.btn, background: colors.bgAlt, color: colors.text, padding: '5px 10px', fontSize: 12 }}
                    onClick={() => toggleTemplate.mutate({ id: t.id, active: !t.active })}
                  >
                    {t.active ? 'Pause' : 'Resume'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {modal && (
        <div style={s.modal} onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
          <div style={s.mcard}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Schedule Visit</h2>
            <div style={s.modeTabs}>
              <button type="button" style={s.modeTab(mode === 'once')} onClick={() => setMode('once')}>One-time</button>
              <button type="button" style={s.modeTab(mode === 'recurring')} onClick={() => setMode('recurring')}>Recurring</button>
            </div>
            <form onSubmit={handleSubmit}>
              <label style={s.label}>Engineer *</label>
              <select style={s.select} value={form.engineer_id} onChange={set('engineer_id')} required>
                <option value="">Select engineer</option>
                {engineerList.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <label style={s.label}>Customer *</label>
              <select style={s.select} value={form.customer_id} onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value, machine_id: '' }))} required>
                <option value="">Select customer</option>
                {(customers || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              {machines.length > 0 && (
                <>
                  <label style={s.label}>Machine (optional)</label>
                  <select style={s.select} value={form.machine_id} onChange={set('machine_id')}>
                    <option value="">No specific machine</option>
                    {machines.map((m) => <option key={m.id} value={m.id}>{m.name}{m.model ? ` (${m.model})` : ''}</option>)}
                  </select>
                </>
              )}

              {mode === 'once' ? (
                <>
                  <label style={s.label}>Date *</label>
                  <input style={s.input} type="date" value={form.scheduled_date} onChange={set('scheduled_date')} required />
                </>
              ) : (
                <>
                  <label style={s.label}>Frequency *</label>
                  <select style={s.select} value={form.frequency} onChange={set('frequency')} required>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </>
              )}

              <label style={s.label}>Notes</label>
              <input style={s.input} value={form.notes} onChange={set('notes')} placeholder="e.g. Routine maintenance check" />
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" style={{ ...s.btn, background: colors.bgAlt, color: colors.text }} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" style={s.btn} disabled={create.isPending || createRecurring.isPending}>
                  {(create.isPending || createRecurring.isPending) ? 'Saving…' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
