import { useState } from 'react';
import { SIGNUP_URL } from '../config';

const TIERS = [
  {
    key: 'starter',
    name: 'Starter',
    monthly: 399,
    annual: 333,
    blurb: 'For small teams getting started',
    seats: 'Up to 5 seats',
    features: ['Activity logging', 'Project & customer tracking', 'Offline mode', 'Job scheduling', 'Basic reports', 'Mobile app access'],
    cta: 'Start Free Trial',
    href: SIGNUP_URL,
  },
  {
    key: 'pro',
    name: 'Pro',
    monthly: 299,
    annual: 249,
    blurb: 'For growing mid-size teams',
    seats: 'Up to 25 seats',
    features: ['Everything in Starter', 'AI Daily Digest', 'Photo capture on logs', 'Voice notes (9 languages)', 'Advanced analytics', 'CSV bulk import', 'Priority support'],
    cta: 'Start Free Trial',
    href: SIGNUP_URL,
    featured: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    monthly: null,
    annual: null,
    blurb: 'For large field operations',
    seats: 'Unlimited seats',
    features: ['Everything in Pro', 'Unlimited seats', 'Dedicated onboarding', 'Custom contract terms'],
    cta: 'Contact Sales',
    href: 'mailto:sales@fieldpilot.app?subject=Enterprise%20Plan',
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <section className="section pricing-section" id="pricing">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">PRICING</span>
          <h2>Simple, per-seat pricing</h2>
          <p>Pay only for active team members. Upgrade, downgrade, or cancel anytime. Prices exclude 18% GST.</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: annual ? '#A79E8C' : '#201C16' }}>Monthly</span>
          <button
            onClick={() => setAnnual((a) => !a)}
            aria-label="Toggle annual billing"
            style={{
              width: 46, height: 26, borderRadius: 20, border: 'none', cursor: 'pointer',
              background: annual ? '#201C16' : '#DCD4C6',
              position: 'relative', transition: 'background .2s ease',
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: annual ? 23 : 3,
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              transition: 'left .2s ease', boxShadow: '0 1px 3px rgba(0,0,0,.3)',
            }} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: annual ? '#201C16' : '#A79E8C' }}>
            Annual <span style={{ color: '#16a34a', fontWeight: 700 }}>(save ~16%)</span>
          </span>
        </div>

        <div className="pricing-grid">
          {TIERS.map((t) => {
            const price = annual ? t.annual : t.monthly;
            return (
              <div className={`price-card${t.featured ? ' featured' : ''}`} key={t.key}>
                {t.featured && <span className="price-tag">MOST POPULAR</span>}
                <h3>{t.name}</h3>
                <div className="price-blurb">{t.blurb}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#201C16' }}>
                  {price === null ? 'Custom' : `₹${price}`}
                  {price !== null && <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b' }}> /seat/mo</span>}
                </div>
                {price !== null && annual && (
                  <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>
                    Billed ₹{price * 12}/seat/year
                  </div>
                )}
                <div className="price-seats" style={{ marginTop: 6 }}>{t.seats}</div>
                <ul>
                  {t.features.map((f) => <li key={f}>{f}</li>)}
                </ul>
                <a href={t.href} className={`btn ${t.featured ? 'btn-primary' : 'btn-ghost'}`}>{t.cta}</a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
