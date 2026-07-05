const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const llm = require('../llm');

router.use(auth, tenant);

function periodRange(period) {
  const end = new Date();
  const start = new Date(end);
  if (period === 'week') start.setDate(start.getDate() - 7);
  const toDate = (d) => d.toISOString().split('T')[0];
  return { start: toDate(start), end: toDate(end) };
}

function buildPrompt({ period, totals, byActivity, byEngineer, recurring, sampleNotes, maintenanceDue }) {
  return `You are a field-service operations analyst. Given the JSON data below for a ${period === 'day' ? "single day's" : "past week's"} field service activity, produce ONLY a valid JSON object (no markdown, no commentary) with this exact shape:

{
  "summary": "2-4 sentence plain-English summary of what happened this period",
  "anomalies": [{ "type": "recurring_fault" | "low_hours" | "other", "description": "1 sentence" }],
  "customer_blurb": "1-2 sentence customer-facing update, professional tone, no internal jargon"
}

Data:
Totals: ${JSON.stringify(totals)}
By activity code: ${JSON.stringify(byActivity)}
By engineer (hours/billing): ${JSON.stringify(byEngineer)}
Machines serviced 3+ times in the last 30 days (possible recurring faults): ${JSON.stringify(recurring)}
Machines with warranty expiring within 30 days (mention in summary if relevant, do NOT add to anomalies — these are added separately): ${JSON.stringify(maintenanceDue)}
Sample engineer notes from this period: ${JSON.stringify(sampleNotes)}

If there is no data, say so plainly in the summary and return an empty anomalies array. Output only the JSON object.`;
}

function parseLLMJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('LLM did not return JSON');
  return JSON.parse(match[0]);
}

// POST /api/digest/generate  { period: 'day' | 'week' }  (Director/Manager only)
router.post('/generate', async (req, res) => {
  if (!['Director', 'Manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  // Degrade gracefully (like billing/payments) when the AI key isn't configured,
  // rather than doing all the work and failing with a 500.
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI digest is not configured' });
  }

  const period = req.body.period === 'week' ? 'week' : 'day';
  const { start, end } = periodRange(period);

  try {
    const [totals, byActivity, byEngineer, recurring, notesRows, maintenanceDue] = await Promise.all([
      db.query(
        `SELECT COUNT(*) AS total_logs, SUM(hours) AS total_hours, SUM(billing_inr) AS total_billing,
                COUNT(DISTINCT engineer_id) AS active_engineers, COUNT(DISTINCT customer_id) AS customers_served
         FROM activity_logs WHERE tenant_id=$1 AND date BETWEEN $2 AND $3`,
        [req.tenantId, start, end]
      ),
      db.query(
        `SELECT activity_code, COUNT(*) AS count, SUM(hours) AS hours
         FROM activity_logs WHERE tenant_id=$1 AND date BETWEEN $2 AND $3
         GROUP BY activity_code ORDER BY count DESC`,
        [req.tenantId, start, end]
      ),
      db.query(
        `SELECT u.name, COUNT(*)::int AS logs, SUM(l.hours) AS hours, SUM(l.billing_inr) AS billing
         FROM activity_logs l JOIN users u ON u.id = l.engineer_id
         WHERE l.tenant_id=$1 AND l.date BETWEEN $2 AND $3
         GROUP BY l.engineer_id, u.name ORDER BY hours DESC NULLS LAST`,
        [req.tenantId, start, end]
      ),
      db.query(
        `SELECT m.name AS machine, c.name AS customer, COUNT(*) AS visits
         FROM activity_logs l
         JOIN machines m ON m.id = l.machine_id
         JOIN customers c ON c.id = l.customer_id
         WHERE l.tenant_id=$1 AND l.date >= (CURRENT_DATE - INTERVAL '30 days')
         GROUP BY m.id, m.name, c.name HAVING COUNT(*) >= 3 ORDER BY visits DESC`,
        [req.tenantId]
      ),
      db.query(
        `SELECT notes FROM activity_logs
         WHERE tenant_id=$1 AND date BETWEEN $2 AND $3 AND notes IS NOT NULL AND notes <> ''
         ORDER BY submitted_at DESC LIMIT 50`,
        [req.tenantId, start, end]
      ),
      db.query(
        `SELECT m.name AS machine, c.name AS customer, m.warranty_until
         FROM machines m JOIN customers c ON c.id = m.customer_id
         WHERE c.tenant_id=$1 AND m.warranty_until IS NOT NULL
           AND m.warranty_until BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
         ORDER BY m.warranty_until ASC`,
        [req.tenantId]
      ),
    ]);

    const prompt = buildPrompt({
      period,
      totals: totals.rows[0],
      byActivity: byActivity.rows,
      byEngineer: byEngineer.rows,
      recurring: recurring.rows,
      sampleNotes: notesRows.rows.map((r) => r.notes),
      maintenanceDue: maintenanceDue.rows,
    });

    const raw = await llm.complete(prompt);
    const parsed = parseLLMJson(raw);

    // Maintenance-due anomalies are deterministic facts, not LLM judgment —
    // appended directly rather than trusting the model to transcribe them.
    const maintenanceAnomalies = maintenanceDue.rows.map((m) => ({
      type: 'maintenance_due',
      description: `${m.machine} (${m.customer}) warranty expires ${new Date(m.warranty_until).toLocaleDateString('en-IN')}`,
    }));
    const anomalies = [...(parsed.anomalies || []), ...maintenanceAnomalies];

    const { rows } = await db.query(
      `INSERT INTO digests (tenant_id, period_type, period_start, period_end, summary, anomalies, customer_blurb, generated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        req.tenantId, period, start, end,
        parsed.summary || '', JSON.stringify(anomalies), parsed.customer_blurb || '',
        req.user.id,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err.message === 'ANTHROPIC_API_KEY not configured') {
      return res.status(503).json({ error: 'AI digest is not configured' });
    }
    res.status(500).json({ error: 'Could not generate digest' });
  }
});

// GET /api/digest/latest
router.get('/latest', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM digests WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [req.tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: 'No digest yet' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/digest  — recent history
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, period_type, period_start, period_end, summary, created_at
       FROM digests WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 20`,
      [req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
