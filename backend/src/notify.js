// Customer notification sender — SMS + WhatsApp via Twilio's REST API (no SDK,
// just fetch). Designed to degrade gracefully: when Twilio credentials aren't
// configured it logs and no-ops so the rest of the app keeps working. Every
// call is wrapped so a notification failure can never break the parent request.
//
// Env:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN  — account credentials
//   TWILIO_SMS_FROM        — e.g. +1415... (a Twilio SMS-capable number)
//   TWILIO_WHATSAPP_FROM   — e.g. +1415... (a WhatsApp-enabled sender)
//   DEFAULT_COUNTRY_CODE   — prepended to bare 10-digit numbers (default 91/India)

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const SMS_FROM = process.env.TWILIO_SMS_FROM;
const WA_FROM = process.env.TWILIO_WHATSAPP_FROM;
const CC = (process.env.DEFAULT_COUNTRY_CODE || '91').replace(/\D/g, '');

const configured = !!(SID && TOKEN);
if (!configured) {
  console.warn('TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN not set — customer notifications will be skipped');
}

// Normalize an Indian/local phone number to E.164 (+<cc><number>).
function toE164(raw) {
  if (!raw) return null;
  let n = String(raw).replace(/[^\d+]/g, '');
  if (n.startsWith('+')) return n;
  n = n.replace(/^0+/, '');
  if (n.length === 10) return `+${CC}${n}`;       // bare local number
  if (n.length > 10) return `+${n}`;              // already has a country code
  return null;                                    // too short to be valid
}

/**
 * Send a message. Returns { sent, skipped?, error? } and never throws.
 * @param {{ to: string, body: string, channel?: 'sms'|'whatsapp' }} opts
 */
async function sendMessage({ to, body, channel = 'sms' }) {
  if (!configured) return { sent: false, skipped: true, reason: 'not_configured' };

  const dest = toE164(to);
  if (!dest) return { sent: false, skipped: true, reason: 'invalid_number' };

  const useWhatsApp = channel === 'whatsapp' && WA_FROM;
  const from = useWhatsApp ? WA_FROM : SMS_FROM;
  if (!from) return { sent: false, skipped: true, reason: 'no_sender' };

  const params = new URLSearchParams({
    To: useWhatsApp ? `whatsapp:${dest}` : dest,
    From: useWhatsApp ? `whatsapp:${from}` : from,
    Body: body,
  });

  try {
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${SID}:${TOKEN}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );
    if (!resp.ok) {
      const text = await resp.text();
      console.error('Notification send failed:', resp.status, text.slice(0, 300));
      return { sent: false, error: `twilio_${resp.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error('Notification send error:', err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendMessage, notificationsConfigured: configured };
