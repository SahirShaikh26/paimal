const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');

router.use(auth, tenant);

// GET /api/logs  — list logs scoped to tenant, with optional filters
router.get('/', async (req, res) => {
  const { engineer_id, date_from, date_to, activity_code, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  const conditions = ['l.tenant_id = $1'];
  const params = [req.tenantId];
  let i = 2;

  if (engineer_id) { conditions.push(`l.engineer_id = $${i++}`); params.push(engineer_id); }
  if (date_from)   { conditions.push(`l.date >= $${i++}`);       params.push(date_from); }
  if (date_to)     { conditions.push(`l.date <= $${i++}`);       params.push(date_to); }
  if (activity_code) { conditions.push(`l.activity_code = $${i++}`); params.push(activity_code); }

  // Engineers can only see their own logs
  if (req.user.role === 'Engineer') {
    conditions.push(`l.engineer_id = $${i++}`);
    params.push(req.user.id);
  }

  const where = conditions.join(' AND ');

  try {
    const { rows } = await db.query(
      `SELECT l.*,
              u.name AS engineer_name,
              c.name AS customer_name,
              p.name AS project_name
       FROM activity_logs l
       LEFT JOIN users     u ON u.id = l.engineer_id
       LEFT JOIN customers c ON c.id = l.customer_id
       LEFT JOIN projects  p ON p.id = l.project_id
       WHERE ${where}
       ORDER BY l.date DESC, l.submitted_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, limit, offset]
    );

    const count = await db.query(
      `SELECT COUNT(*) FROM activity_logs l WHERE ${where}`,
      params
    );

    res.json({ data: rows, total: parseInt(count.rows[0].count), page: +page, limit: +limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/logs  — submit a new activity log
router.post('/', async (req, res) => {
  const {
    customer_id, machine_id, project_id, date, activity_code,
    query_type, product_type, hours, billing_inr, cost_inr,
    status, location, notes, visit_id, photo_urls,
    work_mode, travel_hours, billable, ticket_no,
  } = req.body;

  if (!activity_code || !date) {
    return res.status(400).json({ error: 'activity_code and date are required' });
  }

  try {
    // Auto-cost: if no explicit cost given, derive it from the engineer's rate
    // (cost = worked hours × cost/hour), matching the spreadsheet behaviour.
    let resolvedCost = cost_inr;
    if (resolvedCost == null || resolvedCost === '') {
      const { rows: u } = await db.query(`SELECT cost_per_hour FROM users WHERE id=$1`, [req.user.id]);
      const rate = Number(u[0]?.cost_per_hour) || 0;
      resolvedCost = rate * (Number(hours) || 0);
    }

    const { rows } = await db.query(
      `INSERT INTO activity_logs
         (tenant_id, engineer_id, customer_id, machine_id, project_id,
          date, activity_code, query_type, product_type, hours,
          billing_inr, cost_inr, status, location, notes, visit_id, photo_urls,
          work_mode, travel_hours, billable, ticket_no)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING *`,
      [
        req.tenantId, req.user.id, customer_id || null, machine_id || null, project_id || null,
        date, activity_code, query_type || null, product_type || null, hours || null,
        billing_inr || 0, resolvedCost || 0, status || null, location || null, notes || null,
        visit_id || null, JSON.stringify(photo_urls || []),
        work_mode || null, travel_hours || 0, billable !== false, ticket_no || null,
      ]
    );

    if (visit_id) {
      await db.query(`UPDATE visits SET status='Completed' WHERE id=$1 AND tenant_id=$2`, [visit_id, req.tenantId]);
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/logs/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT l.*, u.name AS engineer_name, c.name AS customer_name
       FROM activity_logs l
       LEFT JOIN users u ON u.id = l.engineer_id
       LEFT JOIN customers c ON c.id = l.customer_id
       WHERE l.id = $1 AND l.tenant_id = $2`,
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Log not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/logs/:id
router.put('/:id', async (req, res) => {
  const {
    customer_id, machine_id, project_id, date, activity_code,
    query_type, product_type, hours, billing_inr, cost_inr,
    status, location, notes, photo_urls,
    work_mode, travel_hours, billable, ticket_no,
  } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE activity_logs SET
         customer_id=$1, machine_id=$2, project_id=$3, date=$4,
         activity_code=$5, query_type=$6, product_type=$7, hours=$8,
         billing_inr=$9, cost_inr=$10, status=$11, location=$12, notes=$13,
         photo_urls=COALESCE($14, photo_urls),
         work_mode=COALESCE($17, work_mode),
         travel_hours=COALESCE($18, travel_hours),
         billable=COALESCE($19, billable),
         ticket_no=COALESCE($20, ticket_no)
       WHERE id=$15 AND tenant_id=$16
       RETURNING *`,
      [
        customer_id, machine_id, project_id, date, activity_code,
        query_type, product_type, hours, billing_inr, cost_inr,
        status, location, notes, photo_urls ? JSON.stringify(photo_urls) : null,
        req.params.id, req.tenantId,
        work_mode ?? null, travel_hours ?? null,
        typeof billable === 'boolean' ? billable : null, ticket_no ?? null,
      ]
    );
    if (!rows.length) return res.status(404).json({ error: 'Log not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/logs/:id  (Directors/Managers only)
router.delete('/:id', async (req, res) => {
  if (!['Director', 'Manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  try {
    const { rowCount } = await db.query(
      'DELETE FROM activity_logs WHERE id=$1 AND tenant_id=$2',
      [req.params.id, req.tenantId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Log not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
