// Builds the Express app and exports it WITHOUT listening, so it can be served
// either by a long-running process (server.js) or a serverless handler (api/).
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
const checkoutRoutes = require('./routes/checkout');
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
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leave');
const shiftsRoutes = require('./routes/shifts');
const timesheetsRoutes = require('./routes/timesheets');
const tasksRoutes = require('./routes/tasks');
const payrollRoutes = require('./routes/payroll');

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
app.use('/api/checkout', checkoutRoutes);
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
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/timesheets', timesheetsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/payroll', payrollRoutes);

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

module.exports = app;

