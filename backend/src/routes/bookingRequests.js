const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');

router.use(auth, tenant);

function canManage(req, res, next) {
  if (!['Director', 'Manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
}
router.use(canManage);

// GET /api/booking-requests  — newest first; defaults to pending
router.get('/', async (req, res) => {
  const { status } = req.query;
  const conditions = ['tenant_id=$1'];
  const params = [req.tenantId];
  if (status) { conditions.push('status=$2'); params.push(status); }
  try {
    const { rows } = await db.query(
      `SELECT * FROM booking_requests WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/booking-requests/:id/approve
// Marks the request approved and ensures a matching customer exists (matched by
// phone) so the team can schedule a visit for them from the Schedule page.
router.post('/:id/approve', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM booking_requests WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Request not found' });
    const br = rows[0];

    const existing = await db.query(
      `SELECT id FROM customers WHERE tenant_id=$1 AND contact_phone=$2 LIMIT 1`,
      [req.tenantId, br.customer_phone]
    );
    let customerId = existing.rows[0]?.id;
    if (!customerId) {
      const code = 'WEB-' + Date.now().toString().slice(-6);
      const created = await db.query(
        `INSERT INTO customers (tenant_id, code, name, contact_name, contact_phone, address)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [req.tenantId, code, br.customer_name, br.customer_name, br.customer_phone, br.address]
      );
      customerId = created.rows[0].id;
    }

    await db.query(`UPDATE booking_requests SET status='Approved' WHERE id=$1`, [br.id]);
    res.json({ message: 'Approved', customer_id: customerId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/booking-requests/:id/decline
router.post('/:id/decline', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `UPDATE booking_requests SET status='Declined' WHERE id=$1 AND tenant_id=$2`,
      [req.params.id, req.tenantId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Request not found' });
    res.json({ message: 'Declined' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
