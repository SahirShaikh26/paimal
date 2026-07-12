const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const requireRole = require('../middleware/requireRole');

router.use(auth, tenant);

const STATUSES = ['todo', 'in_progress', 'review', 'done'];

function isManager(req) {
  return ['Director', 'Manager'].includes(req.user.role);
}

// GET /api/tasks?project_id=&assignee_id=&status=&month=
router.get('/', async (req, res) => {
  const { project_id, assignee_id, status, month } = req.query;
  const conditions = ['t.tenant_id=$1'];
  const params = [req.tenantId];
  if (!isManager(req)) {
    params.push(req.user.id);
    conditions.push(`(t.assignee_id=$${params.length} OR t.created_by=$${params.length})`);
  }
  if (project_id) {
    params.push(project_id);
    conditions.push(`t.project_id=$${params.length}`);
  }
  if (assignee_id) {
    params.push(assignee_id);
    conditions.push(`t.assignee_id=$${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`t.status=$${params.length}`);
  }
  if (month) {
    params.push(month);
    conditions.push(`TO_CHAR(t.due_date,'YYYY-MM')=$${params.length}`);
  }
  try {
    const { rows } = await db.query(
      `SELECT t.*, u.name AS assignee_name, c.name AS creator_name, p.name AS project_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       LEFT JOIN users c ON c.id = t.created_by
       LEFT JOIN projects p ON p.id = t.project_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY t.status, t.position, t.created_at DESC
       LIMIT 1000`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  const { title, description, project_id, assignee_id, status, priority, due_date, checklist } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  // Engineers can only create tasks for themselves.
  const assignee = isManager(req) ? (assignee_id || null) : req.user.id;
  const st = STATUSES.includes(status) ? status : 'todo';
  try {
    const { rows } = await db.query(
      `INSERT INTO tasks (tenant_id, project_id, title, description, assignee_id, created_by,
         status, priority, due_date, checklist, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
         (SELECT COALESCE(MAX(position),0)+1 FROM tasks WHERE tenant_id=$1::uuid AND status=$7::varchar))
       RETURNING *`,
      [req.tenantId, project_id || null, title, description || null, assignee, req.user.id,
       st, priority || 'Medium', due_date || null, JSON.stringify(checklist || [])]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

async function loadTask(req, res) {
  const { rows: [task] } = await db.query(
    `SELECT * FROM tasks WHERE id=$1 AND tenant_id=$2`,
    [req.params.id, req.tenantId]
  );
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return null;
  }
  const canTouch = isManager(req) || task.assignee_id === req.user.id || task.created_by === req.user.id;
  if (!canTouch) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return null;
  }
  return task;
}

// PUT /api/tasks/:id — managers edit everything; engineers only status/checklist/description on their own.
router.put('/:id', async (req, res) => {
  try {
    const task = await loadTask(req, res);
    if (!task) return;

    const body = req.body;
    const fields = isManager(req)
      ? ['title', 'description', 'project_id', 'assignee_id', 'status', 'priority', 'due_date', 'checklist']
      : ['status', 'checklist', 'description'];

    const sets = ['updated_at=NOW()'];
    const params = [];
    for (const f of fields) {
      if (!(f in body)) continue;
      if (f === 'status' && !STATUSES.includes(body.status)) continue;
      params.push(f === 'checklist' ? JSON.stringify(body[f] || []) : (body[f] ?? null));
      sets.push(`${f}=$${params.length}`);
    }
    if ('status' in body && STATUSES.includes(body.status)) {
      sets.push(body.status === 'done' ? `completed_at=COALESCE(completed_at, NOW())` : `completed_at=NULL`);
    }
    params.push(req.params.id, req.tenantId);
    const { rows } = await db.query(
      `UPDATE tasks SET ${sets.join(', ')} WHERE id=$${params.length - 1} AND tenant_id=$${params.length} RETURNING *`,
      params
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tasks/:id/move {status, index} — kanban drop. Renumbers the destination column.
router.put('/:id/move', async (req, res) => {
  const { status, index } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const task = await loadTask(req, res);
    if (!task) return;

    const { rows: col } = await db.query(
      `SELECT id FROM tasks WHERE tenant_id=$1 AND status=$2 AND id<>$3 ORDER BY position, created_at DESC`,
      [req.tenantId, status, task.id]
    );
    const ids = col.map((r) => r.id);
    const at = Math.max(0, Math.min(Number(index) || 0, ids.length));
    ids.splice(at, 0, task.id);

    await db.query(
      `UPDATE tasks SET position = v.pos, status = CASE WHEN tasks.id=$3::uuid THEN $4::varchar ELSE tasks.status END,
              completed_at = CASE WHEN tasks.id=$3::uuid THEN (CASE WHEN $4::varchar='done' THEN COALESCE(tasks.completed_at, NOW()) ELSE NULL END) ELSE tasks.completed_at END,
              updated_at = CASE WHEN tasks.id=$3::uuid THEN NOW() ELSE tasks.updated_at END
       FROM (SELECT id, ordinality AS pos FROM unnest($1::uuid[]) WITH ORDINALITY AS u(id, ordinality)) v
       WHERE tasks.id = v.id AND tasks.tenant_id=$2`,
      [ids, req.tenantId, task.id, status]
    );
    const { rows: [updated] } = await db.query(`SELECT * FROM tasks WHERE id=$1`, [task.id]);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tasks/:id — managers or the creator.
router.delete('/:id', async (req, res) => {
  try {
    const { rows: [task] } = await db.query(
      `SELECT created_by FROM tasks WHERE id=$1 AND tenant_id=$2`,
      [req.params.id, req.tenantId]
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!isManager(req) && task.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    await db.query(`DELETE FROM tasks WHERE id=$1 AND tenant_id=$2`, [req.params.id, req.tenantId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
