const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const requireRole = require('../middleware/requireRole');
const { isWorkingDay, eachDay } = require('../lib/hr');

router.use(auth, tenant);

async function tenantSettings(tenantId) {
  const { rows: [t] } = await db.query(
    `SELECT late_grace_minutes, working_days_per_week FROM tenants WHERE id=$1`,
    [tenantId]
  );
  return { grace: t?.late_grace_minutes ?? 10, wdpw: t?.working_days_per_week ?? 6 };
}

// POST /api/attendance/checkin
router.post('/checkin', async (req, res) => {
  const { lat, lng, location } = req.body;
  const today = new Date().toISOString().split('T')[0];
  try {
    const existing = await db.query(
      'SELECT id FROM attendance WHERE engineer_id=$1 AND date=$2',
      [req.user.id, today]
    );
    if (existing.rows.length) return res.status(409).json({ error: 'Already checked in today' });

    const { rows } = await db.query(
      `INSERT INTO attendance (engineer_id, tenant_id, date, check_in, lat, lng, location)
       VALUES ($1,$2,$3,NOW(),$4,$5,$6) RETURNING *`,
      [req.user.id, req.tenantId, today, lat, lng, location]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/attendance/checkout
router.post('/checkout', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const { rows } = await db.query(
      `UPDATE attendance SET check_out=NOW()
       WHERE engineer_id=$1 AND date=$2 AND check_out IS NULL RETURNING *`,
      [req.user.id, today]
    );
    if (!rows.length) return res.status(404).json({ error: 'No active check-in found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/attendance/me?month=YYYY-MM
router.get('/me', async (req, res) => {
  const { month } = req.query;
  try {
    const { rows } = await db.query(
      `SELECT * FROM attendance
       WHERE engineer_id=$1 AND tenant_id=$2
       ${month ? "AND TO_CHAR(date,'YYYY-MM')=$3" : ''}
       ORDER BY date DESC`,
      month ? [req.user.id, req.tenantId, month] : [req.user.id, req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/attendance/today — live board for managers.
// status: 'in' | 'out' | 'leave' | 'absent'; late = checked in after shift start + grace.
router.get('/today', requireRole('Director', 'Manager'), async (req, res) => {
  try {
    const { grace } = await tenantSettings(req.tenantId);
    // Same "today" the check-in write uses (JS UTC date) — Postgres CURRENT_DATE
    // follows the DB timezone and can disagree with it.
    const today = new Date().toISOString().split('T')[0];
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.dept, u.job_title,
              a.check_in, a.check_out, a.location, a.lat, a.lng,
              lr.id IS NOT NULL AS on_leave,
              st.name AS shift_name, st.start_time AS shift_start,
              CASE WHEN a.check_in IS NOT NULL AND st.start_time IS NOT NULL
                   THEN a.check_in::time > st.start_time + ($2 || ' minutes')::interval
                   ELSE false END AS late
       FROM users u
       LEFT JOIN attendance a ON a.engineer_id = u.id AND a.date = $3::date
       LEFT JOIN leave_requests lr ON lr.user_id = u.id AND lr.status = 'Approved'
            AND $3::date BETWEEN lr.start_date AND lr.end_date
       LEFT JOIN shift_assignments sa ON sa.user_id = u.id AND sa.date = $3::date
       LEFT JOIN shift_templates st ON st.id = sa.shift_template_id
       WHERE u.tenant_id = $1 AND u.active = true
       ORDER BY u.name`,
      [req.tenantId, grace, today]
    );
    res.json(rows.map((r) => ({
      ...r,
      status: r.check_in ? (r.check_out ? 'out' : 'in') : (r.on_leave ? 'leave' : 'absent'),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/attendance/grid?month=YYYY-MM — user × day matrix.
// Cell codes: P present, L leave, H half-day leave, A absent (working day, no record), '' non-working/future.
router.get('/grid', requireRole('Director', 'Manager'), async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  try {
    const { wdpw, grace } = await tenantSettings(req.tenantId);
    const monthStart = `${month}-01`;
    const monthEndDate = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0));
    const monthEnd = monthEndDate.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const [users, att, leaves] = await Promise.all([
      db.query(
        `SELECT id, name, dept FROM users WHERE tenant_id=$1 AND active=true ORDER BY name`,
        [req.tenantId]
      ),
      db.query(
        `SELECT a.engineer_id, a.date::text AS date, a.check_in, a.check_out,
                CASE WHEN a.check_in IS NOT NULL AND st.start_time IS NOT NULL
                     THEN a.check_in::time > st.start_time + ($3 || ' minutes')::interval
                     ELSE false END AS late
         FROM attendance a
         LEFT JOIN shift_assignments sa ON sa.user_id = a.engineer_id AND sa.date = a.date
         LEFT JOIN shift_templates st ON st.id = sa.shift_template_id
         WHERE a.tenant_id=$1 AND TO_CHAR(a.date,'YYYY-MM')=$2`,
        [req.tenantId, month, grace]
      ),
      db.query(
        `SELECT user_id, start_date::text AS start_date, end_date::text AS end_date, half_day
         FROM leave_requests
         WHERE tenant_id=$1 AND status='Approved' AND start_date <= $3 AND end_date >= $2`,
        [req.tenantId, monthStart, monthEnd]
      ),
    ]);

    const attMap = {}; // engineer_id -> date -> {late}
    for (const a of att.rows) {
      (attMap[a.engineer_id] = attMap[a.engineer_id] || {})[a.date] = a;
    }
    const leaveMap = {}; // user_id -> date -> half_day
    for (const l of leaves.rows) {
      for (const d of eachDay(l.start_date, l.end_date)) {
        (leaveMap[l.user_id] = leaveMap[l.user_id] || {})[d] = l.half_day;
      }
    }

    const days = eachDay(monthStart, monthEnd);
    const grid = users.rows.map((u) => {
      const cells = days.map((d) => {
        const a = attMap[u.id]?.[d];
        if (a) return a.late ? 'P!' : 'P';
        if (leaveMap[u.id]?.[d] !== undefined) return leaveMap[u.id][d] ? 'H' : 'L';
        if (!isWorkingDay(d, wdpw) || d > today) return '';
        return 'A';
      });
      return { id: u.id, name: u.name, dept: u.dept, cells };
    });
    res.json({ month, days, grid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/attendance/summary?month=YYYY-MM — per-user counts.
router.get('/summary', requireRole('Director', 'Manager'), async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name,
              COUNT(a.id) AS present_days,
              COALESCE(SUM(CASE WHEN a.check_out IS NOT NULL
                THEN EXTRACT(EPOCH FROM (a.check_out - a.check_in))/3600 ELSE 0 END), 0)::numeric(8,1) AS total_hours
       FROM users u
       LEFT JOIN attendance a ON a.engineer_id = u.id AND TO_CHAR(a.date,'YYYY-MM') = $2
       WHERE u.tenant_id=$1 AND u.active=true
       GROUP BY u.id, u.name ORDER BY u.name`,
      [req.tenantId, month]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
