import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import colors from '../theme';

const s = {
  h1: { fontSize: 22, fontWeight: 700, color: colors.navy, marginBottom: 4 },
  sub: { fontSize: 13, color: colors.textMuted, marginBottom: 24 },
  card: { background: colors.white, borderRadius: 10, padding: 22, boxShadow: '0 1px 4px rgba(0,0,0,.08)', maxWidth: 560, marginBottom: 20 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  label: { fontSize: 15, fontWeight: 700, color: colors.navy, marginBottom: 4 },
  desc: { fontSize: 13, color: colors.textMuted },
  toggle: (on) => ({
    width: 46, height: 26, borderRadius: 20, border: 'none', cursor: 'pointer', flexShrink: 0,
    background: on ? colors.blue : colors.borderInput, position: 'relative', transition: 'background .2s ease',
  }),
  knob: (on) => ({
    position: 'absolute', top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: '50%',
    background: colors.white, transition: 'left .2s ease', boxShadow: '0 1px 3px rgba(0,0,0,.3)',
  }),
  typeRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${colors.bgAlt}` },
  swatch: { width: 16, height: 16, borderRadius: 4, flexShrink: 0 },
  typeCode: { fontWeight: 700, color: colors.navy, fontSize: 13, width: 50 },
  typeLabel: { fontSize: 13.5, color: colors.text, flex: 1 },
  delBtn: { padding: '4px 10px', background: colors.redBg, color: colors.red, border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 },
  addBtn: { padding: '8px 16px', background: colors.blue, color: colors.white, border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 12 },
  form: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' },
  input: { padding: '8px 10px', border: `1px solid ${colors.borderInput}`, borderRadius: 6, fontSize: 13 },
};

export default function Settings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isDirector = user?.role === 'Director';
  const [newType, setNewType] = useState({ code: '', label: '', color: '#2563eb', category: '' });
  const [showForm, setShowForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', category: '' });
  const [showProductForm, setShowProductForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => api.get('/tenant').then((r) => r.data),
  });

  const update = useMutation({
    mutationFn: (patch) => api.put('/tenant/settings', patch).then((r) => r.data),
    onSuccess: (d) => { qc.setQueryData(['tenant-settings'], d); toast.success('Settings updated'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not update settings'),
  });

  const { data: activityTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['activity-types'],
    queryFn: () => api.get('/activity-types').then((r) => r.data),
  });

  const createType = useMutation({
    mutationFn: (d) => api.post('/activity-types', d).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activity-types'] });
      toast.success('Activity type added');
      setNewType({ code: '', label: '', color: '#2563eb', category: '' });
      setShowForm(false);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not add activity type'),
  });

  const deleteType = useMutation({
    mutationFn: (id) => api.delete(`/activity-types/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['activity-types'] }); toast.success('Removed'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not remove activity type'),
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data),
  });

  const createProduct = useMutation({
    mutationFn: (d) => api.post('/products', d).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product added');
      setNewProduct({ name: '', category: '' });
      setShowProductForm(false);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not add product'),
  });

  const deleteProduct = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Removed'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not remove product'),
  });

  if (!isDirector) {
    return <p style={{ color: colors.textMuted }}>Only Directors can change company settings.</p>;
  }

  return (
    <div>
      <h1 style={s.h1}>Settings</h1>
      <p style={s.sub}>Company-wide preferences for {data?.name || 'your company'}</p>

      {isLoading ? <p>Loading…</p> : (
        <div style={s.card}>
          <div style={s.row}>
            <div>
              <div style={s.label}>Photo Capture on Activity Logs</div>
              <div style={s.desc}>
                Let engineers attach before/after photos when logging activity from the mobile app.
                Requires Cloudinary to be configured.
              </div>
            </div>
            <button
              style={s.toggle(data?.photo_capture_enabled)}
              onClick={() => update.mutate({ photo_capture_enabled: !data?.photo_capture_enabled })}
              disabled={update.isPending}
              aria-label="Toggle photo capture"
            >
              <span style={s.knob(data?.photo_capture_enabled)} />
            </button>
          </div>

          <div style={{ ...s.row, marginTop: 22, paddingTop: 22, borderTop: `1px solid ${colors.bgAlt}` }}>
            <div>
              <div style={s.label}>Customer Notifications</div>
              <div style={s.desc}>
                Automatically WhatsApp/SMS customers when a visit is scheduled, when the engineer is
                on the way, and to send invoice payment links. Requires a messaging provider to be configured.
              </div>
            </div>
            <button
              style={s.toggle(data?.notifications_enabled)}
              onClick={() => update.mutate({ notifications_enabled: !data?.notifications_enabled })}
              disabled={update.isPending}
              aria-label="Toggle customer notifications"
            >
              <span style={s.knob(data?.notifications_enabled)} />
            </button>
          </div>

          <div style={{ ...s.row, marginTop: 22, paddingTop: 22, borderTop: `1px solid ${colors.bgAlt}` }}>
            <div>
              <div style={s.label}>Online Booking</div>
              <div style={s.desc}>
                Publish a public page where customers can request a service visit themselves.
                Requests appear on your Schedule for approval.
              </div>
              {data?.online_booking_enabled && data?.slug && (
                <div style={{ marginTop: 8, fontSize: 12.5 }}>
                  <span style={{ color: colors.textMuted }}>Your booking link: </span>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/book/${data.slug}`); toast.success('Link copied'); }}
                    style={{ background: colors.blueBg, color: colors.blueDark, border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  >
                    /book/{data.slug} 📋
                  </button>
                </div>
              )}
            </div>
            <button
              style={s.toggle(data?.online_booking_enabled)}
              onClick={() => update.mutate({ online_booking_enabled: !data?.online_booking_enabled })}
              disabled={update.isPending}
              aria-label="Toggle online booking"
            >
              <span style={s.knob(data?.online_booking_enabled)} />
            </button>
          </div>
        </div>
      )}

      <div style={s.card}>
        <div style={s.label}>Attendance & Payroll</div>
        <div style={s.desc}>
          Pay-period grouping for timesheets, overtime thresholds (0 = no overtime rule),
          the late-arrival grace window, and your working week.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 5 }}>Pay period</div>
            <select
              style={{ ...s.input, width: '100%' }}
              value={data?.pay_period || 'monthly'}
              onChange={(e) => update.mutate({ pay_period: e.target.value })}
            >
              <option value="weekly">Weekly (Mon–Sun)</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 5 }}>Working days / week</div>
            <select
              style={{ ...s.input, width: '100%' }}
              value={data?.working_days_per_week || 6}
              onChange={(e) => update.mutate({ working_days_per_week: Number(e.target.value) })}
            >
              <option value={5}>5 (Mon–Fri)</option>
              <option value={6}>6 (Mon–Sat)</option>
              <option value={7}>7 (all days)</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 5 }}>Daily OT after (hours)</div>
            <input
              type="number" min="0" step="0.5" style={{ ...s.input, width: '100%' }}
              defaultValue={data?.ot_daily_hours ?? 0}
              onBlur={(e) => { if (Number(e.target.value) !== Number(data?.ot_daily_hours)) update.mutate({ ot_daily_hours: Number(e.target.value) }); }}
            />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 5 }}>Weekly OT after (hours)</div>
            <input
              type="number" min="0" step="0.5" style={{ ...s.input, width: '100%' }}
              defaultValue={data?.ot_weekly_hours ?? 0}
              onBlur={(e) => { if (Number(e.target.value) !== Number(data?.ot_weekly_hours)) update.mutate({ ot_weekly_hours: Number(e.target.value) }); }}
            />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 5 }}>Late grace (minutes)</div>
            <input
              type="number" min="0" step="5" style={{ ...s.input, width: '100%' }}
              defaultValue={data?.late_grace_minutes ?? 10}
              onBlur={(e) => { if (Number(e.target.value) !== Number(data?.late_grace_minutes)) update.mutate({ late_grace_minutes: Number(e.target.value) }); }}
            />
          </div>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.label}>Activity Types</div>
        <div style={s.desc}>
          The job types your team logs against — customize these to match your trade
          (e.g. "Leak Repair" instead of "Preventive Maintenance" for a plumbing business).
        </div>

        {typesLoading ? <p>Loading…</p> : (
          <div style={{ marginTop: 14 }}>
            {activityTypes?.map((t) => (
              <div style={s.typeRow} key={t.id}>
                <span style={{ ...s.swatch, background: t.color }} />
                <span style={s.typeCode}>{t.code}</span>
                <span style={s.typeLabel}>{t.label}{t.category ? <span style={{ color: colors.textFaint, fontWeight: 400 }}> · {t.category}</span> : null}</span>
                <button style={s.delBtn} onClick={() => { if (confirm(`Remove "${t.label}"? Existing logs that used this type are not affected.`)) deleteType.mutate(t.id); }}>Remove</button>
              </div>
            ))}
          </div>
        )}

        {showForm ? (
          <form
            style={s.form}
            onSubmit={(e) => { e.preventDefault(); createType.mutate(newType); }}
          >
            <input
              style={{ ...s.input, width: 70 }}
              placeholder="Code"
              maxLength={10}
              value={newType.code}
              onChange={(e) => setNewType((f) => ({ ...f, code: e.target.value }))}
              required
            />
            <input
              style={{ ...s.input, flex: 1, minWidth: 160 }}
              placeholder="Label, e.g. Leak Repair"
              value={newType.label}
              onChange={(e) => setNewType((f) => ({ ...f, label: e.target.value }))}
              required
            />
            <input
              style={{ ...s.input, width: 130 }}
              placeholder="Category (optional)"
              value={newType.category}
              onChange={(e) => setNewType((f) => ({ ...f, category: e.target.value }))}
            />
            <input
              type="color"
              style={{ width: 36, height: 34, padding: 2, border: `1px solid ${colors.borderInput}`, borderRadius: 6 }}
              value={newType.color}
              onChange={(e) => setNewType((f) => ({ ...f, color: e.target.value }))}
            />
            <button type="submit" style={s.addBtn} disabled={createType.isPending}>
              {createType.isPending ? 'Adding…' : 'Add'}
            </button>
            <button type="button" style={{ ...s.addBtn, background: colors.bgAlt, color: colors.text }} onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <button style={s.addBtn} onClick={() => setShowForm(true)}>+ Add Activity Type</button>
        )}
      </div>

      <div style={s.card}>
        <div style={s.label}>Products / Systems Catalogue</div>
        <div style={s.desc}>
          The equipment, systems, or products your team works on (e.g. "Mitsubishi iQ-R PLC").
          These appear as suggestions when logging activity.
        </div>

        {productsLoading ? <p>Loading…</p> : (
          <div style={{ marginTop: 14 }}>
            {products?.map((p) => (
              <div style={s.typeRow} key={p.id}>
                <span style={s.typeLabel}>{p.name}{p.category ? <span style={{ color: colors.textFaint, fontWeight: 400 }}> · {p.category}</span> : null}</span>
                <button style={s.delBtn} onClick={() => { if (confirm(`Remove "${p.name}"?`)) deleteProduct.mutate(p.id); }}>Remove</button>
              </div>
            ))}
            {products?.length === 0 && <div style={{ ...s.desc, marginTop: 8 }}>No products yet.</div>}
          </div>
        )}

        {showProductForm ? (
          <form style={s.form} onSubmit={(e) => { e.preventDefault(); createProduct.mutate(newProduct); }}>
            <input
              style={{ ...s.input, flex: 1, minWidth: 180 }}
              placeholder="Product / System name"
              value={newProduct.name}
              onChange={(e) => setNewProduct((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              style={{ ...s.input, width: 130 }}
              placeholder="Category (optional)"
              value={newProduct.category}
              onChange={(e) => setNewProduct((f) => ({ ...f, category: e.target.value }))}
            />
            <button type="submit" style={s.addBtn} disabled={createProduct.isPending}>
              {createProduct.isPending ? 'Adding…' : 'Add'}
            </button>
            <button type="button" style={{ ...s.addBtn, background: colors.bgAlt, color: colors.text }} onClick={() => setShowProductForm(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <button style={s.addBtn} onClick={() => setShowProductForm(true)}>+ Add Product</button>
        )}
      </div>
    </div>
  );
}
