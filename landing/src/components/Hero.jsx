import { SIGNUP_URL, LOGIN_URL } from '../config';
import Icon from './Icon';
import CountUp from './CountUp';
import Watermark from './Watermark';

export default function Hero() {
  return (
    <section className="hero">
      <div className="grid-bg" aria-hidden="true" />
      <Watermark size={360} opacity={0.05} style={{ top: '-40px', right: '-70px', zIndex: -1 }} />
      <div className="aurora" aria-hidden="true">
        <span className="b1" />
        <span className="b2" />
        <span className="b3" />
      </div>
      <div className="container hero-grid">
        <div>
          <span className="eyebrow"><span className="dot" /> One platform for your whole field team</span>
          <h1>
            Run your entire field operation <span className="grad-text">from one screen</span>
          </h1>
          <p>
            Scheduling, attendance, jobs, customers, billing and payments — plus an AI digest
            that writes your reports for you. Paimal replaces the spreadsheets and WhatsApp
            groups with a single source of truth your whole team can trust.
          </p>
          <div className="hero-tagline">Kaam ka gyaan ho, sahi pehchaan ho!</div>
          <div className="hero-ctas">
            <a href={SIGNUP_URL} className="btn btn-glow btn-lg">Start Free 14-Day Trial <Icon name="arrow" /></a>
            <a href={LOGIN_URL} className="btn btn-ghost btn-lg">Log In</a>
          </div>
          <div className="hero-fineprint">No credit card required · Live the same day · Web &amp; mobile</div>

          <div className="hero-stats">
            <div className="hero-stat">
              <div className="n"><CountUp end={10} suffix="+" /></div>
              <div className="l">Trades supported</div>
            </div>
            <div className="hero-stat">
              <div className="n"><CountUp end={9} /></div>
              <div className="l">Voice languages</div>
            </div>
            <div className="hero-stat">
              <div className="n"><CountUp end={1} suffix=" tap" /></div>
              <div className="l">To your daily report</div>
            </div>
          </div>
        </div>

        <div className="mockup float">
          <div className="mockup-bar">
            <span className="mockup-dot" style={{ background: '#fca5a5' }} />
            <span className="mockup-dot" style={{ background: '#fcd34d' }} />
            <span className="mockup-dot" style={{ background: '#86efac' }} />
          </div>
          <div className="mockup-row">
            <div className="mockup-card">
              <div className="mockup-stat"><CountUp end={128} /></div>
              <div className="mockup-label">ACTIVE PROJECTS</div>
            </div>
            <div className="mockup-card">
              <div className="mockup-stat">₹<CountUp end={42} />L</div>
              <div className="mockup-label">BILLED THIS MONTH</div>
              <div className="mockup-bars">
                <div style={{ height: '40%', animationDelay: '.05s' }} />
                <div style={{ height: '65%', animationDelay: '.12s' }} />
                <div style={{ height: '50%', animationDelay: '.19s' }} />
                <div style={{ height: '85%', animationDelay: '.26s' }} />
                <div style={{ height: '70%', animationDelay: '.33s' }} />
              </div>
            </div>
          </div>
          <div className="mockup-list-row">
            <span>Rajesh K. — Machine Service</span>
            <span className="mockup-badge">Completed</span>
          </div>
          <div className="mockup-list-row">
            <span>Priya S. — Site Check-in</span>
            <span className="mockup-badge">On Site</span>
          </div>
          <div className="mockup-list-row" style={{ marginBottom: 0 }}>
            <span>Acme Corp — Installation</span>
            <span className="mockup-badge" style={{ background: '#FBEFD9', color: '#C2740C' }}>In Progress</span>
          </div>
        </div>
      </div>
    </section>
  );
}
