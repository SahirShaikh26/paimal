const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const requireRole = require('../middleware/requireRole');

router.use(auth, tenant);

// ---- Templates ----

// GET /api/shifts/templates
router.get('/templates', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM shift_templates WHERE tenant_id=$1 AND active=true ORDER BY start_time, name`,
      [req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/shifts/templates
router.post('/templates', requireRole('Director', 'Manager'), async (req, res) => {
  const { name, start_time, end_time, days_of_week, color } = req.body;
  if (!name || !start_time || !end_time) {
    return res.status(400).json({ error: 'name, start_time, end_time required' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO shift_templates (tenant_id, name, start_time, end_time, days_of_week, color)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.tenantId, name, start_time, end_time,
       JSON.stringify(days_of_week || [1, 2, 3, 4, 5, 6]), color || '#1d4ed8']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/shifts/templates/:id
router.put('/templates/:id', requireRole('Director', 'Manager'), async (req, res) => {
  const { name, start_time, end_time, days_of_week, color } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE shift_templates SET
         name=COALESCE($1,name), start_time=COALESCE($2,start_time), end_time=COALESCE($3,end_time),
         days_of_week=COALESCE($4,days_of_week), color=COALESCE($5,color)
       WHERE id=$6 AND tenant_id=$7 RETURNING *`,
      [name ?? null, start_time ?? null, end_time ?? null,
       days_of_week ? JSON.stringify(days_of_week) : null, color ?? null,
       req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Template not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/shifts/templates/:id — soft delete; assignments cascade stays intact.
router.delete('/templates/:id', requireRole('Director', 'Manager'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE shift_templates SET active=false WHERE id=$1 AND tenant_id=$2 RETURNING id`,
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Template not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- Assignments ----

// GET /api/shifts?from=&to= — managers see everyone, engineers see their own.
router.get('/', async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });
  const params = [req.tenantId, from, to];
  let userFilter = '';
  if (req.user.role === 'Engineer') {
    params.push(req.user.id);
    userFilter = `AND sa.user_id=$${params.length}`;
  }
  try {
    const { rows } = await db.query(
      `SELECT sa.id, sa.user_id, sa.date::text AS date, sa.shift_template_id,
              u.name AS user_name, st.name, st.start_time, st.end_time, st.color
       FROM shift_assignments sa
       JOIN users u ON u.id = sa.user_id
       JOIN shift_templates st ON st.id = sa.shift_template_id
       WHERE sa.tenant_id=$1 AND sa.date BETWEEN $2 AND $3 ${userFilter}
       ORDER BY sa.date, u.name`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/shifts/me?days=14
router.get('/me', async (req, res) => {
  const days = Math.min(Number(req.query.days) || 14, 60);
  try {
    const { rows } = await db.query(
      `SELECT sa.id, sa.date::text AS date, st.name, st.start_time, st.end_time, st.color
       FROM shift_assignments sa
       JOIN shift_templates st ON st.id = sa.shift_template_id
       WHERE sa.user_id=$1 AND sa.date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($2 || ' days')::interval
       ORDER BY sa.date`,
      [req.user.id, days]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/shifts/assign {user_id, shift_template_id, dates: [YYYY-MM-DD], repeat_weeks?}
router.post('/assign', requireRole('Director', 'Manager'), async (req, res) => {
  const { user_id, shift_template_id, dates, repeat_weeks } = req.body;
  if (!user_id || !shift_template_id || !Array.isArray(dates) || !dates.length) {
    return res.status(400).json({ error: 'user_id, shift_template_id, dates[] required' });
  }
  try {
    // Guard: both user and template must belong to this tenant.
    const [{ rows: u }, { rows: t }] = await Promise.all([
      db.query(`SELECT id FROM users WHERE id=$1 AND tenant_id=$2`, [user_id, req.tenantId]),
      db.query(`SELECT id FROM shift_templates WHERE id=$1 AND tenant_id=$2`, [shift_template_id, req.tenantId]),
    ]);
    if (!u.length || !t.length) return res.status(404).json({ error: 'User or template not found' });

    const allDates = new Set(dates);
    const weeks = Math.min(Number(repeat_weeks) || 0, 12);
    for (const d of dates) {
      for (let w = 1; w <= weeks; w++) {
        const nd = new Date(`${d}T00:00:00Z`);
        nd.setUTCDate(nd.getUTCDate() + w * 7);
        allDates.add(nd.toISOString().split('T')[0]);
      }
    }

    const out = [];
    for (const d of allDates) {
      const { rows } = await db.query(
        `INSERT INTO shift_assignments (tenant_id, user_id, shift_template_id, date, created_by)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (user_id, date) DO UPDATE SET shift_template_id=EXCLUDED.shift_template_id
         RETURNING *`,
        [req.tenantId, user_id, shift_template_id, d, req.user.id]
      );
      out.push(rows[0]);
    }
    res.status(201).json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/shifts/:id — remove one assignment.
router.delete('/:id', requireRole('Director', 'Manager'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `DELETE FROM shift_assignments WHERE id=$1 AND tenant_id=$2 RETURNING id`,
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Assignment not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
