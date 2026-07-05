const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');

router.use(auth, tenant);

// GET /api/assignments  — the Project × Activity × Engineer planning layer.
// Engineers see only their own; Directors/Managers see all. Filterable by project/engineer.
router.get('/', async (req, res) => {
  const { project_id, engineer_id } = req.query;
  const conditions = ['a.tenant_id=$1'];
  const params = [req.tenantId];
  let i = 2;
  if (project_id)  { conditions.push(`a.project_id=$${i++}`);  params.push(project_id); }
  if (engineer_id) { conditions.push(`a.engineer_id=$${i++}`); params.push(engineer_id); }
  if (req.user.role === 'Engineer') { conditions.push(`a.engineer_id=$${i++}`); params.push(req.user.id); }

  try {
    const { rows } = await db.query(
      `SELECT a.*, p.name AS project_name, u.name AS engineer_name,
              at.label AS activity_label, at.code AS activity_code
       FROM assignments a
       LEFT JOIN projects p ON p.id = a.project_id
       LEFT JOIN users u ON u.id = a.engineer_id
       LEFT JOIN activity_types at ON at.id = a.activity_type_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.name, u.name`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

function canManage(req, res, next) {
  if (!['Director', 'Manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
}

// POST /api/assignments
router.post('/', canManage, async (req, res) => {
  const { project_id, activity_type_id, engineer_id, product, planned_days, start_date, end_date, status, notes } = req.body;
  if (!project_id || !engineer_id) return res.status(400).json({ error: 'project_id and engineer_id are required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO assignments
         (tenant_id, project_id, activity_type_id, engineer_id, product, planned_days, start_date, end_date, status, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.tenantId, project_id, activity_type_id || null, engineer_id, product || null,
       planned_days || 0, start_date || null, end_date || null, status || 'Not Started', notes || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/assignments/:id
router.put('/:id', canManage, async (req, res) => {
  const { project_id, activity_type_id, engineer_id, product, planned_days, start_date, end_date, status, notes } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE assignments SET
         project_id=COALESCE($1,project_id), activity_type_id=COALESCE($2,activity_type_id),
         engineer_id=COALESCE($3,engineer_id), product=COALESCE($4,product),
         planned_days=COALESCE($5,planned_days), start_date=COALESCE($6,start_date),
         end_date=COALESCE($7,end_date), status=COALESCE($8,status), notes=COALESCE($9,notes)
       WHERE id=$10 AND tenant_id=$11 RETURNING *`,
      [project_id ?? null, activity_type_id ?? null, engineer_id ?? null, product ?? null,
       planned_days ?? null, start_date ?? null, end_date ?? null, status ?? null, notes ?? null,
       req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Assignment not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/assignments/:id
router.delete('/:id', canManage, async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM assignments WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenantId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Assignment not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
