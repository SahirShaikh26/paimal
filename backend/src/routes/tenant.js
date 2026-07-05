const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');

router.use(auth, tenant);

// GET /api/tenant  — current tenant's settings (any authenticated user)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT name, slug, plan, photo_capture_enabled, notifications_enabled, online_booking_enabled FROM tenants WHERE id=$1`,
      [req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Tenant not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tenant/settings  (Director only)
router.put('/settings', async (req, res) => {
  if (req.user.role !== 'Director') {
    return res.status(403).json({ error: 'Only Directors can change tenant settings' });
  }
  const { photo_capture_enabled, notifications_enabled, online_booking_enabled } = req.body;

  try {
    // COALESCE keeps any setting the caller didn't include unchanged.
    const { rows } = await db.query(
      `UPDATE tenants SET
         photo_capture_enabled = COALESCE($1, photo_capture_enabled),
         notifications_enabled = COALESCE($2, notifications_enabled),
         online_booking_enabled = COALESCE($3, online_booking_enabled)
       WHERE id=$4
       RETURNING name, slug, plan, photo_capture_enabled, notifications_enabled, online_booking_enabled`,
      [
        typeof photo_capture_enabled === 'boolean' ? photo_capture_enabled : null,
        typeof notifications_enabled === 'boolean' ? notifications_enabled : null,
        typeof online_booking_enabled === 'boolean' ? online_booking_enabled : null,
        req.tenantId,
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
