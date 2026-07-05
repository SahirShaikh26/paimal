const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { computeTotals, nextNumber } = require('../lib/billingDocs');

router.use(auth, tenant);

// Quotes are commercial documents — restricted to Director/Manager.
function canManage(req, res, next) {
  if (!['Director', 'Manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
}
router.use(canManage);

// GET /api/quotes  — list with customer name
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT q.*, c.name AS customer_name
       FROM quotes q LEFT JOIN customers c ON c.id = q.customer_id
       WHERE q.tenant_id=$1 ORDER BY q.created_at DESC`,
      [req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/quotes
router.post('/', async (req, res) => {
  const { customer_id, line_items, tax_pct, notes, valid_until, status } = req.body;
  if (!customer_id) return res.status(400).json({ error: 'customer_id is required' });

  const { subtotal, taxAmount, total } = computeTotals(line_items, tax_pct);
  try {
    const quote_number = await nextNumber(req.tenantId, 'quote');
    const { rows } = await db.query(
      `INSERT INTO quotes
         (tenant_id, customer_id, quote_number, status, line_items, subtotal, tax_pct, tax_amount, total, notes, valid_until, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.tenantId, customer_id, quote_number, status === 'Sent' ? 'Sent' : 'Draft',
       JSON.stringify(line_items || []), subtotal, Number(tax_pct) || 0, taxAmount, total,
       notes || null, valid_until || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/quotes/:id
router.put('/:id', async (req, res) => {
  const { customer_id, line_items, tax_pct, notes, valid_until, status } = req.body;
  const { subtotal, taxAmount, total } = computeTotals(line_items, tax_pct);
  try {
    const { rows } = await db.query(
      `UPDATE quotes SET
         customer_id=COALESCE($1,customer_id),
         line_items=$2, subtotal=$3, tax_pct=$4, tax_amount=$5, total=$6,
         notes=$7, valid_until=$8, status=COALESCE($9,status)
       WHERE id=$10 AND tenant_id=$11 RETURNING *`,
      [customer_id || null, JSON.stringify(line_items || []), subtotal, Number(tax_pct) || 0,
       taxAmount, total, notes || null, valid_until || null, status || null, req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Quote not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/quotes/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM quotes WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenantId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Quote not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/quotes/:id/convert  — turn an accepted quote into a draft invoice
router.post('/:id/convert', async (req, res) => {
  try {
    const { rows: qRows } = await db.query(
      `SELECT * FROM quotes WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenantId]
    );
    if (!qRows.length) return res.status(404).json({ error: 'Quote not found' });
    const q = qRows[0];

    const invoice_number = await nextNumber(req.tenantId, 'invoice');
    const { rows } = await db.query(
      `INSERT INTO invoices
         (tenant_id, customer_id, quote_id, invoice_number, status, line_items, subtotal, tax_pct, tax_amount, total, notes, created_by)
       VALUES ($1,$2,$3,$4,'Draft',$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.tenantId, q.customer_id, q.id, invoice_number, JSON.stringify(q.line_items),
       q.subtotal, q.tax_pct, q.tax_amount, q.total, q.notes, req.user.id]
    );
    await db.query(`UPDATE quotes SET status='Converted' WHERE id=$1`, [q.id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
