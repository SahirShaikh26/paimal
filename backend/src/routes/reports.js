const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');

router.use(auth, tenant);

// GET /api/reports/summary  — overall KPIs
router.get('/summary', async (req, res) => {
  const { date_from, date_to, engineer_id } = req.query;

  const conditions = ['l.tenant_id = $1'];
  const params = [req.tenantId];
  let i = 2;
  if (date_from)   { conditions.push(`l.date >= $${i++}`);        params.push(date_from); }
  if (date_to)     { conditions.push(`l.date <= $${i++}`);        params.push(date_to); }
  if (engineer_id) { conditions.push(`l.engineer_id = $${i++}`);  params.push(engineer_id); }

  const where = conditions.join(' AND ');

  try {
    const totals = await db.query(
      `SELECT
         COUNT(*)                          AS total_logs,
         SUM(l.hours)                      AS total_hours,
         SUM(l.billing_inr)                AS total_billing,
         SUM(l.cost_inr)                   AS total_cost,
         COUNT(DISTINCT l.engineer_id)     AS active_engineers,
         COUNT(DISTINCT l.customer_id)     AS customers_served,
         COALESCE(SUM(l.travel_hours),0)   AS travel_hours,
         COALESCE(SUM(l.hours) FILTER (WHERE l.billable),0)     AS billable_hours,
         COALESCE(SUM(l.hours) FILTER (WHERE NOT l.billable),0) AS non_billable_hours
       FROM activity_logs l WHERE ${where}`,
      params
    );

    const byActivity = await db.query(
      `SELECT l.activity_code, COUNT(*) AS count, SUM(l.hours) AS hours, SUM(l.billing_inr) AS billing
       FROM activity_logs l WHERE ${where}
       GROUP BY l.activity_code ORDER BY count DESC`,
      params
    );

    const byEngineer = await db.query(
      `SELECT u.name, l.engineer_id,
              COUNT(*)::int AS logs,
              SUM(l.hours) AS hours,
              SUM(l.billing_inr) AS billing,
              SUM(l.cost_inr) AS cost
       FROM activity_logs l
       JOIN users u ON u.id = l.engineer_id
       WHERE ${where}
       GROUP BY l.engineer_id, u.name
       ORDER BY billing DESC`,
      params
    );

    const byMonth = await db.query(
      `SELECT TO_CHAR(l.date,'YYYY-MM') AS month,
              COUNT(*)::int AS logs,
              SUM(l.hours) AS hours,
              SUM(l.billing_inr) AS billing
       FROM activity_logs l WHERE ${where}
       GROUP BY month ORDER BY month`,
      params
    );

    res.json({
      totals: totals.rows[0],
      by_activity: byActivity.rows,
      by_engineer: byEngineer.rows,
      by_month: byMonth.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/export/csv
router.get('/export/csv', async (req, res) => {
  if (!['Director', 'Manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const { date_from, date_to, engineer_id } = req.query;
  const conditions = ['l.tenant_id = $1'];
  const params = [req.tenantId];
  let i = 2;
  if (date_from)   { conditions.push(`l.date >= $${i++}`);       params.push(date_from); }
  if (date_to)     { conditions.push(`l.date <= $${i++}`);       params.push(date_to); }
  if (engineer_id) { conditions.push(`l.engineer_id = $${i++}`); params.push(engineer_id); }

  try {
    const { rows } = await db.query(
      `SELECT l.date, u.name AS engineer, c.name AS customer,
              l.activity_code, l.query_type, l.product_type,
              l.hours, l.billing_inr, l.cost_inr, l.status,
              l.location, l.notes, p.name AS project
       FROM activity_logs l
       LEFT JOIN users     u ON u.id = l.engineer_id
       LEFT JOIN customers c ON c.id = l.customer_id
       LEFT JOIN projects  p ON p.id = l.project_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY l.date DESC`,
      params
    );

    const headers = Object.keys(rows[0] || {
      date:'',engineer:'',customer:'',activity_code:'',query_type:'',
      product_type:'',hours:'',billing_inr:'',cost_inr:'',status:'',
      location:'',notes:'',project:'',
    });

    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => escape(r[h])).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="fieldpilot-logs-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/variance  — Planned Days (assignments) vs Actual Days (logs),
// grouped by Project × Engineer × Activity. Actual days = logged hours / 8.
// Planned and actual are aggregated separately to avoid double-counting when a
// (project, engineer, activity) combination has more than one assignment row.
router.get('/variance', async (req, res) => {
  try {
    const { rows } = await db.query(
      `WITH planned AS (
         SELECT a.project_id, a.engineer_id, at.code AS activity_code,
                MAX(at.label) AS activity_label, SUM(a.planned_days) AS planned_days
         FROM assignments a
         LEFT JOIN activity_types at ON at.id = a.activity_type_id
         WHERE a.tenant_id=$1
         GROUP BY a.project_id, a.engineer_id, at.code
       ),
       actual AS (
         SELECT l.project_id, l.engineer_id, l.activity_code,
                COALESCE(SUM(l.hours),0)/8.0 AS actual_days
         FROM activity_logs l
         WHERE l.tenant_id=$1
         GROUP BY l.project_id, l.engineer_id, l.activity_code
       )
       SELECT p.name AS project_name, pl.project_id,
              u.name AS engineer_name, pl.engineer_id,
              pl.activity_label, pl.activity_code,
              pl.planned_days::float AS planned_days,
              COALESCE(ac.actual_days,0)::float AS actual_days,
              (pl.planned_days - COALESCE(ac.actual_days,0))::float AS variance_days
       FROM planned pl
       LEFT JOIN actual ac
         ON ac.project_id = pl.project_id
        AND ac.engineer_id = pl.engineer_id
        AND ac.activity_code = pl.activity_code
       LEFT JOIN projects p ON p.id = pl.project_id
       LEFT JOIN users u ON u.id = pl.engineer_id
       ORDER BY p.name, u.name, pl.activity_label`,
      [req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/maintenance-due  — machines with warranty expiring within 30 days
router.get('/maintenance-due', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT m.id, m.name AS machine, c.name AS customer, m.warranty_until
       FROM machines m JOIN customers c ON c.id = m.customer_id
       WHERE c.tenant_id=$1 AND m.warranty_until IS NOT NULL
         AND m.warranty_until BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
       ORDER BY m.warranty_until ASC`,
      [req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/attendance
router.get('/attendance', async (req, res) => {
  const { month, engineer_id } = req.query;

  const conditions = ['u.tenant_id = $1'];
  const params = [req.tenantId];
  let i = 2;
  if (month)       { conditions.push(`TO_CHAR(a.date,'YYYY-MM') = $${i++}`); params.push(month); }
  if (engineer_id) { conditions.push(`a.engineer_id = $${i++}`);             params.push(engineer_id); }

  try {
    const { rows } = await db.query(
      `SELECT a.*, u.name AS engineer_name
       FROM attendance a
       JOIN users u ON u.id = a.engineer_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.date DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
