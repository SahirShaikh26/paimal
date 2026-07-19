const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const requireRole = require('../middleware/requireRole');
const { eachDay, isWorkingDay } = require('../lib/hr');

router.use(auth, tenant);

const round2 = (n) => Math.round(n * 100) / 100;

// gross = base + allowances − LOP; net = gross − deductions.
// No statutory tax math by design — PF/ESI/TDS live as manual deduction line items.
function computeTotals(base, lineItems, lopDays, workingDays) {
  const items = Array.isArray(lineItems) ? lineItems : [];
  const allowances = items.filter((i) => i.type === 'allowance').reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const deductions = items.filter((i) => i.type === 'deduction').reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const perDay = workingDays > 0 ? Number(base) / workingDays : 0;
  const lopAmount = round2(perDay * Number(lopDays));
  const gross = round2(Number(base) + allowances - lopAmount);
  return {
    lop_amount: lopAmount,
    gross,
    deductions_total: round2(deductions),
    net_pay: round2(gross - deductions),
  };
}

// ---- Salary structures (Director) ----

router.get('/salaries', requireRole('Director'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id AS user_id, u.name, u.dept, u.job_title, u.active,
              s.id, s.monthly_base, s.line_items, s.effective_from
       FROM users u
       LEFT JOIN salary_structures s ON s.user_id = u.id
       WHERE u.tenant_id=$1 AND u.active=true
       ORDER BY u.name`,
      [req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/salaries/:userId', requireRole('Director'), async (req, res) => {
  const { monthly_base, line_items, effective_from } = req.body;
  try {
    const { rows: [u] } = await db.query(
      `SELECT id FROM users WHERE id=$1 AND tenant_id=$2`,
      [req.params.userId, req.tenantId]
    );
    if (!u) return res.status(404).json({ error: 'User not found' });

    const { rows } = await db.query(
      `INSERT INTO salary_structures (tenant_id, user_id, monthly_base, line_items, effective_from)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id) DO UPDATE SET
         monthly_base=EXCLUDED.monthly_base, line_items=EXCLUDED.line_items,
         effective_from=EXCLUDED.effective_from, updated_at=NOW()
       RETURNING *`,
      [req.tenantId, req.params.userId, Number(monthly_base) || 0,
       JSON.stringify(line_items || []), effective_from || null]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- Payroll runs (Director) ----

router.get('/runs', requireRole('Director'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT pr.*, (SELECT COUNT(*) FROM payslips p WHERE p.payroll_run_id=pr.id) AS payslip_count,
              (SELECT COALESCE(SUM(net_pay),0) FROM payslips p WHERE p.payroll_run_id=pr.id) AS total_net
       FROM payroll_runs pr WHERE pr.tenant_id=$1 ORDER BY pr.month DESC`,
      [req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/payroll/runs {month: YYYY-MM, working_days?} — creates run + draft payslips in one transaction.
router.post('/runs', requireRole('Director'), async (req, res) => {
  const { month, working_days } = req.body;
  if (!/^\d{4}-\d{2}$/.test(month || '')) return res.status(400).json({ error: 'month must be YYYY-MM' });

  const client = await db.pool.connect();
  try {
    const { rows: [t] } = await client.query(
      `SELECT working_days_per_week FROM tenants WHERE id=$1`, [req.tenantId]
    );
    const wdpw = t?.working_days_per_week ?? 6;
    const monthStart = `${month}-01`;
    const monthEnd = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).toISOString().split('T')[0];
    const monthDays = eachDay(monthStart, monthEnd);
    const workingDayList = monthDays.filter((d) => isWorkingDay(d, wdpw));
    const wd = Number(working_days) || workingDayList.length;

    await client.query('BEGIN');
    const { rows: [run] } = await client.query(
      `INSERT INTO payroll_runs (tenant_id, month, working_days, created_by)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.tenantId, month, wd, req.user.id]
    );

    const { rows: staff } = await client.query(
      `SELECT u.id, s.monthly_base, s.line_items
       FROM users u JOIN salary_structures s ON s.user_id = u.id
       WHERE u.tenant_id=$1 AND u.active=true`,
      [req.tenantId]
    );

    const today = new Date().toISOString().split('T')[0];
    for (const emp of staff) {
      // Suggested LOP: past working days with no attendance and no approved PAID leave cover.
      const [{ rows: att }, { rows: paidLeave }] = await Promise.all([
        client.query(
          `SELECT date::text AS date FROM attendance
           WHERE engineer_id=$1 AND tenant_id=$2 AND date BETWEEN $3 AND $4`,
          [emp.id, req.tenantId, monthStart, monthEnd]
        ),
        client.query(
          `SELECT lr.start_date::text AS start_date, lr.end_date::text AS end_date, lr.half_day
           FROM leave_requests lr JOIN leave_types lt ON lt.id = lr.leave_type_id
           WHERE lr.user_id=$1 AND lr.status='Approved' AND lt.paid=true
             AND lr.start_date <= $3 AND lr.end_date >= $2`,
          [emp.id, monthStart, monthEnd]
        ),
      ]);
      const attSet = new Set(att.map((r) => r.date));
      const covered = new Set();
      for (const l of paidLeave) {
        for (const d of eachDay(l.start_date, l.end_date)) covered.add(d);
      }
      const lopDays = workingDayList.filter(
        (d) => d <= today && !attSet.has(d) && !covered.has(d)
      ).length;

      const totals = computeTotals(emp.monthly_base, emp.line_items, lopDays, wd);
      await client.query(
        `INSERT INTO payslips (tenant_id, payroll_run_id, user_id, monthly_base, line_items,
           lop_days, lop_amount, gross, deductions_total, net_pay)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [req.tenantId, run.id, emp.id, emp.monthly_base, JSON.stringify(emp.line_items || []),
         lopDays, totals.lop_amount, totals.gross, totals.deductions_total, totals.net_pay]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(run);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') return res.status(409).json({ error: 'A run for this month already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.get('/runs/:id', requireRole('Director'), async (req, res) => {
  try {
    const { rows: [run] } = await db.query(
      `SELECT * FROM payroll_runs WHERE id=$1 AND tenant_id=$2`,
      [req.params.id, req.tenantId]
    );
    if (!run) return res.status(404).json({ error: 'Run not found' });
    const { rows: slips } = await db.query(
      `SELECT p.*, u.name, u.dept, u.job_title FROM payslips p
       JOIN users u ON u.id = p.user_id
       WHERE p.payroll_run_id=$1 ORDER BY u.name`,
      [req.params.id]
    );
    res.json({ ...run, payslips: slips });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/payroll/payslips/:id — Director edits lop_days / line_items while the run is Draft.
router.put('/payslips/:id', requireRole('Director'), async (req, res) => {
  const { lop_days, line_items } = req.body;
  try {
    const { rows: [slip] } = await db.query(
      `SELECT p.*, pr.status AS run_status, pr.working_days
       FROM payslips p JOIN payroll_runs pr ON pr.id = p.payroll_run_id
       WHERE p.id=$1 AND p.tenant_id=$2`,
      [req.params.id, req.tenantId]
    );
    if (!slip) return res.status(404).json({ error: 'Payslip not found' });
    if (slip.run_status !== 'Draft') return res.status(409).json({ error: 'Run is finalized' });

    const newLop = lop_days != null ? Number(lop_days) : Number(slip.lop_days);
    const newItems = line_items != null ? line_items : slip.line_items;
    const totals = computeTotals(slip.monthly_base, newItems, newLop, slip.working_days);

    const { rows } = await db.query(
      `UPDATE payslips SET lop_days=$1, line_items=$2, lop_amount=$3, gross=$4,
         deductions_total=$5, net_pay=$6
       WHERE id=$7 RETURNING *`,
      [newLop, JSON.stringify(newItems || []), totals.lop_amount, totals.gross,
       totals.deductions_total, totals.net_pay, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/runs/:id/finalize', requireRole('Director'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE payroll_runs SET status='Finalized', finalized_at=NOW()
       WHERE id=$1 AND tenant_id=$2 AND status='Draft' RETURNING *`,
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(409).json({ error: 'Run not found or already finalized' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/runs/:id', requireRole('Director'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `DELETE FROM payroll_runs WHERE id=$1 AND tenant_id=$2 AND status='Draft' RETURNING id`,
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(409).json({ error: 'Run not found or already finalized' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ---- Employee payslip access ----

router.get('/payslips/me', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, pr.month, pr.working_days FROM payslips p
       JOIN payroll_runs pr ON pr.id = p.payroll_run_id
       WHERE p.user_id=$1 AND pr.status='Finalized'
       ORDER BY pr.month DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/payslips/:id', async (req, res) => {
  try {
    const { rows: [slip] } = await db.query(
      `SELECT p.*, pr.month, pr.working_days, pr.status AS run_status, u.name, u.dept, u.job_title, u.email
       FROM payslips p
       JOIN payroll_runs pr ON pr.id = p.payroll_run_id
       JOIN users u ON u.id = p.user_id
       WHERE p.id=$1 AND p.tenant_id=$2`,
      [req.params.id, req.tenantId]
    );
    if (!slip) return res.status(404).json({ error: 'Payslip not found' });
    const own = slip.user_id === req.user.id;
    if (!own && req.user.role !== 'Director') return res.status(403).json({ error: 'Insufficient permissions' });
    if (own && req.user.role !== 'Director' && slip.run_status !== 'Finalized') {
      return res.status(403).json({ error: 'Payslip not finalized yet' });
    }
    res.json(slip);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
