const router = require('express').Router();
const crypto = require('crypto');
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const razorpay = require('../razorpay');

// Razorpay Standard Checkout: create an order, then verify the payment
// signature on the callback. Complements the existing subscription (billing.js)
// and payment-link (invoices.js) flows — this is the one-time, in-app modal path.
// Authenticated + tenant-scoped, same as the rest of the app.
router.use(auth, tenant);

// POST /api/checkout/create-order
// Body: { amount (paise), currency?, receipt?, invoice_id? }
// If invoice_id is given, the amount is taken from that invoice server-side —
// never trust a client-supplied amount for a real invoice, or a buyer could
// pay Re.1 for any invoice.
router.post('/create-order', async (req, res) => {
  if (!razorpay) return res.status(503).json({ error: 'Payments are not configured' });

  let { amount, currency = 'INR', receipt } = req.body;
  const { invoice_id } = req.body;

  try {
    if (invoice_id) {
      const { rows } = await db.query(
        `SELECT invoice_number, total, status FROM invoices WHERE id=$1 AND tenant_id=$2`,
        [invoice_id, req.tenantId]
      );
      if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
      if (rows[0].status === 'Paid') return res.status(409).json({ error: 'Invoice is already paid' });
      amount = Math.round(Number(rows[0].total) * 100); // rupees -> paise
      receipt = receipt || rows[0].invoice_number;
    } else {
      amount = Math.round(Number(amount));
    }

    if (!Number.isInteger(amount) || amount < 100) {
      return res.status(400).json({ error: 'amount must be an integer of at least 100 paise' });
    }

    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: { tenant_id: req.tenantId, ...(invoice_id ? { invoice_id } : {}) },
    });

    res.json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    // Razorpay auth failures surface as 401 from their API.
    if (err.statusCode === 401) return res.status(401).json({ error: 'Payment gateway authentication failed' });
    console.error('create-order failed:', err.error?.description || err.message);
    res.status(500).json({ error: 'Could not create payment order' });
  }
});

// POST /api/checkout/verify-payment
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoice_id? }
// Verifies HMAC-SHA256(order_id|payment_id, KEY_SECRET). Marks nothing paid
// unless the signature is valid.
router.post('/verify-payment', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoice_id } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment fields' });
  }

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  // Constant-time comparison; guard against unequal lengths (timingSafeEqual throws otherwise).
  const a = Buffer.from(expected);
  const b = Buffer.from(String(razorpay_signature));
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!ok) return res.status(400).json({ error: 'Payment verification failed', verified: false });

  try {
    if (invoice_id) {
      await db.query(
        `UPDATE invoices SET status='Paid', amount_paid=total, paid_at=NOW()
         WHERE id=$1 AND tenant_id=$2 AND status <> 'Paid'`,
        [invoice_id, req.tenantId]
      );
    }
    res.json({ verified: true, payment_id: razorpay_payment_id, order_id: razorpay_order_id });
  } catch (err) {
    console.error('verify-payment post-verify update failed:', err.message);
    res.status(500).json({ error: 'Payment verified but could not update the record', verified: true });
  }
});

module.exports = router;
