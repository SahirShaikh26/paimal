// Public, unauthenticated endpoints for the customer-facing online booking page.
// Tenant is resolved from the URL slug; only tenants that have explicitly
// enabled online booking are exposed.
const router = require('express').Router();
const db = require('../db');

async function resolveTenant(slug) {
  const { rows } = await db.query(
    `SELECT id, name, online_booking_enabled FROM tenants WHERE slug=$1 AND active=true`,
    [slug]
  );
  return rows[0] || null;
}

// GET /api/public/:slug  — company info + service types for the booking form
router.get('/:slug', async (req, res) => {
  try {
    const t = await resolveTenant(req.params.slug);
    if (!t || !t.online_booking_enabled) {
      return res.status(404).json({ error: 'Online booking is not available' });
    }
    const { rows: services } = await db.query(
      `SELECT label FROM activity_types WHERE tenant_id=$1 ORDER BY sort_order, label`,
      [t.id]
    );
    res.json({ name: t.name, services: services.map((s) => s.label) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/public/:slug/booking  — submit a service request
router.post('/:slug/booking', async (req, res) => {
  const { customer_name, customer_phone, customer_email, address, service_type, preferred_date, notes } = req.body;
  if (!customer_name || !customer_phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }
  try {
    const t = await resolveTenant(req.params.slug);
    if (!t || !t.online_booking_enabled) {
      return res.status(404).json({ error: 'Online booking is not available' });
    }
    await db.query(
      `INSERT INTO booking_requests
         (tenant_id, customer_name, customer_phone, customer_email, address, service_type, preferred_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [t.id, customer_name, customer_phone, customer_email || null, address || null,
       service_type || null, preferred_date || null, notes || null]
    );
    res.status(201).json({ message: 'Request received — the team will contact you shortly.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
