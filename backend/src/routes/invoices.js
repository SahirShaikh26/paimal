const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const razorpay = require('../razorpay');
const { sendMessage } = require('../notify');
const { computeTotals, nextNumber } = require('../lib/billingDocs');
const { generateInvoicePdf } = require('../lib/invoicePdf');
const { sendMail, mailerConfigured } = require('../mailer');

// Load an invoice with the customer + tenant fields the PDF/email need.
async function loadInvoiceDoc(id, tenantId) {
  const { rows } = await db.query(
    `SELECT i.*, c.name AS customer_name, c.contact_name, c.contact_phone, c.contact_email,
            c.address AS customer_address, c.city, c.region
       FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id
      WHERE i.id=$1 AND i.tenant_id=$2`,
    [id, tenantId]
  );
  if (!rows.length) return null;
  const inv = rows[0];
  const t = await db.query(`SELECT name FROM tenants WHERE id=$1`, [tenantId]);
  return {
    invoice: inv,
    tenant: t.rows[0] || { name: 'Paimal' },
    customer: {
      name: inv.customer_name, contact_name: inv.contact_name, contact_phone: inv.contact_phone,
      contact_email: inv.contact_email, address: inv.customer_address, city: inv.city, region: inv.region,
    },
  };
}

router.use(auth, tenant);

function canManage(req, res, next) {
  if (!['Director', 'Manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
}
router.use(canManage);

// GET /api/invoices
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT i.*, c.name AS customer_name
       FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id
       WHERE i.tenant_id=$1 ORDER BY i.created_at DESC`,
      [req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/invoices
router.post('/', async (req, res) => {
  const { customer_id, line_items, tax_pct, notes, due_date, status } = req.body;
  if (!customer_id) return res.status(400).json({ error: 'customer_id is required' });

  const { subtotal, taxAmount, total } = computeTotals(line_items, tax_pct);
  try {
    const invoice_number = await nextNumber(req.tenantId, 'invoice');
    const { rows } = await db.query(
      `INSERT INTO invoices
         (tenant_id, customer_id, invoice_number, status, line_items, subtotal, tax_pct, tax_amount, total, notes, due_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.tenantId, customer_id, invoice_number, status === 'Sent' ? 'Sent' : 'Draft',
       JSON.stringify(line_items || []), subtotal, Number(tax_pct) || 0, taxAmount, total,
       notes || null, due_date || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/invoices/:id
router.put('/:id', async (req, res) => {
  const { customer_id, line_items, tax_pct, notes, due_date, status } = req.body;
  const { subtotal, taxAmount, total } = computeTotals(line_items, tax_pct);
  try {
    const { rows } = await db.query(
      `UPDATE invoices SET
         customer_id=COALESCE($1,customer_id),
         line_items=$2, subtotal=$3, tax_pct=$4, tax_amount=$5, total=$6,
         notes=$7, due_date=$8, status=COALESCE($9,status)
       WHERE id=$10 AND tenant_id=$11 RETURNING *`,
      [customer_id || null, JSON.stringify(line_items || []), subtotal, Number(tax_pct) || 0,
       taxAmount, total, notes || null, due_date || null, status || null, req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM invoices WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenantId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/invoices/:id/payment-link
// Creates a Razorpay Payment Link (UPI/cards/netbanking) and texts/WhatsApps it
// to the customer. Marks the invoice 'Sent'. 503s gracefully if Razorpay is off.
router.post('/:id/payment-link', async (req, res) => {
  if (!razorpay) return res.status(503).json({ error: 'Payments are not configured' });

  try {
    const { rows } = await db.query(
      `SELECT i.*, c.name AS customer_name, c.contact_phone, c.contact_name
       FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id
       WHERE i.id=$1 AND i.tenant_id=$2`,
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
    const inv = rows[0];

    if (inv.status === 'Paid') return res.status(400).json({ error: 'Invoice is already paid' });
    if (Number(inv.total) <= 0) return res.status(400).json({ error: 'Invoice total must be greater than zero' });

    const link = await razorpay.paymentLink.create({
      amount: Math.round(Number(inv.total) * 100), // paise
      currency: 'INR',
      accept_partial: false,
      description: `Invoice ${inv.invoice_number}`,
      customer: {
        name: inv.contact_name || inv.customer_name || 'Customer',
        contact: inv.contact_phone || undefined,
      },
      notify: { sms: !!inv.contact_phone, email: false },
      reminder_enable: true,
      notes: { tenant_id: req.tenantId, invoice_id: inv.id },
    });

    const updated = await db.query(
      `UPDATE invoices SET razorpay_payment_link_id=$1, razorpay_payment_link_url=$2,
         status=CASE WHEN status='Draft' THEN 'Sent' ELSE status END
       WHERE id=$3 RETURNING *`,
      [link.id, link.short_url, inv.id]
    );

    // Best-effort customer notification — never blocks the response.
    const { rows: tRows } = await db.query(`SELECT notifications_enabled FROM tenants WHERE id=$1`, [req.tenantId]);
    if (tRows[0]?.notifications_enabled && inv.contact_phone) {
      sendMessage({
        to: inv.contact_phone,
        channel: 'whatsapp',
        body: `Hi ${inv.contact_name || ''}, your invoice ${inv.invoice_number} for ₹${Number(inv.total).toLocaleString('en-IN')} is ready. Pay securely here: ${link.short_url}`,
      }).catch(() => {});
    }

    res.json({ payment_link_url: link.short_url, invoice: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create payment link' });
  }
});

// GET /api/invoices/:id/pdf — generate the invoice PDF (download / preview)
router.get('/:id/pdf', async (req, res) => {
  try {
    const data = await loadInvoiceDoc(req.params.id, req.tenantId);
    if (!data) return res.status(404).json({ error: 'Invoice not found' });
    const pdf = await generateInvoicePdf(data);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${data.invoice.invoice_number}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not generate PDF' });
  }
});

// POST /api/invoices/:id/email  { email } — email the invoice PDF to the customer.
// 503s gracefully when SMTP isn't configured. Marks a Draft invoice 'Sent'.
router.post('/:id/email', async (req, res) => {
  const email = (req.body.email || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }
  if (!mailerConfigured) return res.status(503).json({ error: 'Email sending is not configured' });

  try {
    const data = await loadInvoiceDoc(req.params.id, req.tenantId);
    if (!data) return res.status(404).json({ error: 'Invoice not found' });
    const { invoice, tenant, customer } = data;

    const pdf = await generateInvoicePdf(data);
    const amount = 'Rs. ' + Number(invoice.total || 0).toLocaleString('en-IN');
    const esc = (s) => String(s == null ? '' : s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const company = esc(tenant.name || 'Paimal');
    const greetName = customer.contact_name ? esc(customer.contact_name) : 'there';
    const payUrl = invoice.razorpay_payment_link_url;
    const fmtDate = (d) => { const dt = new Date(d); return isNaN(dt) ? '' : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };

    // From: keep the verified address, but show the business as the sender name.
    const baseFrom = process.env.MAIL_FROM || 'Paimal <invoices@paimal.com>';
    const fromAddr = (baseFrom.match(/<([^>]+)>/) || [])[1] || 'invoices@paimal.com';
    const from = `${(tenant.name || 'Paimal').replace(/["<>]/g, '')} <${fromAddr}>`;

    const text = `Hi ${customer.contact_name || 'there'},\n\n`
      + `Please find attached invoice ${invoice.invoice_number} for ${amount} from ${tenant.name}.\n`
      + (invoice.due_date ? `Due by ${fmtDate(invoice.due_date)}.\n` : '')
      + (payUrl ? `\nPay online: ${payUrl}\n` : '')
      + `\nThank you.\n\n`
      + `— — —\n`
      + `This is a transactional email regarding invoice ${invoice.invoice_number}, sent by ${tenant.name} via Paimal. `
      + `If you have questions about this invoice, reply to this email to reach ${tenant.name}. `
      + `Paimal privacy policy: https://paimal.com/privacy`;

    const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#201C16;font-size:15px;line-height:1.6;max-width:540px;margin:0 auto;padding:8px">
  <p style="margin:0 0 14px">Hi ${greetName},</p>
  <p style="margin:0 0 14px">Please find attached invoice <strong>${esc(invoice.invoice_number)}</strong> for <strong>${amount}</strong> from <strong>${company}</strong>.${invoice.due_date ? ` Due by <strong>${fmtDate(invoice.due_date)}</strong>.` : ''}</p>
  ${payUrl ? `<p style="margin:0 0 18px"><a href="${esc(payUrl)}" style="display:inline-block;background:#E4881F;color:#ffffff;text-decoration:none;padding:11px 24px;border-radius:8px;font-weight:bold">Pay online</a></p>` : ''}
  <p style="margin:0 0 6px;color:#8B8375;font-size:13px">📎 The invoice PDF is attached to this email.</p>
  <hr style="border:none;border-top:1px solid #EAE4DA;margin:22px 0 12px">
  <p style="margin:0;color:#8B8375;font-size:12px;line-height:1.6">
    This is a transactional email regarding invoice ${esc(invoice.invoice_number)}, sent by <strong>${company}</strong> via Paimal.
    If you have questions about this invoice, just reply to this email to reach ${company}.<br>
    ${company} uses Paimal to manage its field operations and billing — see Paimal's <a href="https://paimal.com/privacy" style="color:#C2740C">Privacy Policy</a>.
  </p>
</div>`;

    const result = await sendMail({
      to: email,
      from,
      replyTo: req.user.email || undefined,
      subject: `Invoice ${invoice.invoice_number} from ${tenant.name}`,
      text,
      html,
      attachments: [{ filename: `${invoice.invoice_number}.pdf`, content: pdf, contentType: 'application/pdf' }],
    });
    if (!result.sent) return res.status(502).json({ error: result.detail || 'Email could not be sent' });

    const upd = await db.query(
      `UPDATE invoices SET status=CASE WHEN status='Draft' THEN 'Sent' ELSE status END
        WHERE id=$1 AND tenant_id=$2 RETURNING *`,
      [invoice.id, req.tenantId]
    );
    res.json({ sent: true, to: email, invoice: upd.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not send invoice email' });
  }
});

// POST /api/invoices/:id/mark-paid  — record an offline/cash/UPI payment
router.post('/:id/mark-paid', async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE invoices SET status='Paid', amount_paid=total, paid_at=NOW()
       WHERE id=$1 AND tenant_id=$2 RETURNING *`,
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
