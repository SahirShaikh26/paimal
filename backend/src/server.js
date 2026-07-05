require('dotenv').config();
require('./sentry');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const db = require('./db');
const errorLogger = require('./middleware/errorLogger');

const authRoutes = require('./routes/auth');
const logsRoutes = require('./routes/logs');
const projectsRoutes = require('./routes/projects');
const customersRoutes = require('./routes/customers');
const engineersRoutes = require('./routes/engineers');
const reportsRoutes = require('./routes/reports');
const importRoutes = require('./routes/import');
const billingRoutes = require('./routes/billing');
const billingWebhookRoutes = require('./routes/billingWebhook');
const statusRoutes = require('./routes/status');
const digestRoutes = require('./routes/digest');
const visitsRoutes = require('./routes/visits');
const tenantRoutes = require('./routes/tenant');
const activityTypesRoutes = require('./routes/activityTypes');
const quotesRoutes = require('./routes/quotes');
const invoicesRoutes = require('./routes/invoices');
const publicRoutes = require('./routes/public');
const bookingRequestsRoutes = require('./routes/bookingRequests');
const productsRoutes = require('./routes/products');
const assignmentsRoutes = require('./routes/assignments');
const supportTicketsRoutes = require('./routes/supportTickets');

async function migrate() {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS tenants (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(200) NOT NULL, slug VARCHAR(50) UNIQUE NOT NULL, plan VARCHAR(20) DEFAULT 'starter', active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, name VARCHAR(100) NOT NULL, email VARCHAR(150) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) CHECK (role IN ('Director','Manager','Engineer')), reports_to UUID REFERENCES users(id), dept VARCHAR(50), active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS customers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, code VARCHAR(20) NOT NULL, name VARCHAR(200) NOT NULL, city VARCHAR(100), region VARCHAR(100), contact_name VARCHAR(100), contact_phone VARCHAR(20), address TEXT, lat DECIMAL(10,7), lng DECIMAL(10,7))`,
    `CREATE TABLE IF NOT EXISTS machines (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), customer_id UUID REFERENCES customers(id) ON DELETE CASCADE, name VARCHAR(150), model VARCHAR(100), product_type VARCHAR(50), serial_no VARCHAR(100), install_year INTEGER, warranty_until DATE)`,
    `CREATE TABLE IF NOT EXISTS projects (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, name VARCHAR(200) NOT NULL, customer_id UUID REFERENCES customers(id), engineer_id UUID REFERENCES users(id), status VARCHAR(30) DEFAULT 'Planned', category VARCHAR(30), product_type VARCHAR(50), value_inr DECIMAL(14,2), start_date DATE, end_date DATE)`,
    `CREATE TABLE IF NOT EXISTS activity_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, engineer_id UUID REFERENCES users(id), customer_id UUID REFERENCES customers(id), machine_id UUID REFERENCES machines(id), project_id UUID REFERENCES projects(id), date DATE NOT NULL DEFAULT CURRENT_DATE, activity_code VARCHAR(5) NOT NULL, query_type VARCHAR(80), product_type VARCHAR(50), hours DECIMAL(5,1), billing_inr DECIMAL(12,2) DEFAULT 0, cost_inr DECIMAL(12,2) DEFAULT 0, status VARCHAR(30), location VARCHAR(40), notes TEXT, submitted_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS attendance (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), engineer_id UUID REFERENCES users(id) ON DELETE CASCADE, date DATE NOT NULL, check_in TIMESTAMP, check_out TIMESTAMP, location VARCHAR(40), lat DECIMAL(10,7), lng DECIMAL(10,7), UNIQUE(engineer_id, date))`,
    `CREATE TABLE IF NOT EXISTS error_events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL, route VARCHAR(255), method VARCHAR(10), status_code INTEGER, message TEXT, stack TEXT, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS digests (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, period_type VARCHAR(10) NOT NULL, period_start DATE NOT NULL, period_end DATE NOT NULL, summary TEXT, anomalies JSONB DEFAULT '[]', customer_blurb TEXT, generated_by UUID REFERENCES users(id), created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS visits (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, engineer_id UUID REFERENCES users(id), customer_id UUID REFERENCES customers(id), machine_id UUID REFERENCES machines(id), project_id UUID REFERENCES projects(id), scheduled_date DATE NOT NULL, notes TEXT, status VARCHAR(20) DEFAULT 'Scheduled', created_by UUID REFERENCES users(id), created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS activity_types (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, code VARCHAR(10) NOT NULL, label VARCHAR(100) NOT NULL, color VARCHAR(7) DEFAULT '#2563eb', sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS recurring_visit_templates (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, engineer_id UUID REFERENCES users(id), customer_id UUID REFERENCES customers(id), machine_id UUID REFERENCES machines(id), project_id UUID REFERENCES projects(id), notes TEXT, frequency VARCHAR(20) CHECK (frequency IN ('weekly','monthly','quarterly')), active BOOLEAN DEFAULT true, created_by UUID REFERENCES users(id), created_at TIMESTAMP DEFAULT NOW())`,
    `ALTER TABLE visits ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES recurring_visit_templates(id)`,
    `ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES visits(id)`,
    `ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS photo_urls JSONB DEFAULT '[]'`,
    `ALTER TABLE tenants DROP COLUMN IF EXISTS stripe_customer_id`,
    `ALTER TABLE tenants DROP COLUMN IF EXISTS stripe_subscription_id`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR(100)`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(100)`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_status VARCHAR(20) DEFAULT 'trialing'`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS photo_capture_enabled BOOLEAN DEFAULT false`,
    // --- Revenue-cycle: quotes, invoices, online booking, notifications ---
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT false`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS online_booking_enabled BOOLEAN DEFAULT false`,
    // Atomic per-tenant counters for human-friendly quote/invoice numbers.
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS next_quote_seq INTEGER DEFAULT 1`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS next_invoice_seq INTEGER DEFAULT 1`,
    `CREATE TABLE IF NOT EXISTS quotes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, customer_id UUID REFERENCES customers(id), quote_number VARCHAR(30), status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft','Sent','Accepted','Declined','Converted')), line_items JSONB DEFAULT '[]', subtotal DECIMAL(14,2) DEFAULT 0, tax_pct DECIMAL(5,2) DEFAULT 0, tax_amount DECIMAL(14,2) DEFAULT 0, total DECIMAL(14,2) DEFAULT 0, notes TEXT, valid_until DATE, created_by UUID REFERENCES users(id), created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS invoices (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, customer_id UUID REFERENCES customers(id), quote_id UUID REFERENCES quotes(id), invoice_number VARCHAR(30), status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft','Sent','Paid','Overdue','Cancelled')), line_items JSONB DEFAULT '[]', subtotal DECIMAL(14,2) DEFAULT 0, tax_pct DECIMAL(5,2) DEFAULT 0, tax_amount DECIMAL(14,2) DEFAULT 0, total DECIMAL(14,2) DEFAULT 0, amount_paid DECIMAL(14,2) DEFAULT 0, razorpay_payment_link_id VARCHAR(100), razorpay_payment_link_url TEXT, due_date DATE, notes TEXT, created_by UUID REFERENCES users(id), created_at TIMESTAMP DEFAULT NOW(), paid_at TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS booking_requests (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, customer_name VARCHAR(200) NOT NULL, customer_phone VARCHAR(20) NOT NULL, customer_email VARCHAR(150), address TEXT, service_type VARCHAR(100), preferred_date DATE, notes TEXT, status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Declined')), created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE INDEX IF NOT EXISTS idx_quotes_tenant ON quotes(tenant_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_paylink ON invoices(razorpay_payment_link_id)`,
    `CREATE INDEX IF NOT EXISTS idx_booking_requests_tenant ON booking_requests(tenant_id, created_at DESC)`,
    // --- System-integrator / project-execution model (matches client spreadsheets) ---
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(80)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS cost_per_hour DECIMAL(10,2) DEFAULT 0`,
    `ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_manager_id UUID REFERENCES users(id)`,
    `ALTER TABLE projects ADD COLUMN IF NOT EXISTS quoted_hours DECIMAL(10,1)`,
    `ALTER TABLE activity_types ADD COLUMN IF NOT EXISTS category VARCHAR(40)`,
    `ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS work_mode VARCHAR(20)`,
    `ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS travel_hours DECIMAL(5,1) DEFAULT 0`,
    `ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS billable BOOLEAN DEFAULT true`,
    `ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS ticket_no VARCHAR(40)`,
    `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS next_ticket_seq INTEGER DEFAULT 1`,
    // Products / systems catalogue (per-tenant, configurable like activity_types).
    `CREATE TABLE IF NOT EXISTS products (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, name VARCHAR(120) NOT NULL, category VARCHAR(40), sort_order INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())`,
    // Assignments: the PM planning layer — Project × Activity × Engineer × Planned Days.
    `CREATE TABLE IF NOT EXISTS assignments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, project_id UUID REFERENCES projects(id) ON DELETE CASCADE, activity_type_id UUID REFERENCES activity_types(id), engineer_id UUID REFERENCES users(id), product VARCHAR(120), planned_days DECIMAL(6,1) DEFAULT 0, start_date DATE, end_date DATE, status VARCHAR(30) DEFAULT 'Not Started', notes TEXT, created_by UUID REFERENCES users(id), created_at TIMESTAMP DEFAULT NOW())`,
    // Support tickets (Type / Priority / Open→Closed lifecycle).
    `CREATE TABLE IF NOT EXISTS support_tickets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, ticket_no VARCHAR(40), project_id UUID REFERENCES projects(id), customer_id UUID REFERENCES customers(id), activity_type_id UUID REFERENCES activity_types(id), product VARCHAR(120), type VARCHAR(40), priority VARCHAR(20) DEFAULT 'Medium', issue TEXT, assigned_engineer_id UUID REFERENCES users(id), hours DECIMAL(6,1) DEFAULT 0, billable BOOLEAN DEFAULT true, status VARCHAR(20) DEFAULT 'Open', date_raised DATE DEFAULT CURRENT_DATE, closed_date DATE, created_by UUID REFERENCES users(id), created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id)`,
    `CREATE INDEX IF NOT EXISTS idx_assignments_tenant ON assignments(tenant_id, project_id)`,
    `CREATE INDEX IF NOT EXISTS idx_assignments_engineer ON assignments(engineer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tickets_tenant ON support_tickets(tenant_id, created_at DESC)`,
    // Seed default activity types for any tenant that doesn't have any yet —
    // covers existing tenants on first migrate() after this column was added,
    // and is a no-op for tenants that already have a customized list.
    `INSERT INTO activity_types (tenant_id, code, label, color, sort_order)
     SELECT t.id, v.code, v.label, v.color, v.sort_order
     FROM tenants t
     CROSS JOIN (VALUES
       ('PM','Preventive Maintenance','#1d4ed8',1),
       ('BD','Breakdown','#dc2626',2),
       ('IN','Installation','#16a34a',3),
       ('TR','Training','#ca8a04',4),
       ('SV','Site Visit','#7c3aed',5),
       ('OF','Office Work','#0369a1',6),
       ('TL','Travel','#be185d',7),
       ('LV','Leave','#475569',8)
     ) AS v(code, label, color, sort_order)
     WHERE NOT EXISTS (SELECT 1 FROM activity_types at2 WHERE at2.tenant_id = t.id)`,
    `CREATE INDEX IF NOT EXISTS idx_logs_tenant_date ON activity_logs(tenant_id, date DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_logs_engineer ON activity_logs(engineer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id)`,
    `CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id)`,
    `CREATE INDEX IF NOT EXISTS idx_error_events_created ON error_events(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_digests_tenant_created ON digests(tenant_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_visits_tenant_date ON visits(tenant_id, scheduled_date)`,
    `CREATE INDEX IF NOT EXISTS idx_visits_engineer ON visits(engineer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_activity_types_tenant ON activity_types(tenant_id)`,
    `CREATE INDEX IF NOT EXISTS idx_recurring_templates_tenant ON recurring_visit_templates(tenant_id)`,
  ];
  for (const sql of stmts) {
    await db.query(sql).catch(e => console.warn('Migration warning:', e.message));
  }
  console.log('Database migration complete');
}

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// Razorpay webhook needs the raw, untouched body for signature verification —
// must be mounted before express.json().
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }), billingWebhookRoutes);

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/engineers', engineersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/import', importRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/digest', digestRoutes);
app.use('/api/visits', visitsRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/activity-types', activityTypesRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/booking-requests', bookingRequestsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/support-tickets', supportTicketsRoutes);

app.get('/api/health', async (req, res) => {
  const start = Date.now();
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', latency_ms: Date.now() - start });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

app.use(errorLogger);

const PORT = process.env.PORT || 4000;
migrate().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
