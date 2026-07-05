import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../api/client';
import colors from '../theme';
import LineItemEditor from '../components/LineItemEditor';

const STATUS_BG = { Draft: colors.bgAlt, Sent: colors.blueBg, Accepted: colors.greenBg, Declined: colors.redBg, Converted: colors.purpleBg };
const STATUS_TEXT = { Draft: colors.textMuted, Sent: colors.blueDark, Accepted: colors.green, Declined: colors.red, Converted: colors.purple };

const s = {
  h1: { fontSize: 22, fontWeight: 700, color: colors.navy },
  btn: { padding: '8px 16px', background: colors.blue, color: colors.white, border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  card: { background: colors.white, borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 10 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 3 },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  mcard: { background: colors.white, borderRadius: 12, padding: 28, width: 'min(620px, 100%)', maxHeight: '92vh', overflowY: 'auto' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 5, marginTop: 12 },
  input: { width: '100%', padding: '9px 12px', border: `1px solid ${colors.borderInput}`, borderRadius: 7, fontSize: 14 },
  link: { background: 'none', border: 'none', color: colors.blue, cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 },
};

const EMPTY = { id: null, customer_id: '', line_items: [{ description: '', qty: 1, rate: 0 }], tax_pct: 18, notes: '', valid_until: '' };

export default function Quotes() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: quotes, isLoading } = useQuery({ queryKey: ['quotes'], queryFn: () => api.get('/quotes').then((r) => r.data) });
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: () => api.get('/customers').then((r) => r.data) });

  const save = useMutation({
    mutationFn: (d) => (d.id ? api.put(`/quotes/${d.id}`, d) : api.post('/quotes', d)).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotes'] }); toast.success('Quote saved'); setModal(false); },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not save quote'),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/quotes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotes'] }); toast.success('Deleted'); },
  });
  const convert = useMutation({
    mutationFn: (id) => api.post(`/quotes/${id}/convert`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotes'] }); qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Converted to invoice'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not convert'),
  });

  const openNew = () => { setForm(EMPTY); setModal(true); };
  const handleEdit = (q) => {
    setForm({
      id: q.id, customer_id: q.customer_id || '',
      line_items: q.line_items?.length ? q.line_items : [{ description: '', qty: 1, rate: 0 }],
      tax_pct: q.tax_pct ?? 0, notes: q.notes || '', valid_until: q.valid_until ? q.valid_until.split('T')[0] : '',
    });
    setModal(true);
  };

  const submit = (e, status) => {
    e.preventDefault();
    if (!form.customer_id) return toast.error('Select a customer');
    save.mutate({ ...form, status });
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={s.h1}>Quotes</h1>
        <button style={s.btn} onClick={openNew}>+ New Quote</button>
      </div>

      {isLoading ? <p>Loading…</p> : !quotes?.length ? (
        <p style={{ color: colors.textMuted }}>No quotes yet. Create one to send an estimate to a customer.</p>
      ) : quotes.map((q) => (
        <div style={s.card} key={q.id}>
          <div style={s.row}>
            <div>
              <div style={{ fontWeight: 700, color: colors.navy }}>
                {q.quote_number} · {q.customer_name || '—'}
                <span style={{ ...s.badge, marginLeft: 8, background: STATUS_BG[q.status], color: STATUS_TEXT[q.status] }}>{q.status}</span>
              </div>
              <div style={s.meta}>
                {fmt(q.total)} · {q.line_items?.length || 0} item(s)
                {q.valid_until ? ` · valid till ${format(new Date(q.valid_until), 'MMM d, yyyy')}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              {q.status !== 'Converted' && <button style={s.link} onClick={() => handleEdit(q)}>Edit</button>}
              {['Draft', 'Sent', 'Accepted'].includes(q.status) && (
                <button style={{ ...s.link, color: colors.green }} onClick={() => convert.mutate(q.id)}>Convert to Invoice</button>
              )}
              <button style={{ ...s.link, color: colors.red }} onClick={() => { if (confirm(`Delete ${q.quote_number}?`)) remove.mutate(q.id); }}>Delete</button>
            </div>
          </div>
        </div>
      ))}

      {modal && (
        <div style={s.modal} onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
          <div style={s.mcard}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{form.id ? 'Edit Quote' : 'New Quote'}</h2>
            <form onSubmit={(e) => submit(e, 'Draft')}>
              <label style={s.label}>Customer *</label>
              <select style={s.input} value={form.customer_id} onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))} required>
                <option value="">Select customer</option>
                {(customers || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <label style={s.label}>Line Items</label>
              <LineItemEditor
                items={form.line_items}
                onChange={(items) => setForm((f) => ({ ...f, line_items: items }))}
                taxPct={form.tax_pct}
                onTaxChange={(v) => setForm((f) => ({ ...f, tax_pct: v }))}
              />

              <label style={s.label}>Valid Until</label>
              <input style={s.input} type="date" value={form.valid_until} onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))} />

              <label style={s.label}>Notes</label>
              <input style={s.input} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Terms, scope, etc." />

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="button" style={{ ...s.btn, background: colors.bgAlt, color: colors.text }} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" style={{ ...s.btn, background: colors.bgAlt, color: colors.navy, border: `1px solid ${colors.border}` }} disabled={save.isPending}>Save Draft</button>
                <button type="button" style={s.btn} disabled={save.isPending} onClick={(e) => submit(e, 'Sent')}>
                  {save.isPending ? 'Saving…' : 'Save & Mark Sent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
