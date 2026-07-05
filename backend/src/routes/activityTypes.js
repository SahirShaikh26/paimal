const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');

router.use(auth, tenant);

// GET /api/activity-types
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM activity_types WHERE tenant_id=$1 ORDER BY sort_order, label`,
      [req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/activity-types  (Director only)
router.post('/', async (req, res) => {
  if (req.user.role !== 'Director') {
    return res.status(403).json({ error: 'Only Directors can manage activity types' });
  }
  const { code, label, color, sort_order, category } = req.body;
  if (!code || !label) return res.status(400).json({ error: 'code and label are required' });

  try {
    const { rows } = await db.query(
      `INSERT INTO activity_types (tenant_id, code, label, color, sort_order, category)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.tenantId, code.toUpperCase(), label, color || '#2563eb', sort_order || 0, category || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/activity-types/:id  (Director only)
router.put('/:id', async (req, res) => {
  if (req.user.role !== 'Director') {
    return res.status(403).json({ error: 'Only Directors can manage activity types' });
  }
  const { code, label, color, sort_order, category } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE activity_types SET code=$1, label=$2, color=$3, sort_order=$4, category=COALESCE($7, category)
       WHERE id=$5 AND tenant_id=$6 RETURNING *`,
      [code?.toUpperCase(), label, color, sort_order, req.params.id, req.tenantId, category ?? null]
    );
    if (!rows.length) return res.status(404).json({ error: 'Activity type not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/activity-types/:id  (Director only)
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'Director') {
    return res.status(403).json({ error: 'Only Directors can manage activity types' });
  }
  try {
    const { rowCount } = await db.query(
      'DELETE FROM activity_types WHERE id=$1 AND tenant_id=$2',
      [req.params.id, req.tenantId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Activity type not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
