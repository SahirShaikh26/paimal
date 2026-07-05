const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const PLANS = require('../config/plans');

router.use(auth, tenant);

// GET /api/engineers
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, email, role, dept, job_title, cost_per_hour, reports_to, active, created_at
       FROM users WHERE tenant_id=$1 ORDER BY name`,
      [req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/engineers/me
router.get('/me', (req, res) => {
  res.json(req.user);
});

// GET /api/engineers/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, email, role, dept, reports_to, active, created_at
       FROM users WHERE id=$1 AND tenant_id=$2`,
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/engineers  — create user (Director only)
router.post('/', async (req, res) => {
  if (req.user.role !== 'Director') {
    return res.status(403).json({ error: 'Only Directors can create users' });
  }
  const { name, email, password, role, dept, reports_to, job_title, cost_per_hour } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password, role required' });
  }

  try {
    const { rows: [tenantRow] } = await db.query(`SELECT plan FROM tenants WHERE id=$1`, [req.tenantId]);
    const planCfg = PLANS[tenantRow?.plan] || PLANS.starter;
    if (planCfg.seatCap !== Infinity) {
      const { rows: [{ count }] } = await db.query(
        `SELECT COUNT(*) FROM users WHERE tenant_id=$1 AND active=true`,
        [req.tenantId]
      );
      if (Number(count) >= planCfg.seatCap) {
        return res.status(402).json({
          error: `Seat limit reached for the ${planCfg.label} plan. Upgrade to add more team members.`,
        });
      }
    }

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      `INSERT INTO users (tenant_id, name, email, password_hash, role, dept, reports_to, job_title, cost_per_hour)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, name, email, role, dept, job_title, cost_per_hour, reports_to, created_at`,
      [req.tenantId, name, email, hash, role, dept, reports_to || null, job_title || null, cost_per_hour || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/engineers/:id
router.put('/:id', async (req, res) => {
  if (!['Director', 'Manager'].includes(req.user.role) && req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  const { name, role, dept, reports_to, active, job_title, cost_per_hour } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE users SET name=$1, role=$2, dept=$3, reports_to=$4, active=$5,
         job_title=COALESCE($8, job_title), cost_per_hour=COALESCE($9, cost_per_hour)
       WHERE id=$6 AND tenant_id=$7
       RETURNING id, name, email, role, dept, job_title, cost_per_hour, reports_to, active`,
      [name, role, dept, reports_to, active, req.params.id, req.tenantId,
       job_title ?? null, cost_per_hour ?? null]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/engineers/:id/attendance
router.get('/:id/attendance', async (req, res) => {
  const { month } = req.query; // format: YYYY-MM
  try {
    const { rows } = await db.query(
      `SELECT * FROM attendance
       WHERE engineer_id=$1
       ${month ? "AND TO_CHAR(date,'YYYY-MM')=$2" : ''}
       ORDER BY date DESC`,
      month ? [req.params.id, month] : [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/engineers/attendance/checkin
router.post('/attendance/checkin', async (req, res) => {
  const { lat, lng, location } = req.body;
  const today = new Date().toISOString().split('T')[0];

  try {
    const existing = await db.query(
      'SELECT id FROM attendance WHERE engineer_id=$1 AND date=$2',
      [req.user.id, today]
    );
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Already checked in today' });
    }

    const { rows } = await db.query(
      `INSERT INTO attendance (engineer_id, date, check_in, lat, lng, location)
       VALUES ($1,$2,NOW(),$3,$4,$5) RETURNING *`,
      [req.user.id, today, lat, lng, location]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/engineers/attendance/checkout
router.post('/attendance/checkout', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  try {
    const { rows } = await db.query(
      `UPDATE attendance SET check_out=NOW()
       WHERE engineer_id=$1 AND date=$2 AND check_out IS NULL
       RETURNING *`,
      [req.user.id, today]
    );
    if (!rows.length) return res.status(404).json({ error: 'No active check-in found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
