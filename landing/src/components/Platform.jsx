import ColorIcon from './ColorIcon';
import Reveal from './Reveal';

// The "one-stop" statement — every capability grouped into the pillars a field
// business actually runs on. Backed by real product areas (see backend/src/routes).
// Each pillar carries its own colour (semantic: payments = green, AI = magenta …).
const PILLARS = [
  {
    icon: 'fieldops', wide: true, title: 'Field operations',
    desc: 'Your engineers log every site visit, service call, and hour in seconds — from web or the mobile app, online or off.',
    chips: ['Activity logging', 'Works offline', 'Photo proof', 'Voice notes · 9 languages', 'Check-ins'],
    color: '#E4881F', dark: '#C2740C', tint: '#FBEFD9', glow: 'rgba(228,136,31,.20)',
  },
  {
    icon: 'calendar', wide: true, title: 'Scheduling & attendance',
    desc: 'Dispatch people to future jobs and let recurring contracts (weekly, monthly, quarterly) schedule themselves. Attendance tracked automatically.',
    chips: ['Dispatch', 'Recurring visits', 'Attendance'],
    color: '#2E6BE6', dark: '#1E4FBF', tint: '#E6EDFC', glow: 'rgba(46,107,230,.18)',
  },
  {
    icon: 'records', title: 'Customers & assets',
    desc: 'A living history of every customer, site, and installed machine — with warranty expiry reminders built in.',
    chips: ['Customer records', 'Machine history', 'Warranty alerts'],
    color: '#0E9C8A', dark: '#0A7A6C', tint: '#DBF2EE', glow: 'rgba(14,156,138,.18)',
  },
  {
    icon: 'invoice', title: 'Quotes, invoices & payments',
    desc: 'Turn completed work into quotes and invoices, then collect by UPI, card or netbanking — no separate billing tool.',
    chips: ['Quotes', 'Invoices', 'UPI · Card · Netbanking'],
    color: '#3F8F5B', dark: '#2E6E44', tint: '#DCF0E6', glow: 'rgba(63,143,91,.18)',
  },
  {
    icon: 'team', title: 'Team & roles',
    desc: 'Director, Manager and Engineer roles with the right permissions for each — out of the box, no setup.',
    chips: ['Role-based access', 'Multi-branch', 'Bulk import'],
    color: '#7A5AF0', dark: '#5B3FD6', tint: '#ECE7FD', glow: 'rgba(122,90,240,.18)',
  },
  {
    icon: 'ai', full: true, title: 'AI insights & analytics',
    desc: 'A one-tap daily digest summarises the day in plain English, flags recurring faults and anomalies, and drafts customer-ready updates — on top of real-time billing and performance analytics.',
    chips: ['AI Daily Digest', 'Anomaly detection', 'Billing trends', 'Exportable reports'],
    color: '#D6459B', dark: '#B02F7E', tint: '#FBE3F1', glow: 'rgba(214,69,155,.18)',
  },
];

export default function Platform() {
  return (
    <section className="section platform-section has-ambient" id="platform">
      <div className="ambient" aria-hidden="true"><span className="a1" /><span className="a2" /></div>
      <div className="container">
        <Reveal className="section-head">
          <span className="eyebrow"><span className="dot" /> One stop, not five tools</span>
          <h2>Everything to run your workforce, in one platform</h2>
          <p>
            Stop stitching together a scheduling app, a billing tool, a spreadsheet and a WhatsApp
            group. Paimal covers the whole loop — from assigning a job to getting paid for it.
          </p>
        </Reveal>
        <div className="bento">
          {PILLARS.map((p, i) => (
            <Reveal
              as="div"
              key={p.title}
              delay={(i % 3) * 90}
              className={`bento-card${p.full ? ' full' : p.wide ? ' wide' : ''}`}
              style={{ '--c': p.color, '--c2': p.dark, '--tint': p.tint, '--glow': p.glow }}
            >
              <div className="b-icon"><ColorIcon name={p.icon} size={34} /></div>
              <div className="b-text">
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </div>
              <div className="b-chips">
                {p.chips.map((c) => <span className="b-chip" key={c}>{c}</span>)}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
