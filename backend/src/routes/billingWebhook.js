const router = require('express').Router();
const crypto = require('crypto');
const db = require('../db');

// Mounted with express.raw() BEFORE express.json() in server.js — Razorpay
// signature verification requires the untouched raw request body.
router.post('/', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return res.status(503).end();

  const signature = req.headers['x-razorpay-signature'];
  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');

  if (signature !== expected) {
    console.error('Razorpay webhook signature mismatch');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch (err) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  try {
    const entity = event.payload?.subscription?.entity;

    // Invoice payment links resolve here when the customer pays.
    if (event.event === 'payment_link.paid') {
      const pl = event.payload?.payment_link?.entity;
      if (pl?.id) {
        await db.query(
          `UPDATE invoices SET status='Paid', amount_paid=total, paid_at=NOW()
           WHERE razorpay_payment_link_id=$1`,
          [pl.id]
        );
      }
      return res.json({ status: 'ok' });
    }

    switch (event.event) {
      case 'subscription.authenticated':
      case 'subscription.activated': {
        if (entity) {
          const tenantId = entity.notes?.tenant_id;
          const tier = entity.notes?.tier;
          if (tenantId) {
            await db.query(
              `UPDATE tenants SET plan=$1, plan_status='active', razorpay_subscription_id=$2, razorpay_customer_id=$3 WHERE id=$4`,
              [tier || null, entity.id, entity.customer_id || null, tenantId]
            );
          }
        }
        break;
      }
      case 'subscription.charged': {
        if (entity) {
          await db.query(`UPDATE tenants SET plan_status='active' WHERE razorpay_subscription_id=$1`, [entity.id]);
        }
        break;
      }
      case 'subscription.pending': {
        if (entity) {
          await db.query(`UPDATE tenants SET plan_status='past_due' WHERE razorpay_subscription_id=$1`, [entity.id]);
        }
        break;
      }
      case 'subscription.cancelled':
      case 'subscription.completed':
      case 'subscription.halted': {
        if (entity) {
          await db.query(
            `UPDATE tenants SET plan='starter', plan_status='canceled' WHERE razorpay_subscription_id=$1`,
            [entity.id]
          );
        }
        break;
      }
    }
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook handling error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

module.exports = router;
