const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');

router.use(auth, tenant);

// GET /api/tenant  — current tenant's settings (any authenticated user)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT name, slug, plan, photo_capture_enabled, notifications_enabled, online_booking_enabled,
              pay_period, ot_daily_hours, ot_weekly_hours, late_grace_minutes, working_days_per_week
       FROM tenants WHERE id=$1`,
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
  const {
    photo_capture_enabled, notifications_enabled, online_booking_enabled,
    pay_period, ot_daily_hours, ot_weekly_hours, late_grace_minutes, working_days_per_week,
  } = req.body;

  if (pay_period != null && !['weekly', 'biweekly', 'monthly'].includes(pay_period)) {
    return res.status(400).json({ error: 'pay_period must be weekly, biweekly or monthly' });
  }
  if (working_days_per_week != null && ![5, 6, 7].includes(Number(working_days_per_week))) {
    return res.status(400).json({ error: 'working_days_per_week must be 5, 6 or 7' });
  }

  const num = (v) => (v != null && !Number.isNaN(Number(v)) ? Number(v) : null);

  try {
    // COALESCE keeps any setting the caller didn't include unchanged.
    const { rows } = await db.query(
      `UPDATE tenants SET
         photo_capture_enabled = COALESCE($1, photo_capture_enabled),
         notifications_enabled = COALESCE($2, notifications_enabled),
         online_booking_enabled = COALESCE($3, online_booking_enabled),
         pay_period = COALESCE($4, pay_period),
         ot_daily_hours = COALESCE($5, ot_daily_hours),
         ot_weekly_hours = COALESCE($6, ot_weekly_hours),
         late_grace_minutes = COALESCE($7, late_grace_minutes),
         working_days_per_week = COALESCE($8, working_days_per_week)
       WHERE id=$9
       RETURNING name, slug, plan, photo_capture_enabled, notifications_enabled, online_booking_enabled,
                 pay_period, ot_daily_hours, ot_weekly_hours, late_grace_minutes, working_days_per_week`,
      [
        typeof photo_capture_enabled === 'boolean' ? photo_capture_enabled : null,
        typeof notifications_enabled === 'boolean' ? notifications_enabled : null,
        typeof online_booking_enabled === 'boolean' ? online_booking_enabled : null,
        pay_period || null,
        num(ot_daily_hours),
        num(ot_weekly_hours),
        num(late_grace_minutes),
        num(working_days_per_week),
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
