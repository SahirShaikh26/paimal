import { ANDROID_DOWNLOAD_URL, ANDROID_ON_PLAY_STORE, SIGNUP_URL } from '../config';
import Icon from './Icon';
import ColorIcon from './ColorIcon';
import Reveal from './Reveal';

const JOBS = [
  { dot: '#3F8F5B', jt: 'AC service — Andheri', js: '10:00 AM · Rajesh', badge: 'Now', bg: '#DCF0E6', fg: '#2E6E44' },
  { dot: '#E4881F', jt: 'Pest control — Powai', js: 'Monthly · auto', badge: 'Next', bg: '#FBEFD9', fg: '#C2740C' },
  { dot: '#2E6BE6', jt: 'Panel install — BKC', js: '2:30 PM · Sameer', badge: 'Later', bg: '#E6EDFC', fg: '#1E4FBF' },
];

const POINTS = [
  { icon: 'cloud', h: 'Built for real field conditions', p: 'Logs, photos and check-ins keep working with no signal — everything syncs the moment they’re back online.' },
  { icon: 'mic', h: 'Dictate in their own language', p: 'Engineers speak their notes in any of 9 Indian languages instead of typing on a tiny keyboard.' },
  { icon: 'mobile', h: 'Light enough for any Android', p: 'Fast to load and easy to use on the basic phones your field team actually carries.' },
];

export default function PhoneShowcase() {
  return (
    <section className="section showcase has-ambient" id="mobile-app">
      <div className="ambient" aria-hidden="true"><span className="a1" /><span className="a2" /></div>
      <div className="container showcase-grid">
        <Reveal className="phone-wrap">
          <div className="phone float">
            <div className="phone-screen">
              <div className="ps-top">
                <div className="t1">TODAY · 6 JOBS</div>
                <div className="t2">Good morning, Rajesh</div>
              </div>
              <div className="ps-body">
                {JOBS.map((j) => (
                  <div className="ps-job" key={j.jt}>
                    <span className="ps-dot" style={{ background: j.dot }} />
                    <span>
                      <div className="jt">{j.jt}</div>
                      <div className="js">{j.js}</div>
                    </span>
                    <span className="jbadge" style={{ background: j.bg, color: j.fg }}>{j.badge}</span>
                  </div>
                ))}
              </div>
              <div className="ps-mic"><Icon name="mic" size={16} /> Dictate note</div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <span className="eyebrow"><span className="dot" /> In every engineer’s pocket</span>
          <h2 style={{ fontSize: 34, fontWeight: 800, color: '#201C16', letterSpacing: '-.02em', margin: '14px 0 6px' }}>
            The field app your team will actually use
          </h2>
          <p style={{ fontSize: 15.5, color: '#8B8375', lineHeight: 1.7, maxWidth: 460 }}>
            Managers plan on the web; engineers work from a phone. The Paimal app shows each person
            their day the moment they open it — and gets out of the way.
          </p>
          <div className="showcase-points">
            {POINTS.map((pt) => (
              <div className="showcase-point" key={pt.h}>
                <span className="sp-ic"><ColorIcon name={pt.icon} size={30} /></span>
                <span>
                  <h4>{pt.h}</h4>
                  <p>{pt.p}</p>
                </span>
              </div>
            ))}
          </div>
          <div className="showcase-cta">
            <a href={SIGNUP_URL} className="btn btn-glow btn-lg">Start Free Trial <Icon name="arrow" /></a>
            <a
              href={ANDROID_DOWNLOAD_URL}
              className="btn btn-ghost btn-lg"
              {...(ANDROID_ON_PLAY_STORE ? { target: '_blank', rel: 'noopener' } : { download: true })}
            >
              <Icon name="android" /> Download for Android
            </a>
          </div>
          <p className="showcase-note">
            {ANDROID_ON_PLAY_STORE
              ? 'Free on Google Play. Sign in with your Paimal account.'
              : 'Android APK · sign in with your Paimal account. Your phone will ask you to allow installs from your browser — that’s expected for apps downloaded outside the Play Store.'}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
