import { Link } from 'react-router-dom';
import { LOGIN_URL, SIGNUP_URL } from '../config';
import PaimalLogo from './PaimalLogo';

export default function Footer() {
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
            <a href="mailto:hello@paimal.app">Contact</a>
          </div>
        </div>
        <div className="footer-bottom">© {new Date().getFullYear()} Paimal. All rights reserved.</div>
      </div>
    </footer>
  );
}
