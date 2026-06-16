import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';

const s = {
  page:    { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f0f4ff', padding:'20px 16px' },
  card:    { background:'#fff', borderRadius:12, padding:40, width:'100%', maxWidth:420, boxShadow:'0 4px 24px rgba(0,0,0,.1)' },
  logo:    { textAlign:'center', fontSize:28, fontWeight:800, color:'#1e3a5f', marginBottom:8 },
  sub:     { textAlign:'center', color:'#64748b', fontSize:14, marginBottom:32 },
  label:   { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 },
  input:   { width:'100%', padding:'10px 12px', border:'1px solid #d1d5db', borderRadius:8, fontSize:14, outline:'none', marginBottom:16, boxSizing:'border-box' },
  btn:     { width:'100%', padding:12, background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:600, cursor:'pointer', marginTop:4 },
  link:    { textAlign:'center', marginTop:20, fontSize:13, color:'#64748b' },
  linkBtn: { color:'#2563eb', fontWeight:600, cursor:'pointer', background:'none', border:'none', fontSize:13, padding:0 },
  divider: { textAlign:'center', color:'#94a3b8', fontSize:12, margin:'8px 0' },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
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

  if (mode === 'register') {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.logo}>⚡ FieldPilot</div>
          <div style={s.sub}>Register your company</div>
          <form onSubmit={handleRegister}>
            <label style={s.label}>Company Name</label>
            <input style={s.input} value={companyName} onChange={e => setCompanyName(e.target.value)} required placeholder="Acme Field Services" />
            <label style={s.label}>Company Slug <span style={{color:'#94a3b8',fontWeight:400}}>(short ID, e.g. acme)</span></label>
            <input style={s.input} value={slug} onChange={e => setSlug(e.target.value)} required placeholder="acme" pattern="[a-zA-Z0-9-]+" />
            <label style={s.label}>Your Name</label>
            <input style={s.input} value={adminName} onChange={e => setAdminName(e.target.value)} required placeholder="John Smith" />
            <label style={s.label}>Admin Email</label>
            <input style={s.input} type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required placeholder="john@acme.com" />
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required placeholder="Min 8 characters" minLength={8} />
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
      <div style={s.card}>
        <div style={s.logo}>⚡ FieldPilot</div>
        <div style={s.sub}>Field Service Management</div>
        <form onSubmit={handleLogin}>
          <label style={s.label}>Email</label>
          <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" />
          <label style={s.label}>Password</label>
          <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <div style={s.link}>
          New to FieldPilot?{' '}
          <button style={s.linkBtn} onClick={() => setMode('register')}>Register your company</button>
        </div>
      </div>
    </div>
  );
}
