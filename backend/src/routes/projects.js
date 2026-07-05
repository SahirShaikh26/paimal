const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');

router.use(auth, tenant);

// GET /api/projects
router.get('/', async (req, res) => {
  const { status, engineer_id, customer_id } = req.query;
  const conditions = ['p.tenant_id = $1'];
  const params = [req.tenantId];
  let i = 2;

  if (status)      { conditions.push(`p.status = $${i++}`);      params.push(status); }
  if (engineer_id) { conditions.push(`p.engineer_id = $${i++}`); params.push(engineer_id); }
  if (customer_id) { conditions.push(`p.customer_id = $${i++}`); params.push(customer_id); }

  if (req.user.role === 'Engineer') {
    conditions.push(`p.engineer_id = $${i++}`);
    params.push(req.user.id);
  }

  try {
    const { rows } = await db.query(
      `SELECT p.*,
              c.name AS customer_name,
              u.name AS engineer_name,
              pm.name AS project_manager_name
       FROM projects p
       LEFT JOIN customers c ON c.id = p.customer_id
       LEFT JOIN users     u ON u.id = p.engineer_id
       LEFT JOIN users     pm ON pm.id = p.project_manager_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.start_date DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, c.name AS customer_name, u.name AS engineer_name, pm.name AS project_manager_name
       FROM projects p
       LEFT JOIN customers c ON c.id = p.customer_id
       LEFT JOIN users     u ON u.id = p.engineer_id
       LEFT JOIN users     pm ON pm.id = p.project_manager_id
       WHERE p.id = $1 AND p.tenant_id = $2`,
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Project not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/projects
router.post('/', async (req, res) => {
  if (!['Director', 'Manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  const { name, customer_id, engineer_id, status, category, product_type, value_inr, start_date, end_date, project_manager_id, quoted_hours } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name required' });

  try {
    const { rows } = await db.query(
      `INSERT INTO projects
         (tenant_id, name, customer_id, engineer_id, status, category, product_type, value_inr, start_date, end_date, project_manager_id, quoted_hours)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [req.tenantId, name, customer_id, engineer_id, status || 'Planned', category, product_type, value_inr, start_date, end_date, project_manager_id || null, quoted_hours || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/projects/:id
router.put('/:id', async (req, res) => {
  if (!['Director', 'Manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  const { name, customer_id, engineer_id, status, category, product_type, value_inr, start_date, end_date, project_manager_id, quoted_hours } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE projects SET
         name=$1, customer_id=$2, engineer_id=$3, status=$4,
         category=$5, product_type=$6, value_inr=$7, start_date=$8, end_date=$9,
         project_manager_id=COALESCE($12, project_manager_id),
         quoted_hours=COALESCE($13, quoted_hours)
       WHERE id=$10 AND tenant_id=$11
       RETURNING *`,
      [name, customer_id, engineer_id, status, category, product_type, value_inr, start_date, end_date, req.params.id, req.tenantId, project_manager_id ?? null, quoted_hours ?? null]
    );
    if (!rows.length) return res.status(404).json({ error: 'Project not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'Director') {
    return res.status(403).json({ error: 'Only Directors can delete projects' });
  }
  try {
    const { rowCount } = await db.query(
      'DELETE FROM projects WHERE id=$1 AND tenant_id=$2',
      [req.params.id, req.tenantId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
