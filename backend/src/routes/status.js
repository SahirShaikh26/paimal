const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const requireOwner = require('../middleware/requireOwner');

router.use(auth, requireOwner);

// GET /api/status/summary — platform-wide error overview (owner-only)
router.get('/summary', async (req, res) => {
  try {
    const [last24h, last7d, byRoute, recent] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM error_events WHERE created_at > NOW() - INTERVAL '24 hours'`),
      db.query(`SELECT COUNT(*) FROM error_events WHERE created_at > NOW() - INTERVAL '7 days'`),
      db.query(
        `SELECT route, method, COUNT(*) AS count, MAX(created_at) AS last_seen
         FROM error_events WHERE created_at > NOW() - INTERVAL '7 days'
         GROUP BY route, method ORDER BY count DESC LIMIT 20`
      ),
      db.query(
        `SELECT id, tenant_id, route, method, status_code, message, created_at
         FROM error_events ORDER BY created_at DESC LIMIT 50`
      ),
    ]);

    res.json({
      count_24h: Number(last24h.rows[0].count),
      count_7d: Number(last7d.rows[0].count),
      by_route: byRoute.rows,
      recent: recent.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/status/accounts — platform-wide account overview (owner-only).
// "Active" is reported two ways: account status (tenants.active / plan_status)
// and real usage (a tenant that logged activity in the last 30 days).
router.get('/accounts', async (req, res) => {
  try {
    const [tenants, users, byStatus, byPlan, byRole, list] = await Promise.all([
      db.query(`SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE active)::int AS active,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS new_30d`),
      db.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE active)::int AS active FROM users`),
      db.query(`SELECT COALESCE(plan_status,'unknown') AS plan_status, COUNT(*)::int AS count
                FROM tenants GROUP BY plan_status ORDER BY count DESC`),
      db.query(`SELECT COALESCE(plan,'unknown') AS plan, COUNT(*)::int AS count
                FROM tenants GROUP BY plan ORDER BY count DESC`),
      db.query(`SELECT role, COUNT(*)::int AS count FROM users GROUP BY role ORDER BY count DESC`),
      db.query(`SELECT t.name, t.slug, t.plan, t.plan_status, t.active, t.created_at,
                       (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id)::int AS users,
                       (SELECT MAX(submitted_at) FROM activity_logs al WHERE al.tenant_id = t.id) AS last_activity
                FROM tenants t ORDER BY t.created_at DESC LIMIT 200`),
    ]);

    const active30 = await db.query(
      `SELECT COUNT(DISTINCT tenant_id)::int AS n FROM activity_logs
       WHERE submitted_at > NOW() - INTERVAL '30 days'`
    );

    res.json({
      tenants: {
        total: tenants.rows[0].total,
        active: tenants.rows[0].active,
        new_30d: tenants.rows[0].new_30d,
        active_30d: active30.rows[0].n,
        by_status: byStatus.rows,
        by_plan: byPlan.rows,
      },
      users: { total: users.rows[0].total, active: users.rows[0].active, by_role: byRole.rows },
      list: list.rows,
    });
  } catch (err) {
    console.error('accounts summary failed:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
