// Email sender via SMTP (nodemailer). Mirrors notify.js: degrades gracefully —
// when SMTP credentials aren't configured it logs and no-ops so the rest of the
// app keeps working, and every call is wrapped so a send failure can't break the
// parent request.
//
// Env:
//   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS
//   MAIL_FROM  — e.g. "Paimal <billing@yourcompany.com>" (defaults to SMTP_USER)
const nodemailer = require('nodemailer');

const HOST = process.env.SMTP_HOST;
const PORT = Number(process.env.SMTP_PORT) || 587;
const USER = process.env.SMTP_USER;
const PASS = process.env.SMTP_PASS;
const FROM = process.env.MAIL_FROM || (USER ? `Paimal <${USER}>` : null);

const configured = !!(HOST && USER && PASS);
if (!configured) {
  console.warn('SMTP_HOST/SMTP_USER/SMTP_PASS not set — invoice emails will be skipped');
}

const transporter = configured
  ? nodemailer.createTransport({ host: HOST, port: PORT, secure: PORT === 465, auth: { user: USER, pass: PASS } })
  : null;

/**
 * Send an email. Returns { sent, skipped?, error? } and never throws.
 * @param {{ to: string, subject: string, text?: string, html?: string, attachments?: any[] }} opts
 */
async function sendMail({ to, subject, text, html, attachments }) {
  if (!configured) return { sent: false, skipped: true, reason: 'not_configured' };
  try {
    await transporter.sendMail({ from: FROM, to, subject, text, html, attachments });
    return { sent: true };
  } catch (err) {
    console.error('Email send error:', err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendMail, mailerConfigured: configured };
