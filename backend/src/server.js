require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const db = require('./db');

const authRoutes = require('./routes/auth');
const logsRoutes = require('./routes/logs');
const projectsRoutes = require('./routes/projects');
const customersRoutes = require('./routes/customers');
const engineersRoutes = require('./routes/engineers');
const reportsRoutes = require('./routes/reports');

async function migrate() {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS tenants (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(200) NOT NULL, slug VARCHAR(50) UNIQUE NOT NULL, plan VARCHAR(20) DEFAULT 'starter', active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, name VARCHAR(100) NOT NULL, email VARCHAR(150) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) CHECK (role IN ('Director','Manager','Engineer')), reports_to UUID REFERENCES users(id), dept VARCHAR(50), active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS customers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, code VARCHAR(20) NOT NULL, name VARCHAR(200) NOT NULL, city VARCHAR(100), region VARCHAR(100), contact_name VARCHAR(100), contact_phone VARCHAR(20), address TEXT, lat DECIMAL(10,7), lng DECIMAL(10,7))`,
    `CREATE TABLE IF NOT EXISTS machines (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), customer_id UUID REFERENCES customers(id) ON DELETE CASCADE, name VARCHAR(150), model VARCHAR(100), product_type VARCHAR(50), serial_no VARCHAR(100), install_year INTEGER, warranty_until DATE)`,
    `CREATE TABLE IF NOT EXISTS projects (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, name VARCHAR(200) NOT NULL, customer_id UUID REFERENCES customers(id), engineer_id UUID REFERENCES users(id), status VARCHAR(30) DEFAULT 'Planned', category VARCHAR(30), product_type VARCHAR(50), value_inr DECIMAL(14,2), start_date DATE, end_date DATE)`,
    `CREATE TABLE IF NOT EXISTS activity_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, engineer_id UUID REFERENCES users(id), customer_id UUID REFERENCES customers(id), machine_id UUID REFERENCES machines(id), project_id UUID REFERENCES projects(id), date DATE NOT NULL DEFAULT CURRENT_DATE, activity_code VARCHAR(5) NOT NULL, query_type VARCHAR(80), product_type VARCHAR(50), hours DECIMAL(5,1), billing_inr DECIMAL(12,2) DEFAULT 0, cost_inr DECIMAL(12,2) DEFAULT 0, status VARCHAR(30), location VARCHAR(40), notes TEXT, submitted_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS attendance (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), engineer_id UUID REFERENCES users(id) ON DELETE CASCADE, date DATE NOT NULL, check_in TIMESTAMP, check_out TIMESTAMP, location VARCHAR(40), lat DECIMAL(10,7), lng DECIMAL(10,7), UNIQUE(engineer_id, date))`,
    `CREATE INDEX IF NOT EXISTS idx_logs_tenant_date ON activity_logs(tenant_id, date DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_logs_engineer ON activity_logs(engineer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id)`,
    `CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id)`,
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
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/engineers', engineersRoutes);
app.use('/api/reports', reportsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
migrate().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
