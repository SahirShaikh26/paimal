const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const requireRole = require('../middleware/requireRole');
const { periodBounds, recentPeriods, eachDay } = require('../lib/hr');

router.use(auth, tenant);

async function tenantSettings(tenantId) {
  const { rows: [t] } = await db.query(
    `SELECT pay_period, ot_daily_hours, ot_weekly_hours FROM tenants WHERE id=$1`,
    [tenantId]
  );
  return {
    payPeriod: t?.pay_period || 'monthly',
    otDaily: Number(t?.ot_daily_hours) || 0,
    otWeekly: Number(t?.ot_weekly_hours) || 0,
  };
}

function isoWeekKey(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - jan1) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

// Split total attendance hours into regular vs overtime.
// Per week: OT = max(sum of daily excess over otDaily, weekly excess over otWeekly).
function otSplit(dayRows, otDaily, otWeekly) {
  const weeks = {};
  for (const r of dayRows) {
    (weeks[isoWeekKey(r.date)] = weeks[isoWeekKey(r.date)] || []).push(r);
  }
  let overtime = 0;
  let total = 0;
  for (const rows of Object.values(weeks)) {
    const weekTotal = rows.reduce((s, r) => s + r.attendance_hours, 0);
    const dailyOT = otDaily > 0
      ? rows.reduce((s, r) => s + Math.max(0, r.attendance_hours - otDaily), 0)
      : 0;
    const weeklyOT = otWeekly > 0 ? Math.max(0, weekTotal - otWeekly) : 0;
    overtime += Math.max(dailyOT, weeklyOT);
    total += weekTotal;
  }
  return { total: round1(total), overtime: round1(overtime), regular: round1(total - overtime) };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// Compute one user's timesheet for a period: per-day rows + totals.
async function computeSheet(tenantId, userId, start, end, otDaily, otWeekly) {
  const [att, acts] = await Promise.all([
    db.query(
      `SELECT date::text AS date, check_in, check_out,
              CASE WHEN check_out IS NOT NULL
                   THEN ROUND(EXTRACT(EPOCH FROM (check_out - check_in))/3600.0, 1)
                   ELSE 0 END AS hours
       FROM attendance WHERE engineer_id=$1 AND tenant_id=$2 AND date BETWEEN $3 AND $4`,
      [userId, tenantId, start, end]
    ),
    db.query(
      `SELECT date::text AS date, COALESCE(SUM(COALESCE(hours,0) + COALESCE(travel_hours,0)),0) AS hours
       FROM activity_logs WHERE engineer_id=$1 AND tenant_id=$2 AND date BETWEEN $3 AND $4
       GROUP BY date`,
      [userId, tenantId, start, end]
    ),
  ]);

  const attMap = Object.fromEntries(att.rows.map((r) => [r.date, r]));
  const actMap = Object.fromEntries(acts.rows.map((r) => [r.date, Number(r.hours)]));
  const days = eachDay(start, end)
    .map((date) => ({
      date,
      check_in: attMap[date]?.check_in || null,
      check_out: attMap[date]?.check_out || null,
      attendance_hours: Number(attMap[date]?.hours) || 0,
      activity_hours: actMap[date] || 0,
    }))
    .filter((d) => d.attendance_hours > 0 || d.activity_hours > 0 || d.check_in);

  const split = otSplit(days, otDaily, otWeekly);
  const activityTotal = round1(days.reduce((s, d) => s + d.activity_hours, 0));
  return {
    days,
    attendance_hours: split.total,
    activity_hours: activityTotal,
    regular_hours: split.regular,
    overtime_hours: split.overtime,
  };
}

// GET /api/timesheets/periods?count=6 — recent pay periods from the tenant setting.
router.get('/periods', async (req, res) => {
  try {
    const { payPeriod } = await tenantSettings(req.tenantId);
    const today = new Date().toISOString().split('T')[0];
    const count = Math.min(Number(req.query.count) || 6, 24);
    res.json(recentPeriods(payPeriod, today, count).map((p) => ({
      ...p,
      label: `${p.start} → ${p.end}`,
      pay_period: payPeriod,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/timesheets?period_start= — managers: all users; engineers get 403 (use /me).
router.get('/', requireRole('Director', 'Manager'), async (req, res) => {
  const { period_start } = req.query;
  if (!period_start) return res.status(400).json({ error: 'period_start required' });
  try {
    const { payPeriod, otDaily, otWeekly } = await tenantSettings(req.tenantId);
    const { start, end } = periodBounds(payPeriod, period_start);

    const [users, approved] = await Promise.all([
      db.query(`SELECT id, name, dept FROM users WHERE tenant_id=$1 AND active=true ORDER BY name`, [req.tenantId]),
      db.query(
        `SELECT ts.*, u.name AS approver_name FROM timesheets ts
         LEFT JOIN users u ON u.id = ts.approved_by
         WHERE ts.tenant_id=$1 AND ts.period_start=$2`,
        [req.tenantId, start]
      ),
    ]);
    const approvedMap = Object.fromEntries(approved.rows.map((r) => [r.user_id, r]));

    const out = [];
    for (const u of users.rows) {
      const snap = approvedMap[u.id];
      const sheet = await computeSheet(req.tenantId, u.id, start, end, otDaily, otWeekly);
      out.push({
        user_id: u.id,
        name: u.name,
        dept: u.dept,
        ...sheet,
        // Approved snapshot wins over live numbers so the locked view is stable.
        ...(snap ? {
          attendance_hours: Number(snap.attendance_hours),
          activity_hours: Number(snap.activity_hours),
          regular_hours: Number(snap.regular_hours),
          overtime_hours: Number(snap.overtime_hours),
        } : {}),
        approved: !!snap,
        approved_by: snap?.approver_name || null,
        approved_at: snap?.approved_at || null,
        timesheet_id: snap?.id || null,
      });
    }
    res.json({ period_start: start, period_end: end, rows: out });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/timesheets/me?period_start=
router.get('/me', async (req, res) => {
  try {
    const { payPeriod, otDaily, otWeekly } = await tenantSettings(req.tenantId);
    const ref = req.query.period_start || new Date().toISOString().split('T')[0];
    const { start, end } = periodBounds(payPeriod, ref);
    const sheet = await computeSheet(req.tenantId, req.user.id, start, end, otDaily, otWeekly);
    const { rows: [snap] } = await db.query(
      `SELECT * FROM timesheets WHERE user_id=$1 AND period_start=$2`,
      [req.user.id, start]
    );
    res.json({ period_start: start, period_end: end, ...sheet, approved: !!snap });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/timesheets/approve {user_id, period_start} — recompute server-side and snapshot.
router.post('/approve', requireRole('Director', 'Manager'), async (req, res) => {
  const { user_id, period_start } = req.body;
  if (!user_id || !period_start) return res.status(400).json({ error: 'user_id and period_start required' });
  try {
    const { payPeriod, otDaily, otWeekly } = await tenantSettings(req.tenantId);
    const { start, end } = periodBounds(payPeriod, period_start);
    const sheet = await computeSheet(req.tenantId, user_id, start, end, otDaily, otWeekly);
    const { rows } = await db.query(
      `INSERT INTO timesheets (tenant_id, user_id, period_start, period_end,
         attendance_hours, activity_hours, regular_hours, overtime_hours, approved_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (user_id, period_start) DO NOTHING RETURNING *`,
      [req.tenantId, user_id, start, end,
       sheet.attendance_hours, sheet.activity_hours, sheet.regular_hours, sheet.overtime_hours,
       req.user.id]
    );
    if (!rows.length) return res.status(409).json({ error: 'Already approved for this period' });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/timesheets/:id — Director reopens an approved period.
router.delete('/:id', requireRole('Director'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `DELETE FROM timesheets WHERE id=$1 AND tenant_id=$2 RETURNING id`,
      [req.params.id, req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Timesheet not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/timesheets/export?period_start= — CSV.
router.get('/export', requireRole('Director', 'Manager'), async (req, res) => {
  const { period_start } = req.query;
  if (!period_start) return res.status(400).json({ error: 'period_start required' });
  try {
    const { payPeriod, otDaily, otWeekly } = await tenantSettings(req.tenantId);
    const { start, end } = periodBounds(payPeriod, period_start);
    const { rows: users } = await db.query(
      `SELECT id, name FROM users WHERE tenant_id=$1 AND active=true ORDER BY name`,
      [req.tenantId]
    );
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = ['Employee,Date,Check In,Check Out,Attendance Hours,Activity Hours'];
    const totals = ['', '', '', '', 0, 0];
    for (const u of users) {
      const sheet = await computeSheet(req.tenantId, u.id, start, end, otDaily, otWeekly);
      for (const d of sheet.days) {
        lines.push([
          esc(u.name), d.date,
          d.check_in ? new Date(d.check_in).toISOString() : '',
          d.check_out ? new Date(d.check_out).toISOString() : '',
          d.attendance_hours, d.activity_hours,
        ].join(','));
      }
      totals[4] += sheet.attendance_hours;
      totals[5] += sheet.activity_hours;
    }
    lines.push(['TOTAL', '', '', '', round1(totals[4]), round1(totals[5])].join(','));
    res.type('text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="timesheets_${start}.csv"`);
    res.send(lines.join('\n'));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
