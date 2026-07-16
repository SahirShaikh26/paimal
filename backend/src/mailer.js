// Email sender. Prefers Resend's HTTPS API (port 443 — works even where the host
// blocks outbound SMTP ports, which Railway does), and falls back to generic SMTP
// via nodemailer for any other provider. Mirrors notify.js: degrades gracefully
// when unconfigured and never throws.
//
// Env (Resend, recommended):   SMTP_USER=resend  SMTP_PASS=<re_… api key>  MAIL_FROM="Paimal <invoices@yourdomain>"
// Env (any SMTP provider):     SMTP_HOST  SMTP_PORT(=587)  SMTP_USER  SMTP_PASS  MAIL_FROM
const nodemailer = require('nodemailer');

const HOST = process.env.SMTP_HOST;
const PORT = Number(process.env.SMTP_PORT) || 587;
const USER = process.env.SMTP_USER;
const PASS = process.env.SMTP_PASS;
const FROM = process.env.MAIL_FROM || (USER ? `Paimal <${USER}>` : null);

// Use the Resend HTTP API when the key looks like a Resend key or the host points at Resend.
const RESEND_KEY = (PASS || '').trim();
const useResendApi = /resend/i.test(HOST || '') || /resend/i.test(USER || '') || RESEND_KEY.startsWith('re_');

const configured = useResendApi ? !!(RESEND_KEY && FROM) : !!(HOST && USER && PASS);
if (!configured) {
  console.warn('Email not configured (need SMTP_* / Resend key + MAIL_FROM) — invoice emails will be skipped');
} else {
  console.log(`Mailer ready via ${useResendApi ? 'Resend HTTPS API' : `SMTP ${HOST}:${PORT}`}`);
}

// Fail-fast SMTP transport (10s) so a blocked port can never hang a request.
const transporter = (!useResendApi && configured)
  ? nodemailer.createTransport({
      host: HOST, port: PORT, secure: PORT === 465, auth: { user: USER, pass: PASS },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    })
  : null;

/**
 * Send an email. Returns { sent, skipped?, error? } and never throws.
 * `from` overrides MAIL_FROM's display name per send (address stays the verified one);
 * `replyTo` routes customer replies to the sender.
 * @param {{ to: string, subject: string, text?: string, html?: string, from?: string, replyTo?: string, attachments?: Array<{filename:string, content:Buffer|string, contentType?:string}> }} opts
 */
async function sendMail({ to, subject, text, html, from, replyTo, attachments }) {
  if (!configured) return { sent: false, skipped: true, reason: 'not_configured' };

  if (useResendApi) {
    try {
      const body = {
        from: from || FROM,
        to: Array.isArray(to) ? to : [to],
        subject, text, html,
        reply_to: replyTo || undefined,
        attachments: (attachments || []).map((a) => ({
          filename: a.filename,
          content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content,
        })),
      };
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const t = await resp.text();
        console.error('Resend send failed:', resp.status, t.slice(0, 300));
        let msg = t.slice(0, 200);
        try { msg = JSON.parse(t).message || msg; } catch { /* keep raw */ }
        return { sent: false, error: `resend_${resp.status}`, detail: msg };
      }
      return { sent: true };
    } catch (err) {
      console.error('Resend send error:', err.message);
      return { sent: false, error: err.message };
    }
  }

  try {
    await transporter.sendMail({ from: from || FROM, to, subject, text, html, replyTo, attachments });
    return { sent: true };
  } catch (err) {
    console.error('Email send error:', err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendMail, mailerConfigured: configured };
