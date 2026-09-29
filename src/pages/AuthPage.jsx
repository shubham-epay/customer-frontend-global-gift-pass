import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage, fieldErrors } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { GiftIcon } from '../components/Icons';

/** Sign in (mode="login") and create account (mode="register"). */
export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { login, register, isAuthed } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', rememberMe: true });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthed) return <Navigate to={from} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({}); setError('');
    try {
      if (isLogin) await login({ email: form.email, password: form.password, rememberMe: form.rememberMe });
      else await register({ name: form.name, email: form.email, phone: form.phone || undefined, password: form.password });
      navigate(from, { replace: true });
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="auth">
      <div className="auth__art">
        <GiftIcon width={48} height={48} />
        <h2>Give moments, not things.</h2>
        <p>Save favourites, track orders and find every voucher you’ve bought or received in one place.</p>
      </div>
      <form className="auth__form card" onSubmit={submit} noValidate>
        <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
        <p className="muted">{isLogin ? 'Sign in to continue' : 'It takes less than a minute'}</p>
        {error && <div className="alert">{error}</div>}
        {!isLogin && (
          <label className="field"><span>Full name</span>
            <input value={form.name} onChange={set('name')} required maxLength={120} autoComplete="name" />
            {errors.name && <small className="error">{errors.name}</small>}
          </label>
        )}
        <label className="field"><span>Email</span>
          <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
          {errors.email && <small className="error">{errors.email}</small>}
        </label>
        {!isLogin && (
          <label className="field"><span>Phone (optional)</span>
            <input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
            {errors.phone && <small className="error">{errors.phone}</small>}
          </label>
        )}
        <label className="field"><span>Password</span>
          <input type="password" value={form.password} onChange={set('password')} required autoComplete={isLogin ? 'current-password' : 'new-password'} />
          {errors.password && <small className="error">{errors.password}</small>}
          {!isLogin && <small className="muted">At least 8 characters, with a letter and a number.</small>}
        </label>
        {isLogin && <label className="check"><input type="checkbox" checked={form.rememberMe} onChange={set('rememberMe')} />Keep me signed in</label>}
        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}</button>
        <p className="center small">
          {isLogin ? <>New here? <Link to="/register" state={location.state}>Create an account</Link></>
            : <>Already have an account? <Link to="/login" state={location.state}>Sign in</Link></>}
        </p>
      </form>
    </div>
  );
}
