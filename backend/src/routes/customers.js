const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');

router.use(auth, tenant);

// GET /api/customers
router.get('/', async (req, res) => {
  const { search, region } = req.query;
  const conditions = ['tenant_id = $1'];
  const params = [req.tenantId];
  let i = 2;

  if (search) {
    conditions.push(`(name ILIKE $${i} OR code ILIKE $${i} OR contact_name ILIKE $${i})`);
    params.push(`%${search}%`);
    i++;
  }
  if (region) { conditions.push(`region = $${i++}`); params.push(region); }

  try {
    const { rows } = await db.query(
      `SELECT * FROM customers WHERE ${conditions.join(' AND ')} ORDER BY name`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/customers/:id  — with machines
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM customers WHERE id=$1 AND tenant_id=$2',
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Customer not found' });

    const machines = await db.query(
      'SELECT * FROM machines WHERE customer_id=$1 ORDER BY name',
      [req.params.id]
    );

    res.json({ ...rows[0], machines: machines.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/customers
router.post('/', async (req, res) => {
  if (!['Director', 'Manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  const { code, name, city, region, contact_name, contact_phone, contact_email, address, lat, lng } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'code and name required' });

  try {
    const { rows } = await db.query(
      `INSERT INTO customers (tenant_id, code, name, city, region, contact_name, contact_phone, contact_email, address, lat, lng)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.tenantId, code, name, city, region, contact_name, contact_phone, contact_email || null, address, lat, lng]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
  if (!['Director', 'Manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  const { code, name, city, region, contact_name, contact_phone, contact_email, address, lat, lng } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE customers SET code=$1, name=$2, city=$3, region=$4,
         contact_name=$5, contact_phone=$6, address=$7, lat=$8, lng=$9, contact_email=$10
       WHERE id=$11 AND tenant_id=$12 RETURNING *`,
      [code, name, city, region, contact_name, contact_phone, address, lat, lng, contact_email || null, req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Customer not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/customers/:id/machines
router.post('/:id/machines', async (req, res) => {
  const { name, model, product_type, serial_no, install_year, warranty_until } = req.body;
  try {
    const cust = await db.query('SELECT id FROM customers WHERE id=$1 AND tenant_id=$2', [req.params.id, req.tenantId]);
    if (!cust.rows.length) return res.status(404).json({ error: 'Customer not found' });

    const { rows } = await db.query(
      `INSERT INTO machines (customer_id, name, model, product_type, serial_no, install_year, warranty_until)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.id, name, model, product_type, serial_no, install_year, warranty_until]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
