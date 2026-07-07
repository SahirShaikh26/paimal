export default function AIDigestSpotlight() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container hero-grid">
        <div className="mockup" style={{ transform: 'rotate(-1deg)' }}>
          <div className="mockup-bar">
            <span className="mockup-dot" style={{ background: '#c4b5fd' }} />
            <span className="mockup-dot" style={{ background: '#93c5fd' }} />
            <span className="mockup-dot" style={{ background: '#86efac' }} />
          </div>
          <div style={{ background: '#f5f3ff', borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 12.5, color: '#374151', lineHeight: 1.6 }}>
            "12 site visits completed this week, 3 machines serviced under warranty, 2 sites flagged for repeat visits. Engineer hours are up 8% vs last week."
          </div>
          <div className="mockup-list-row">
            <span>⚠️ Chiller Unit 1 — 3 visits in 30 days</span>
            <span className="mockup-badge" style={{ background: '#fee2e2', color: '#dc2626' }}>Recurring fault</span>
          </div>
          <div className="mockup-list-row">
            <span>🛡️ AHU Block A — warranty expiring</span>
            <span className="mockup-badge" style={{ background: '#fef9c3', color: '#854d0e' }}>15 days left</span>
          </div>
          <div className="mockup-list-row" style={{ marginBottom: 0 }}>
            <span>📋 Customer summary ready to send</span>
            <span className="mockup-badge">Copy &amp; send</span>
          </div>
        </div>

        <div>
          <span className="eyebrow" style={{ background: '#FBEFD9', color: '#C2740C' }}>WHAT NO ONE ELSE HAS</span>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#201C16', letterSpacing: '-.01em', marginBottom: 14 }}>
            Your AI Daily Digest does the reporting for you
          </h2>
          <p style={{ fontSize: 15.5, color: '#64748b', lineHeight: 1.7, marginBottom: 18 }}>
            Every other field-service tool just collects logs — someone still has to read through
            dozens of entries to figure out what happened. Paimal generates a plain-English
            summary on demand, automatically flags recurring machine faults and engineers logging
            unusually low hours, surfaces machines with warranties about to expire, and drafts a
            ready-to-send customer update. What used to take a manager an hour now takes one tap.
          </p>
          <ul style={{ listStyle: 'none' }}>
            {[
              'Plain-English summary of any day or week',
              'Automatic anomaly & recurring-fault detection',
              'Maintenance reminders before warranties lapse',
              'One-tap customer-ready update, no editing needed',
            ].map((t) => (
              <li key={t} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14, color: '#374151', padding: '6px 0' }}>
                <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
