import { SIGNUP_URL } from '../config';

const INDUSTRIES = [
  {
    icon: '🔧',
    name: 'Plumbing',
    blurb: 'Leak repairs, installations, drain cleaning',
    points: [
      'Full job history per customer site — what was fixed, when, by whom',
      'Before/after photos for every job as proof of work',
      'Engineers log materials & time even with no signal underground or in basements',
    ],
  },
  {
    icon: '⚡',
    name: 'Electrical Contracting',
    blurb: 'Wiring, panel upgrades, safety inspections',
    points: [
      'Track every panel/installation as an asset tied to the customer',
      'Warranty reminders before installed equipment coverage lapses',
      'Dispatch electricians to scheduled jobs, not just react to calls',
    ],
  },
  {
    icon: '❄️',
    name: 'HVAC & AC Servicing',
    blurb: 'Installation, preventive maintenance, breakdowns',
    points: [
      'Recurring maintenance contracts dispatched automatically',
      'AI digest flags units with 3+ repeat breakdowns — catch it before the AMC renewal fight',
      'Full machine history: install date, warranty, every service visit',
    ],
  },
  {
    icon: '🐜',
    name: 'Pest Control',
    blurb: 'Recurring treatments, inspections',
    points: [
      'Schedule recurring visits per contract — quarterly, monthly, whatever the plan',
      'Treatment notes dictated by voice, in the technician\'s language',
      'Customer-ready visit summary generated automatically',
    ],
  },
  {
    icon: '📹',
    name: 'Security & CCTV Installation',
    blurb: 'Installation, AMC, system upgrades',
    points: [
      'Every camera/device tracked as an asset per site',
      'AMC visit scheduling for ongoing monitoring contracts',
      'Photo documentation of installs and repairs',
    ],
  },
  {
    icon: '☀️',
    name: 'Solar Installation & Maintenance',
    blurb: 'Panel installs, performance checks, AMC',
    points: [
      'Project tracking from installation through commissioning',
      'Periodic performance-check visits scheduled in advance',
      'Warranty tracking across panels, inverters, and components',
    ],
  },
  {
    icon: '🛗',
    name: 'Elevator & Lift Maintenance',
    blurb: 'Safety-critical recurring service contracts',
    points: [
      'Recurring AMC visits — never miss a compliance-mandated service date',
      'Full audit trail of every inspection and repair per unit',
      'Anomaly detection flags lifts with unusual repeat-fault patterns',
    ],
  },
  {
    icon: '🔌',
    name: 'Generator & DG Set Servicing',
    blurb: 'AMC-based recurring maintenance',
    points: [
      'Recurring service contracts dispatched without manual scheduling each time',
      'Hours/fuel/service logs per generator, tied to the customer site',
      'Warranty and AMC renewal reminders before contracts lapse',
    ],
  },
  {
    icon: '🖥️',
    name: 'IT & Network AMC Support',
    blurb: 'On-site support, device tracking',
    points: [
      'Track devices/assets per client site with full service history',
      'On-site engineer dispatch and visit logging',
      'Exportable reports for SLA and billing reconciliation',
    ],
  },
  {
    icon: '🔩',
    name: 'Appliance Repair',
    blurb: 'Home & commercial service calls',
    points: [
      'Customer + appliance history across every past visit',
      'Photo proof of completed repairs',
      'Works offline for technicians in basements, factories, or low-signal areas',
    ],
  },
];

const s = {
  hero: { padding: '64px 0 48px', textAlign: 'center', background: 'radial-gradient(circle at 50% 0%, #eef2ff 0%, #fff 60%)' },
  h1: { fontSize: 38, fontWeight: 800, color: '#1e3a5f', letterSpacing: '-.01em', marginBottom: 14 },
  sub: { fontSize: 16, color: '#64748b', maxWidth: 600, margin: '0 auto' },
  cardHead: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 },
  icon: { fontSize: 28 },
  name: { fontSize: 17, fontWeight: 700, color: '#1e3a5f' },
  blurb: { fontSize: 13, color: '#94a3b8', marginBottom: 14, marginLeft: 40 },
  point: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13.5, color: '#374151', padding: '5px 0' },
  notListed: { textAlign: 'center', marginTop: 56, padding: '32px 24px', background: '#f0f4ff', borderRadius: 16 },
};

export default function Industries() {
  return (
    <>
      <section style={s.hero}>
        <div className="container">
          <span className="eyebrow">USE CASES</span>
          <h1 style={s.h1}>One platform, every trade that dispatches technicians</h1>
          <p style={s.sub}>
            FieldPilot isn't built for one industry — it's built around what every field service
            business actually needs: track customers, assets, jobs, and the people doing the work.
            Here's how different trades use it.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="industries-grid">
            {INDUSTRIES.map((ind) => (
              <div className="feature-card" key={ind.name}>
                <div style={s.cardHead}>
                  <span style={s.icon}>{ind.icon}</span>
                  <span style={s.name}>{ind.name}</span>
                </div>
                <div style={s.blurb}>{ind.blurb}</div>
                {ind.points.map((p) => (
                  <div style={s.point} key={p}>
                    <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={s.notListed}>
            <h3 style={{ fontSize: 19, fontWeight: 700, color: '#1e3a5f', marginBottom: 8 }}>
              Don't see your trade?
            </h3>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 18 }}>
              If your business sends people to job sites and needs to track who did what, where,
              and for whom — FieldPilot fits. Talk to us about your specific workflow.
            </p>
            <a href={SIGNUP_URL} className="btn btn-primary btn-lg">Start Free Trial</a>
          </div>
        </div>
      </section>
    </>
  );
}
