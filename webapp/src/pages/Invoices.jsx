import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../api/client';
import colors from '../theme';
import LineItemEditor from '../components/LineItemEditor';
import RazorpayButton from '../components/RazorpayButton';

const STATUS_BG = { Draft: colors.bgAlt, Sent: colors.blueBg, Paid: colors.greenBg, Overdue: colors.redBg, Cancelled: colors.bgAlt };
const STATUS_TEXT = { Draft: colors.textMuted, Sent: colors.blueDark, Paid: colors.green, Overdue: colors.red, Cancelled: colors.textMuted };

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

const EMPTY = { id: null, customer_id: '', line_items: [{ description: '', qty: 1, rate: 0 }], tax_pct: 18, notes: '', due_date: '' };

export default function Invoices() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [emailFor, setEmailFor] = useState(null);   // invoice being emailed
  const [emailAddr, setEmailAddr] = useState('');

  const { data: invoices, isLoading } = useQuery({ queryKey: ['invoices'], queryFn: () => api.get('/invoices').then((r) => r.data) });
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: () => api.get('/customers').then((r) => r.data) });

  const save = useMutation({
    mutationFn: (d) => (d.id ? api.put(`/invoices/${d.id}`, d) : api.post('/invoices', d)).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice saved'); setModal(false); },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not save invoice'),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/invoices/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Deleted'); },
  });
  const payLink = useMutation({
    mutationFn: (id) => api.post(`/invoices/${id}/payment-link`).then((r) => r.data),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      navigator.clipboard?.writeText(d.payment_link_url).catch(() => {});
      toast.success('Payment link created & copied to clipboard');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not create payment link'),
  });
  const markPaid = useMutation({
    mutationFn: (id) => api.post(`/invoices/${id}/mark-paid`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Marked paid'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not update'),
  });
  const sendEmail = useMutation({
    mutationFn: ({ id, email }) => api.post(`/invoices/${id}/email`, { email }).then((r) => r.data),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success(`Invoice emailed to ${d.to}`); setEmailFor(null); },
    onError: (e) => toast.error(e.response?.data?.error || 'Could not send email'),
  });

  // Fetch the PDF with auth (axios attaches the token) and open it in a new tab.
  const openPdf = async (inv) => {
    const t = toast.loading('Generating PDF…');
    try {
      const r = await api.get(`/invoices/${inv.id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast.dismiss(t);
    } catch {
      toast.dismiss(t);
      toast.error('Could not generate PDF');
    }
  };
  const openEmail = (inv) => {
    const cust = (customers || []).find((c) => c.id === inv.customer_id);
    setEmailAddr(cust?.contact_email || '');
    setEmailFor(inv);
  };

  const openNew = () => { setForm(EMPTY); setModal(true); };
  const handleEdit = (inv) => {
    setForm({
      id: inv.id, customer_id: inv.customer_id || '',
      line_items: inv.line_items?.length ? inv.line_items : [{ description: '', qty: 1, rate: 0 }],
      tax_pct: inv.tax_pct ?? 0, notes: inv.notes || '', due_date: inv.due_date ? inv.due_date.split('T')[0] : '',
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
        <h1 style={s.h1}>Invoices</h1>
        <button style={s.btn} onClick={openNew}>+ New Invoice</button>
      </div>

      {isLoading ? <p>Loading…</p> : !invoices?.length ? (
        <p style={{ color: colors.textMuted }}>No invoices yet. Create one, then send a UPI/card payment link to the customer.</p>
      ) : invoices.map((inv) => (
        <div style={s.card} key={inv.id}>
          <div style={s.row}>
            <div>
              <div style={{ fontWeight: 700, color: colors.navy }}>
                {inv.invoice_number} · {inv.customer_name || '—'}
                <span style={{ ...s.badge, marginLeft: 8, background: STATUS_BG[inv.status], color: STATUS_TEXT[inv.status] }}>{inv.status}</span>
              </div>
              <div style={s.meta}>
                {fmt(inv.total)}
                {inv.due_date ? ` · due ${format(new Date(inv.due_date), 'MMM d, yyyy')}` : ''}
                {inv.paid_at ? ` · paid ${format(new Date(inv.paid_at), 'MMM d, yyyy')}` : ''}
              </div>
              {inv.razorpay_payment_link_url && inv.status !== 'Paid' && (
                <a href={inv.razorpay_payment_link_url} target="_blank" rel="noreferrer" style={{ ...s.meta, color: colors.blue, display: 'inline-block' }}>
                  🔗 Payment link
                </a>
              )}
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <button style={s.link} onClick={() => openPdf(inv)}>PDF</button>
              {inv.status !== 'Cancelled' && (
                <button style={{ ...s.link, color: colors.blueDark }} onClick={() => openEmail(inv)}>Email</button>
              )}
              {inv.status !== 'Paid' && inv.status !== 'Cancelled' && (
                <>
                  <button style={s.link} onClick={() => handleEdit(inv)}>Edit</button>
                  <RazorpayButton
                    invoiceId={inv.id}
                    description={`Invoice ${inv.invoice_number}`}
                    prefill={{ name: inv.customer_name, email: inv.contact_email }}
                    onPaid={() => qc.invalidateQueries({ queryKey: ['invoices'] })}
                    label="Pay Now"
                    style={{ ...s.link, color: colors.green }}
                  />
                  <button style={{ ...s.link, color: colors.purple }} onClick={() => payLink.mutate(inv.id)} disabled={payLink.isPending}>
                    {inv.razorpay_payment_link_url ? 'Resend Link' : 'Payment Link'}
                  </button>
                  <button style={{ ...s.link, color: colors.green }} onClick={() => { if (confirm(`Mark ${inv.invoice_number} as paid?`)) markPaid.mutate(inv.id); }}>Mark Paid</button>
                </>
              )}
              <button style={{ ...s.link, color: colors.red }} onClick={() => { if (confirm(`Delete ${inv.invoice_number}?`)) remove.mutate(inv.id); }}>Delete</button>
            </div>
          </div>
        </div>
      ))}

      {modal && (
        <div style={s.modal} onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
          <div style={s.mcard}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{form.id ? 'Edit Invoice' : 'New Invoice'}</h2>
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

              <label style={s.label}>Due Date</label>
              <input style={s.input} type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />

              <label style={s.label}>Notes</label>
              <input style={s.input} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Payment terms, etc." />

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

      {emailFor && (
        <div style={s.modal} onClick={(e) => { if (e.target === e.currentTarget) setEmailFor(null); }}>
          <form
            style={{ ...s.mcard, width: 'min(440px, 100%)' }}
            onSubmit={(e) => { e.preventDefault(); sendEmail.mutate({ id: emailFor.id, email: emailAddr.trim() }); }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Email Invoice</h2>
            <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 8 }}>
              {emailFor.invoice_number} · {emailFor.customer_name || '—'} · {fmt(emailFor.total)}
            </div>
            <label style={s.label}>Send to</label>
            <input
              style={s.input} type="email" required autoFocus value={emailAddr}
              onChange={(e) => setEmailAddr(e.target.value)} placeholder="customer@email.com"
            />
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }}>
              The invoice PDF is attached to the email.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button type="button" style={{ ...s.btn, background: colors.bgAlt, color: colors.text }} onClick={() => setEmailFor(null)}>Cancel</button>
              <button type="submit" style={s.btn} disabled={sendEmail.isPending}>
                {sendEmail.isPending ? 'Sending…' : 'Send Invoice'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
