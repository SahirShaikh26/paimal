import { useState } from 'react';
import Icon from './Icon';
import Reveal from './Reveal';

const STEPS = [
  {
    n: 1, time: '~1 min', title: 'Create your company',
    desc: 'Sign up, name your company, and you have a live workspace. No installation, no server, no IT team.',
    cap: 'New workspace ready',
    pane: [
      { avatar: 'A', main: 'Acme Field Services', k: 'workspace created', pill: 'Live', green: true },
      { avatar: '+', main: 'Invite managers & engineers', k: 'by email or link', pill: 'Step 2' },
    ],
  },
  {
    n: 2, time: '~10 min', title: 'Add your team, customers & assets',
    desc: 'Invite your people, import customers and machines from a spreadsheet, and set who can see what. Bulk CSV import means no manual typing.',
    cap: 'Bulk import',
    pane: [
      { avatar: 'CSV', main: 'customers.csv', k: '184 records', pill: 'Imported', green: true },
      { avatar: 'U', main: '12 engineers · 3 managers', k: 'roles assigned', pill: 'Ready' },
      { avatar: 'M', main: '340 machines linked', k: 'with warranty dates', pill: 'Synced' },
    ],
  },
  {
    n: 3, time: 'Daily', title: 'Assign & schedule work',
    desc: 'Dispatch engineers to jobs, and set recurring contracts (weekly, monthly, quarterly) that schedule themselves. Everyone sees today’s jobs the moment they open the app.',
    cap: 'Today’s schedule',
    pane: [
      { avatar: 'R', main: 'Rajesh — AC service, Andheri', k: '10:00 AM', pill: 'Assigned' },
      { avatar: 'P', main: 'Priya — Pest control (monthly)', k: 'auto-scheduled', pill: 'Recurring' },
      { avatar: 'S', main: 'Sameer — Panel install', k: '2:30 PM', pill: 'Assigned' },
    ],
  },
  {
    n: 4, time: 'In the field', title: 'Your team logs from anywhere',
    desc: 'Engineers log activity, snap before/after photos, and dictate notes by voice in their own language — even with no signal. Everything syncs the moment they’re back online.',
    cap: 'Live from the field',
    pane: [
      { avatar: 'R', main: 'Service completed + 2 photos', k: 'voice note · Hindi', pill: 'Synced', green: true },
      { avatar: '📶', main: 'Logged offline in basement', k: 'queued', pill: 'Will sync' },
      { avatar: 'P', main: 'Check-in at customer site', k: 'GPS verified', pill: 'On site' },
    ],
  },
  {
    n: 5, time: 'One tap', title: 'Get reports & get paid',
    desc: 'A one-tap AI digest summarises the day, flags recurring faults, and drafts a customer update. Turn the work into an invoice and collect by UPI or card — all in the same place.',
    cap: 'AI digest & billing',
    pane: [
      { avatar: 'AI', main: '12 visits · 3 warranty jobs · hours up 8%', k: 'plain-English summary', pill: 'Generated', green: true },
      { avatar: '⚠', main: 'Chiller Unit 1 — 3 faults / 30 days', k: 'anomaly flagged', pill: 'Review' },
      { avatar: '₹', main: 'Invoice ₹48,000 sent', k: 'UPI payment link', pill: 'Paid', green: true },
    ],
  },
];

const SETUP = [
  { ic: 'rocket', h: 'Live the same day', p: 'Sign up and start assigning work in minutes. Nothing to install or host.' },
  { ic: 'cloud', h: 'Import, don’t retype', p: 'Bring customers, machines and team in from a spreadsheet with one CSV upload.' },
  { ic: 'shield', h: 'No training week', p: 'If your team can use WhatsApp, they can use Paimal. The mobile app is that simple.' },
];

export default function HowItWorks() {
  const [active, setActive] = useState(0);
  const step = STEPS[active];

  return (
    <section className="section hiw-band has-ambient" id="how-it-works">
      <div className="glyph-field gf-light" aria-hidden="true" />
      <div className="container">
        <Reveal className="section-head">
          <span className="eyebrow"><span className="dot" /> How it works</span>
          <h2>From sign-up to getting paid — in five steps</h2>
          <p>Click through the flow. This is the whole loop a field business runs on, in one place.</p>
        </Reveal>

        <div className="hiw">
          <div className="hiw-steps" role="tablist" aria-label="How Paimal works">
            {STEPS.map((s, i) => (
              <button
                key={s.n}
                className={`hiw-step${i === active ? ' active' : ''}`}
                onClick={() => setActive(i)}
                role="tab"
                aria-selected={i === active}
              >
                <span className="hiw-num">{s.n}</span>
                <span>
                  <span className="time">{s.time}</span>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </span>
              </button>
            ))}
          </div>

          <div className="hiw-visual">
            <div className="hiw-pane" key={active}>
              <div className="cap">{step.cap}</div>
              {step.pane.map((row) => (
                <div className="hiw-glass" key={row.main}>
                  <span className="hiw-avatar">{row.avatar}</span>
                  <span>
                    <div>{row.main}</div>
                    <div className="k">{row.k}</div>
                  </span>
                  <span className={`pill${row.green ? ' green' : ''}`}>{row.pill}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="setup-band">
          {SETUP.map((it) => (
            <Reveal as="div" className="setup-item" key={it.h}>
              <span className="si-ic"><Icon name={it.ic} size={22} /></span>
              <span>
                <h4>{it.h}</h4>
                <p>{it.p}</p>
              </span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
