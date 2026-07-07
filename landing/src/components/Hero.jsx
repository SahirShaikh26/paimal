import { SIGNUP_URL, LOGIN_URL } from '../config';

export default function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div>
          <span className="eyebrow">AI-POWERED · FOR FIELD SERVICE TEAMS</span>
          <h1>
            Run your field operations <span>without the spreadsheets</span>
          </h1>
          <p>
            Paimal gives growing field service companies one place to track engineers,
            projects, customers, and daily activity — with an AI digest that writes your
            reports for you. Built for teams of 5 to 500, works offline in the field.
          </p>
          <div className="hero-tagline">Kaam ka gyaan ho, sahi pehchaan ho!</div>
          <div className="hero-ctas">
            <a href={SIGNUP_URL} className="btn btn-primary btn-lg">Start Free 14-Day Trial</a>
            <a href={LOGIN_URL} className="btn btn-ghost btn-lg">Log In</a>
          </div>
          <div className="hero-fineprint">No credit card required · Cancel anytime · Web &amp; mobile</div>
        </div>

        <div className="mockup">
          <div className="mockup-bar">
            <span className="mockup-dot" style={{ background: '#fca5a5' }} />
            <span className="mockup-dot" style={{ background: '#fcd34d' }} />
            <span className="mockup-dot" style={{ background: '#86efac' }} />
          </div>
          <div className="mockup-row">
            <div className="mockup-card">
              <div className="mockup-stat">128</div>
              <div className="mockup-label">ACTIVE PROJECTS</div>
            </div>
            <div className="mockup-card">
              <div className="mockup-stat">₹42L</div>
              <div className="mockup-label">BILLED THIS MONTH</div>
              <div className="mockup-bars">
                <div style={{ height: '40%' }} />
                <div style={{ height: '65%' }} />
                <div style={{ height: '50%' }} />
                <div style={{ height: '85%' }} />
                <div style={{ height: '70%' }} />
              </div>
            </div>
          </div>
          <div className="mockup-list-row">
            <span>🔧 Rajesh K. — Machine Service</span>
            <span className="mockup-badge">Completed</span>
          </div>
          <div className="mockup-list-row">
            <span>📍 Priya S. — Site Check-in</span>
            <span className="mockup-badge">On Site</span>
          </div>
          <div className="mockup-list-row" style={{ marginBottom: 0 }}>
            <span>🗂️ Acme Corp — Installation</span>
            <span className="mockup-badge" style={{ background: '#FBEFD9', color: '#C2740C' }}>In Progress</span>
          </div>
        </div>
      </div>
    </section>
  );
}
