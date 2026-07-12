const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const { rows } = await db.query(
      `SELECT u.*, t.slug AS tenant_slug FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = $1 AND u.active = true`,
      [email]
    );

    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, tenant_id: user.tenant_id, role: user.role, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, dept: user.dept },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/register-tenant  (onboarding new company)
router.post('/register-tenant', async (req, res) => {
  const { company_name, slug, admin_name, admin_email, password } = req.body;
  if (!company_name || !slug || !admin_name || !admin_email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }

  try {
    const hash = await bcrypt.hash(password, 12);

    await db.query('BEGIN');
    const { rows: [tenant] } = await db.query(
      `INSERT INTO tenants (name, slug, plan_status, trial_ends_at)
       VALUES ($1, $2, 'trialing', NOW() + INTERVAL '14 days') RETURNING id`,
      [company_name, slug]
    );
    await db.query(
      `INSERT INTO users (tenant_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'Director')`,
      [tenant.id, admin_name, admin_email, hash]
    );
    await db.query(
      `INSERT INTO activity_types (tenant_id, code, label, color, sort_order) VALUES
         ($1,'PM','Preventive Maintenance','#1d4ed8',1),
         ($1,'BD','Breakdown','#dc2626',2),
         ($1,'IN','Installation','#16a34a',3),
         ($1,'TR','Training','#ca8a04',4),
         ($1,'SV','Site Visit','#7c3aed',5),
         ($1,'OF','Office Work','#0369a1',6),
         ($1,'TL','Travel','#be185d',7),
         ($1,'LV','Leave','#475569',8)`,
      [tenant.id]
    );
    await db.query(
      `INSERT INTO leave_types (tenant_id, name, code, annual_quota, paid, sort_order) VALUES
         ($1,'Casual Leave','CL',12.0,true,1),
         ($1,'Sick Leave','SL',8.0,true,2),
         ($1,'Earned Leave','EL',15.0,true,3),
         ($1,'Leave Without Pay','LWP',0.0,false,4)`,
      [tenant.id]
    );
    await db.query('COMMIT');

    // No Razorpay customer pre-creation needed — customer_id attaches
    // automatically once they complete the subscription checkout (see billing.js).

    res.status(201).json({ message: 'Tenant created successfully' });
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') return res.status(409).json({ error: 'Email or slug already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/change-password
const authMiddleware = require('../middleware/auth');
router.post('/change-password', authMiddleware, async (req, res) => {
  const { current_password, new_password } = req.body;
  try {
    const { rows } = await db.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password incorrect' });

    const hash = await bcrypt.hash(new_password, 12);
    await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
