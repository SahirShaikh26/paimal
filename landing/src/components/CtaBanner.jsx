import { SIGNUP_URL } from '../config';
import Icon from './Icon';
import Reveal from './Reveal';
import Watermark from './Watermark';

export default function CtaBanner() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <Reveal as="div" className="cta-banner">
        <div className="glyph-field gf-dark" aria-hidden="true" />
        <span className="cta-orb c1" aria-hidden="true" />
        <span className="cta-orb c2" aria-hidden="true" />
        <Watermark size={230} color="#F6A62A" opacity={0.12} style={{ bottom: '-60px', right: '-30px' }} />
        <h2>Ready to run your whole operation from one screen?</h2>
        <p>Start your free 14-day trial today — live the same day, no credit card required.</p>
        <a href={SIGNUP_URL} className="btn btn-glow btn-lg">Start Free Trial <Icon name="arrow" /></a>
      </Reveal>
    </section>
  );
}
