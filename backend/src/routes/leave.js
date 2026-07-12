const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const requireRole = require('../middleware/requireRole');
const { eachDay, isWorkingDay } = require('../lib/hr');

router.use(auth, tenant);

async function workingDaysPerWeek(tenantId) {
  const { rows: [t] } = await db.query(`SELECT working_days_per_week FROM tenants WHERE id=$1`, [tenantId]);
  return t?.working_days_per_week ?? 6;
}

// Balance = annual quota + adjustments for the year − approved days in the year.
async function balanceFor(tenantId, userId, leaveTypeId, year) {
  const { rows: [r] } = await db.query(
    `SELECT lt.annual_quota
        + COALESCE((SELECT SUM(delta_days) FROM leave_adjustments
                    WHERE user_id=$2 AND leave_type_id=$1 AND year=$3), 0)
        - COALESCE((SELECT SUM(days) FROM leave_requests
                    WHERE user_id=$2 AND leave_type_id=$1 AND status='Approved'
                      AND EXTRACT(YEAR FROM start_date)=$3), 0) AS balance,
        lt.paid
     FROM leave_types lt WHERE lt.id=$1 AND lt.tenant_id=$4`,
    [leaveTypeId, userId, year, tenantId]
  );
  return r; // undefined if type not found in tenant
}

// ---- Leave types ----

// GET /api/leave/types
router.get('/types', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM leave_types WHERE tenant_id=$1 AND active=true ORDER BY sort_order, name`,
      [req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/leave/types (Director)
router.post('/types', requireRole('Director'), async (req, res) => {
  const { name, code, annual_quota, paid, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO leave_types (tenant_id, name, code, annual_quota, paid, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.tenantId, name, code || null, annual_quota || 0, paid !== false, sort_order || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/leave/types/:id (Director)
router.put('/types/:id', requireRole('Director'), async (req, res) => {
  const { name, code, annual_quota, paid, sort_order } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE leave_types SET
         name=COALESCE($1,name), code=COALESCE($2,code), annual_quota=COALESCE($3,annual_quota),
         paid=COALESCE($4,paid), sort_order=COALESCE($5,sort_order)
       WHERE id=$6 AND tenant_id=$7 RETURNING *`,
      [name ?? null, code ?? null, annual_quota ?? null,
       typeof paid === 'boolean' ? paid : null, sort_order ?? null,
       req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Leave type not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/leave/types/:id (Director) — soft delete so history keeps its labels.
router.delete('/types/:id', requireRole('Director'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE leave_types SET active=false WHERE id=$1 AND tenant_id=$2 RETURNING id`,
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Leave type not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- Balances ----

// GET /api/leave/balances?user_id=&year=  (own by default; managers can query anyone)
router.get('/balances', async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  let userId = req.query.user_id || req.user.id;
  if (userId !== req.user.id && !['Director', 'Manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  try {
    const { rows } = await db.query(
      `SELECT lt.id AS leave_type_id, lt.name, lt.code, lt.paid, lt.annual_quota,
              lt.annual_quota
                + COALESCE((SELECT SUM(delta_days) FROM leave_adjustments la
                            WHERE la.user_id=$2 AND la.leave_type_id=lt.id AND la.year=$3), 0) AS entitled,
              COALESCE((SELECT SUM(days) FROM leave_requests lr
                        WHERE lr.user_id=$2 AND lr.leave_type_id=lt.id AND lr.status='Approved'
                          AND EXTRACT(YEAR FROM lr.start_date)=$3), 0) AS used
       FROM leave_types lt
       WHERE lt.tenant_id=$1 AND lt.active=true
       ORDER BY lt.sort_order, lt.name`,
      [req.tenantId, userId, year]
    );
    res.json(rows.map((r) => ({ ...r, balance: Number(r.entitled) - Number(r.used) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- Requests ----

// GET /api/leave/requests?status=&user_id=&month=
router.get('/requests', async (req, res) => {
  const { status, user_id, month } = req.query;
  const conditions = ['lr.tenant_id=$1'];
  const params = [req.tenantId];
  if (req.user.role === 'Engineer') {
    params.push(req.user.id);
    conditions.push(`lr.user_id=$${params.length}`);
  } else if (user_id) {
    params.push(user_id);
    conditions.push(`lr.user_id=$${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`lr.status=$${params.length}`);
  }
  if (month) {
    params.push(month);
    conditions.push(`TO_CHAR(lr.start_date,'YYYY-MM')=$${params.length}`);
  }
  try {
    const { rows } = await db.query(
      `SELECT lr.*, u.name AS user_name, lt.name AS type_name, lt.code AS type_code, lt.paid,
              rv.name AS reviewer_name
       FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
       LEFT JOIN users rv ON rv.id = lr.reviewed_by
       WHERE ${conditions.join(' AND ')}
       ORDER BY lr.created_at DESC LIMIT 500`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/leave/requests — request for self.
router.post('/requests', async (req, res) => {
  const { leave_type_id, start_date, end_date, half_day, reason } = req.body;
  if (!leave_type_id || !start_date) return res.status(400).json({ error: 'leave_type_id and start_date required' });
  const end = half_day ? start_date : (end_date || start_date);
  if (end < start_date) return res.status(400).json({ error: 'end_date before start_date' });

  try {
    const wdpw = await workingDaysPerWeek(req.tenantId);
    const days = half_day
      ? 0.5
      : eachDay(start_date, end).filter((d) => isWorkingDay(d, wdpw)).length;
    if (days <= 0) return res.status(400).json({ error: 'Range has no working days' });

    const overlap = await db.query(
      `SELECT id FROM leave_requests
       WHERE user_id=$1 AND status IN ('Pending','Approved')
         AND start_date <= $3 AND end_date >= $2`,
      [req.user.id, start_date, end]
    );
    if (overlap.rows.length) return res.status(409).json({ error: 'Overlaps an existing leave request' });

    const bal = await balanceFor(req.tenantId, req.user.id, leave_type_id, new Date(start_date).getFullYear());
    if (!bal) return res.status(404).json({ error: 'Leave type not found' });
    if (bal.paid && Number(bal.balance) < days) {
      return res.status(409).json({ error: `Insufficient balance (${bal.balance} day(s) left)` });
    }

    const { rows } = await db.query(
      `INSERT INTO leave_requests (tenant_id, user_id, leave_type_id, start_date, end_date, half_day, days, reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.tenantId, req.user.id, leave_type_id, start_date, end, !!half_day, days, reason || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/leave/requests/:id/review {status: Approved|Rejected, comment}
router.put('/requests/:id/review', requireRole('Director', 'Manager'), async (req, res) => {
  const { status, comment } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be Approved or Rejected' });
  }
  try {
    const { rows: [lr] } = await db.query(
      `SELECT * FROM leave_requests WHERE id=$1 AND tenant_id=$2`,
      [req.params.id, req.tenantId]
    );
    if (!lr) return res.status(404).json({ error: 'Request not found' });
    if (lr.user_id === req.user.id) return res.status(403).json({ error: 'Cannot review your own request' });
    if (lr.status !== 'Pending') return res.status(409).json({ error: `Request already ${lr.status}` });

    if (status === 'Approved') {
      const bal = await balanceFor(req.tenantId, lr.user_id, lr.leave_type_id, new Date(lr.start_date).getFullYear());
      if (bal?.paid && Number(bal.balance) < Number(lr.days) && !req.body.override) {
        return res.status(409).json({ error: `Insufficient balance (${bal.balance} left). Pass override:true to approve anyway.` });
      }
    }

    const { rows } = await db.query(
      `UPDATE leave_requests SET status=$1, reviewed_by=$2, review_comment=$3, reviewed_at=NOW()
       WHERE id=$4 RETURNING *`,
      [status, req.user.id, comment || null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/leave/requests/:id/cancel — owner while Pending; managers any future-dated Approved.
router.put('/requests/:id/cancel', async (req, res) => {
  try {
    const { rows: [lr] } = await db.query(
      `SELECT * FROM leave_requests WHERE id=$1 AND tenant_id=$2`,
      [req.params.id, req.tenantId]
    );
    if (!lr) return res.status(404).json({ error: 'Request not found' });
    const isManager = ['Director', 'Manager'].includes(req.user.role);
    const own = lr.user_id === req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const allowed =
      (own && lr.status === 'Pending') ||
      (isManager && lr.status === 'Pending') ||
      (isManager && lr.status === 'Approved' && lr.start_date.toISOString().split('T')[0] > today);
    if (!allowed) return res.status(403).json({ error: 'Cannot cancel this request' });

    const { rows } = await db.query(
      `UPDATE leave_requests SET status='Cancelled', reviewed_by=$1, reviewed_at=NOW() WHERE id=$2 RETURNING *`,
      [req.user.id, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/leave/calendar?month=YYYY-MM — approved leave across the team.
router.get('/calendar', async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  try {
    const { rows } = await db.query(
      `SELECT lr.id, lr.user_id, u.name, lr.start_date::text AS start_date, lr.end_date::text AS end_date,
              lr.half_day, lt.name AS type_name, lt.code AS type_code
       FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
       WHERE lr.tenant_id=$1 AND lr.status='Approved'
         AND lr.start_date <= ($2 || '-01')::date + INTERVAL '1 month' - INTERVAL '1 day'
         AND lr.end_date >= ($2 || '-01')::date`,
      [req.tenantId, month]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/leave/adjustments (Director) — grants/carry-forward, auditable.
router.post('/adjustments', requireRole('Director'), async (req, res) => {
  const { user_id, leave_type_id, year, delta_days, note } = req.body;
  if (!user_id || !leave_type_id || !delta_days) {
    return res.status(400).json({ error: 'user_id, leave_type_id, delta_days required' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO leave_adjustments (tenant_id, user_id, leave_type_id, year, delta_days, note, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.tenantId, user_id, leave_type_id, year || new Date().getFullYear(), delta_days, note || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
