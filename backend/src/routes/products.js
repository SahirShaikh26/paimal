const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');

router.use(auth, tenant);

// GET /api/products  (any authenticated user — used to populate dropdowns)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM products WHERE tenant_id=$1 ORDER BY sort_order, name`,
      [req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

function director(req, res, next) {
  if (req.user.role !== 'Director') {
    return res.status(403).json({ error: 'Only Directors can manage the product catalogue' });
  }
  next();
}

// POST /api/products
router.post('/', director, async (req, res) => {
  const { name, category, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO products (tenant_id, name, category, sort_order)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.tenantId, name, category || null, sort_order || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/products/:id
router.put('/:id', director, async (req, res) => {
  const { name, category, sort_order } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE products SET name=COALESCE($1,name), category=COALESCE($2,category), sort_order=COALESCE($3,sort_order)
       WHERE id=$4 AND tenant_id=$5 RETURNING *`,
      [name ?? null, category ?? null, sort_order ?? null, req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', director, async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM products WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenantId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
