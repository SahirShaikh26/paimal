import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONTACT_EMAIL, LOGIN_URL, SIGNUP_URL } from '../config';
import PaimalLogo from './PaimalLogo';

export default function Footer() {
  // Starts at the build year (so the prerendered markup matches), then corrects
  // itself on the client — otherwise the year would freeze until the next deploy.
  const [year, setYear] = useState(__BUILD_YEAR__);
  useEffect(() => setYear(new Date().getFullYear()), []);

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <PaimalLogo />
          <div className="footer-links">
            <a href="/#features">Features</a>
            <Link to="/industries">Industries</Link>
            <a href="/#pricing">Pricing</a>
            <a href={LOGIN_URL}>Log In</a>
            <a href={SIGNUP_URL}>Start Free Trial</a>
            <a href="/privacy.html">Privacy Policy</a>
            <a href="/terms.html">Terms</a>
            <a href={`mailto:${CONTACT_EMAIL}`}>Contact</a>
          </div>
        </div>
        <div className="footer-bottom">© {year} Paimal by SRS Associates · Field service management software · <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'inherit' }}>{CONTACT_EMAIL}</a></div>
      </div>
    </footer>
  );
}
