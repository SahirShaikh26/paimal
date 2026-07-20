import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';
import colors from '../theme';
import { PaimalWordmark } from '../components/PaimalMark';

const s = {
  page:    { position:'relative', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:colors.bg, padding:'20px 16px', overflow:'hidden' },
  card:    { position:'relative', zIndex:1, background:colors.white, borderRadius:18, padding:40, width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(32,28,22,.14)', border:`1px solid ${colors.border}` },
  logo:    { display:'flex', justifyContent:'center', marginBottom:10 },
  sub:     { textAlign:'center', color:colors.textMuted, fontSize:14, marginBottom:6 },
  tagline: { textAlign:'center', color:colors.accent, fontSize:14, fontWeight:600, marginBottom:30 },
  label:   { display:'block', fontSize:13, fontWeight:600, color:colors.text, marginBottom:6 },
  input:   { width:'100%', padding:'10px 12px', border:`1px solid ${colors.borderInput}`, borderRadius:8, fontSize:14, outline:'none', marginBottom:16, boxSizing:'border-box' },
  btn:     { width:'100%', padding:12, background:colors.navy, color:colors.white, border:'none', borderRadius:8, fontSize:15, fontWeight:600, cursor:'pointer', marginTop:4 },
  link:    { textAlign:'center', marginTop:20, fontSize:13, color:colors.textMuted },
  linkBtn: { color:colors.blue, fontWeight:600, cursor:'pointer', background:'none', border:'none', fontSize:13, padding:0 },
  divider: { textAlign:'center', color:colors.textFaint, fontSize:12, margin:'8px 0' },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(searchParams.get('mode') === 'register' ? 'register' : 'login');
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/register-tenant', {
        company_name: companyName,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        admin_name: adminName,
        admin_email: regEmail,
        password: regPassword,
      });
      toast.success('Company registered! Please log in.');
      setEmail(regEmail);
      setPassword('');
      setMode('login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const authBg = (
    <div className="pm-authbg" aria-hidden="true">
      <span className="orb o1" />
      <span className="orb o2" />
      <div className="glyph" />
    </div>
  );

  if (mode === 'register') {
    return (
      <div style={s.page}>
        {authBg}
        <div style={s.card}>
          <div style={s.logo}><PaimalWordmark size={44} fontSize={28} drawIn /></div>
          <div style={{ ...s.sub, marginBottom: 30 }}>Register your company</div>
          <form onSubmit={handleRegister}>
            <label style={s.label}>Company Name</label>
            <input style={s.input} value={companyName} onChange={e => setCompanyName(e.target.value)} required placeholder="Acme Field Services" />
            <label style={s.label}>Company Slug <span style={{color:colors.textFaint,fontWeight:400}}>(short ID, e.g. acme)</span></label>
            <input style={s.input} value={slug} onChange={e => setSlug(e.target.value)} required placeholder="acme" pattern="[a-zA-Z0-9-]+" />
            <label style={s.label}>Your Name</label>
            <input style={s.input} value={adminName} onChange={e => setAdminName(e.target.value)} required placeholder="John Smith" />
            <label style={s.label}>Admin Email</label>
            <input style={s.input} type="email" autoComplete="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required placeholder="john@acme.com" />
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" autoComplete="new-password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required placeholder="Min 8 characters" minLength={8} />
            <button style={s.btn} type="submit" disabled={loading}>
              {loading ? 'Registering…' : 'Create Account'}
            </button>
          </form>
          <div style={s.link}>
            Already have an account?{' '}
            <button style={s.linkBtn} onClick={() => setMode('login')}>Sign in</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {authBg}
      <div style={s.card}>
        <div style={s.logo}><PaimalWordmark size={44} fontSize={28} /></div>
        <div style={s.sub}>Field Service Management</div>
        <div style={s.tagline}>Kaam ka gyaan ho, sahi pehchaan ho!</div>
        <form onSubmit={handleLogin}>
          <label style={s.label}>Email</label>
          <input style={s.input} type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" />
          <label style={s.label}>Password</label>
          <input style={s.input} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <div style={s.link}>
          New to Paimal?{' '}
          <button style={s.linkBtn} onClick={() => setMode('register')}>Register your company</button>
        </div>
      </div>
    </div>
  );
}
