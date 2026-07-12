import Icon from './Icon';
import Reveal from './Reveal';
import Typewriter from './Typewriter';

const POINTS = [
  'Plain-English summary of any day or week',
  'Automatic anomaly & recurring-fault detection',
  'Maintenance reminders before warranties lapse',
  'One-tap customer-ready update, no editing needed',
];

export default function AIDigestSpotlight() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container hero-grid">
        <Reveal className="mockup">
          <div className="mockup-bar">
            <span className="mockup-dot" style={{ background: '#c4b5fd' }} />
            <span className="mockup-dot" style={{ background: '#93c5fd' }} />
            <span className="mockup-dot" style={{ background: '#86efac' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: '#C2740C', fontWeight: 700, fontSize: 12, fontFamily: 'ui-monospace, monospace', letterSpacing: '.03em' }}>
            <Icon name="sparkle" size={15} /> AI DAILY DIGEST
          </div>
          <div style={{ background: '#faf6ef', border: '1px solid #EAE4DA', borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 13, color: '#3f3a32', lineHeight: 1.65, minHeight: 76 }}>
            <Typewriter text="12 site visits completed today, 3 machines serviced under warranty, 2 sites flagged for repeat visits. Engineer hours are up 8% vs last week." />
          </div>
          <div className="mockup-list-row">
            <span>Chiller Unit 1 — 3 visits in 30 days</span>
            <span className="mockup-badge" style={{ background: '#fee2e2', color: '#dc2626' }}>Recurring fault</span>
          </div>
          <div className="mockup-list-row">
            <span>AHU Block A — warranty expiring</span>
            <span className="mockup-badge" style={{ background: '#fef9c3', color: '#854d0e' }}>15 days left</span>
          </div>
          <div className="mockup-list-row" style={{ marginBottom: 0 }}>
            <span>Customer summary ready to send</span>
            <span className="mockup-badge">Copy &amp; send</span>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <span className="eyebrow" style={{ background: '#FBEFD9', color: '#C2740C' }}><span className="dot" /> What no one else has</span>
          <h2 style={{ fontSize: 34, fontWeight: 800, color: '#201C16', letterSpacing: '-.02em', marginBottom: 14 }}>
            Your AI Daily Digest does the reporting for you
          </h2>
          <p style={{ fontSize: 15.5, color: '#8B8375', lineHeight: 1.7, marginBottom: 18 }}>
            Every other tool just collects logs — someone still has to read dozens of entries to
            figure out what happened. Paimal writes a plain-English summary on demand, flags
            recurring machine faults and unusually low hours, surfaces warranties about to lapse,
            and drafts a ready-to-send customer update. What took a manager an hour now takes one tap.
          </p>
          <ul style={{ listStyle: 'none' }}>
            {POINTS.map((t) => (
              <li key={t} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14.5, color: '#3f3a32', padding: '7px 0' }}>
                <span style={{ color: '#3F8F5B', display: 'flex' }}><Icon name="check" size={18} stroke={2.4} /></span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
