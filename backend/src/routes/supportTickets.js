const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { nextNumber } = require('../lib/billingDocs');

router.use(auth, tenant);

// GET /api/support-tickets  — filter by status; engineers see only their own.
router.get('/', async (req, res) => {
  const { status, project_id } = req.query;
  const conditions = ['t.tenant_id=$1'];
  const params = [req.tenantId];
  let i = 2;
  if (status)     { conditions.push(`t.status=$${i++}`);     params.push(status); }
  if (project_id) { conditions.push(`t.project_id=$${i++}`); params.push(project_id); }
  if (req.user.role === 'Engineer') { conditions.push(`t.assigned_engineer_id=$${i++}`); params.push(req.user.id); }

  try {
    const { rows } = await db.query(
      `SELECT t.*, p.name AS project_name, c.name AS customer_name,
              u.name AS engineer_name, at.label AS activity_label
       FROM support_tickets t
       LEFT JOIN projects p ON p.id = t.project_id
       LEFT JOIN customers c ON c.id = t.customer_id
       LEFT JOIN users u ON u.id = t.assigned_engineer_id
       LEFT JOIN activity_types at ON at.id = t.activity_type_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY (t.status='Open') DESC, t.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/support-tickets  — any authenticated user can raise a ticket
router.post('/', async (req, res) => {
  const { project_id, customer_id, activity_type_id, product, type, priority, issue, assigned_engineer_id, hours, billable, status, date_raised } = req.body;
  if (!issue) return res.status(400).json({ error: 'issue description is required' });
  try {
    const ticket_no = await nextNumber(req.tenantId, 'ticket');
    const { rows } = await db.query(
      `INSERT INTO support_tickets
         (tenant_id, ticket_no, project_id, customer_id, activity_type_id, product, type, priority,
          issue, assigned_engineer_id, hours, billable, status, date_raised, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [req.tenantId, ticket_no, project_id || null, customer_id || null, activity_type_id || null,
       product || null, type || null, priority || 'Medium', issue, assigned_engineer_id || null,
       hours || 0, billable !== false, status || 'Open', date_raised || new Date().toISOString().split('T')[0], req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/support-tickets/:id  — update; auto-stamps closed_date when set to Closed
router.put('/:id', async (req, res) => {
  const { project_id, customer_id, activity_type_id, product, type, priority, issue, assigned_engineer_id, hours, billable, status } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE support_tickets SET
         project_id=COALESCE($1,project_id), customer_id=COALESCE($2,customer_id),
         activity_type_id=COALESCE($3,activity_type_id), product=COALESCE($4,product),
         type=COALESCE($5,type), priority=COALESCE($6,priority), issue=COALESCE($7,issue),
         assigned_engineer_id=COALESCE($8,assigned_engineer_id), hours=COALESCE($9,hours),
         billable=COALESCE($10,billable), status=COALESCE($11,status),
         closed_date=CASE WHEN $11='Closed' AND closed_date IS NULL THEN CURRENT_DATE
                          WHEN $11='Open' THEN NULL ELSE closed_date END
       WHERE id=$12 AND tenant_id=$13 RETURNING *`,
      [project_id ?? null, customer_id ?? null, activity_type_id ?? null, product ?? null,
       type ?? null, priority ?? null, issue ?? null, assigned_engineer_id ?? null, hours ?? null,
       typeof billable === 'boolean' ? billable : null, status ?? null, req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Ticket not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/support-tickets/:id  (Director/Manager)
router.delete('/:id', async (req, res) => {
  if (!['Director', 'Manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  try {
    const { rowCount } = await db.query(
      `DELETE FROM support_tickets WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenantId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
