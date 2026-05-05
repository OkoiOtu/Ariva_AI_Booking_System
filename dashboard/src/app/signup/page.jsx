'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, checkPasswordStrength } from '@/lib/auth';
import { api } from '@/lib/api';
import '@/styles/auth.css';

/* ─── Password strength bar ───────────────────────────────────────────────── */
function PasswordStrengthBar({ password }) {
  const { score, label, color, tips } = checkPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="auth-strength">
      <div className="auth-strength-track">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="auth-strength-seg"
            style={{ background: i <= score ? color : 'rgba(255,255,255,0.1)' }} />
        ))}
      </div>
      <div className="auth-strength-meta">
        <span className="auth-strength-label" style={{ color }}>{label}</span>
        {tips[0] && <span className="auth-strength-tip">{tips[0]}</span>}
      </div>
    </div>
  );
}

/* ─── Method selector ─────────────────────────────────────────────────────── */
function MethodSelect({ onEmail, onGoogle, googleLoading, googleError }) {
  return (
    <>
      <div className="auth-header">
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start your free Arrival trial — no credit card required.</p>
      </div>

      {googleError && <div className="auth-alert auth-alert-error">{googleError}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <button
          className="auth-btn auth-btn-google"
          onClick={onGoogle}
          disabled={googleLoading}
          type="button"
        >
          {googleLoading ? (
            <span className="auth-spinner" style={{ width: 18, height: 18, borderWidth: 2, margin: 0 }} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          Continue with Google
        </button>
      </div>

      <div className="auth-divider">
        <span>or</span>
      </div>

      <button className="auth-btn auth-btn-secondary" onClick={onEmail} type="button" style={{ marginTop: 0 }}>
        Sign up with email
      </button>

      <div className="auth-links-center" style={{ marginTop: 22 }}>
        <span className="auth-muted">
          Already have an account? <Link href="/login">Sign in</Link>
        </span>
      </div>
    </>
  );
}

/* ─── Email signup form ───────────────────────────────────────────────────── */
function EmailForm({ onBack, onSuccess }) {
  const [name,     setName]     = useState('');
  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [pass,     setPass]     = useState('');
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [globalError, setGlobalError] = useState('');

  const [emailChecking,    setEmailChecking]    = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);

  const strength = checkPasswordStrength(pass);

  async function checkEmail() {
    if (!email.includes('@')) return;
    setEmailChecking(true);
    try {
      const res  = await api(`/auth/check-email?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      if (json.exists) setErrors(p => ({ ...p, email: 'This email is already registered.' }));
    } catch {}
    finally { setEmailChecking(false); }
  }

  async function checkUsername() {
    const u = username.trim();
    if (!u || u.length < 3) return;
    setUsernameChecking(true);
    try {
      const res  = await api(`/auth/check-username?username=${encodeURIComponent(u)}`);
      const json = await res.json();
      if (json.exists) setErrors(p => ({ ...p, username: 'This username is already taken.' }));
    } catch {}
    finally { setUsernameChecking(false); }
  }

  function handleUsername(v) {
    // only allow letters, numbers, underscores, hyphens
    const clean = v.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setUsername(clean);
    if (errors.username) setErrors(p => ({ ...p, username: '' }));
  }

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!name.trim())                   errs.name     = 'Full name is required';
    if (!username.trim())               errs.username = 'Username is required';
    else if (username.length < 3)       errs.username = 'Username must be at least 3 characters';
    else if (errors.username)           errs.username = errors.username;
    if (!email.includes('@'))           errs.email    = 'Enter a valid email address';
    else if (errors.email)              errs.email    = errors.email;
    if (pass.length < 8)                errs.pass     = 'Password must be at least 8 characters';
    if (strength.score < 2)             errs.pass     = 'Password is too weak — ' + (strength.tips[0] ?? 'choose a stronger one');
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true); setGlobalError('');
    try {
      const res  = await api('/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, username, email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Registration failed.');
      onSuccess(email);
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="auth-header">
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start your free Arrival trial</p>
      </div>

      {globalError && <div className="auth-alert auth-alert-error">{globalError}</div>}

      <form onSubmit={submit}>
        {/* Full name */}
        <div className="auth-field">
          <label className="auth-label">Full name <span className="auth-label-required">*</span></label>
          <input className={`auth-input${errors.name ? ' auth-input-err' : ''}`}
            value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
          {errors.name && <p className="auth-field-error">{errors.name}</p>}
        </div>

        {/* Username */}
        <div className="auth-field">
          <label className="auth-label">Username <span className="auth-label-required">*</span></label>
          <input className={`auth-input${errors.username ? ' auth-input-err' : ''}`}
            value={username}
            onChange={e => handleUsername(e.target.value)}
            onBlur={checkUsername}
            placeholder="yourname (letters, numbers, _ -)"
            autoComplete="username"
          />
          {errors.username
            ? <p className="auth-field-error">{errors.username}</p>
            : usernameChecking
              ? <p className="auth-helper">Checking availability…</p>
              : username.length >= 3 && <p className="auth-helper">@{username}</p>
          }
        </div>

        {/* Email */}
        <div className="auth-field">
          <label className="auth-label">Email address <span className="auth-label-required">*</span></label>
          <input type="email" className={`auth-input${errors.email ? ' auth-input-err' : ''}`}
            value={email}
            onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: '' })); }}
            onBlur={checkEmail}
            placeholder="you@company.com"
          />
          {errors.email
            ? <p className="auth-field-error">{errors.email}</p>
            : emailChecking && <p className="auth-helper">Checking availability…</p>
          }
        </div>

        {/* Password */}
        <div className="auth-field">
          <label className="auth-label">Password <span className="auth-label-required">*</span></label>
          <input type="password" className={`auth-input${errors.pass ? ' auth-input-err' : ''}`}
            value={pass} onChange={e => setPass(e.target.value)} placeholder="Create a strong password" />
          <PasswordStrengthBar password={pass} />
          {errors.pass && <p className="auth-field-error">{errors.pass}</p>}
        </div>

        <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
          {loading && <span className="auth-btn-spinner" />}
          {loading ? 'Creating account…' : 'Create account →'}
        </button>
      </form>

      <button type="button" className="auth-btn auth-btn-secondary" onClick={onBack} style={{ marginTop: 10 }}>
        ← Back
      </button>
    </>
  );
}

/* ─── Verification waiting screen ─────────────────────────────────────────── */
function VerifyScreen({ email, onResend }) {
  const [resent, setResent] = useState(false);

  async function handleResend() {
    await onResend();
    setResent(true);
    setTimeout(() => setResent(false), 5000);
  }

  return (
    <div className="auth-state">
      <span className="auth-state-icon"><span className="material-symbols-outlined">mail</span></span>
      <h2 className="auth-state-title">Check your inbox</h2>
      <p className="auth-state-body">
        We sent a verification link to<br />
        <strong>{email}</strong><br />
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
          Click the link to verify, then sign in to continue setup.
        </span>
      </p>
      <Link href="/login" className="auth-btn auth-btn-primary" style={{ display: 'flex', marginTop: 0 }}>
        Go to sign in →
      </Link>
      <div className="auth-resend-row" style={{ marginTop: 18 }}>
        <button className={`auth-btn-link${resent ? ' auth-btn-link-green' : ''}`} onClick={handleResend}>
          {resent ? <><span className="material-symbols-outlined" style={{ fontSize: 15, verticalAlign: 'middle', marginRight: 4 }}>check</span>Resent!</> : "Didn't get it? Resend"}
        </button>
      </div>
      <p className="auth-helper" style={{ textAlign: 'center', marginTop: 10 }}>
        Check your spam folder if you don't see it within 2 minutes.
      </p>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function SignupPage() {
  const { loginWithGoogle } = useAuth();
  const router              = useRouter();

  const [view,          setView]         = useState('method'); // method | email | verify
  const [verifyEmail,   setVerifyEmail]  = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError,   setGoogleError]   = useState('');

  async function handleGoogle() {
    setGoogleLoading(true); setGoogleError('');
    try {
      await loginWithGoogle();
      router.replace('/onboarding');
    } catch (err) {
      setGoogleError(err.message ?? 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function resendVerification() {
    await api('/auth/resend-verification', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: verifyEmail }),
    });
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <nav className="auth-nav">
        <Link href="/" className="auth-nav-logo">
          <div className="auth-nav-logo-icon"><span className="material-symbols-outlined">flight_takeoff</span></div>
          Arrival
        </Link>
        <span className="auth-nav-right">
          Have an account? <Link href="/login">Sign in</Link>
        </span>
      </nav>

      <div className="auth-body">
        <div className="auth-wrap">
          <div className="auth-card">
            {view === 'method' && (
              <MethodSelect
                onEmail={() => setView('email')}
                onGoogle={handleGoogle}
                googleLoading={googleLoading}
                googleError={googleError}
              />
            )}
            {view === 'email' && (
              <EmailForm
                onBack={() => setView('method')}
                onSuccess={email => { setVerifyEmail(email); setView('verify'); }}
              />
            )}
            {view === 'verify' && (
              <VerifyScreen email={verifyEmail} onResend={resendVerification} />
            )}
          </div>

          {view !== 'verify' && (
            <p className="auth-legal">
              By signing up you agree to our Terms of Service and Privacy Policy.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
