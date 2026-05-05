'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { logEvent } from '@/lib/activityLog';
import '@/styles/auth.css';

const MAX_ATTEMPTS_1 = 5;
const LOCKOUT_1_MS   = 15 * 60 * 1000;
const MAX_ATTEMPTS_2 = 2;
const LOCKOUT_2_MS   = 30 * 60 * 1000;

function getLockoutState(email) {
  if (typeof window === 'undefined') return null;
  try { const r = localStorage.getItem(`login_attempts_${email}`); return r ? JSON.parse(r) : null; } catch { return null; }
}
function setLockoutState(email, state) { localStorage.setItem(`login_attempts_${email}`, JSON.stringify(state)); }
function clearLockoutState(email) { localStorage.removeItem(`login_attempts_${email}`); }

function checkLockout(email) {
  const state = getLockoutState(email);
  if (!state) return { locked: false, attempts: 0 };
  const now = Date.now();
  if (state.lockedUntil && now < state.lockedUntil) {
    const remaining = Math.ceil((state.lockedUntil - now) / 60000);
    return { locked: true, remaining, attempts: state.attempts };
  }
  if (state.lockedUntil && now >= state.lockedUntil) {
    setLockoutState(email, { ...state, lockedUntil: null });
    return { locked: false, attempts: state.attempts };
  }
  return { locked: false, attempts: state.attempts ?? 0 };
}

function recordFailedAttempt(email) {
  const state    = getLockoutState(email) ?? { attempts: 0, tier: 1 };
  const attempts = (state.attempts ?? 0) + 1;
  const tier     = state.tier ?? 1;
  let lockedUntil = null, newTier = tier;
  if (tier === 1 && attempts >= MAX_ATTEMPTS_1)                          { lockedUntil = Date.now() + LOCKOUT_1_MS; newTier = 2; }
  else if (tier === 2 && attempts >= MAX_ATTEMPTS_1 + MAX_ATTEMPTS_2)   { lockedUntil = Date.now() + LOCKOUT_2_MS; newTier = 2; }
  setLockoutState(email, { attempts, lockedUntil, tier: newTier });
  return { attempts, lockedUntil, tier: newTier };
}

function formatTime(ms) { const m = Math.ceil(ms / 60000); return `${m} minute${m !== 1 ? 's' : ''}`; }

export default function LoginPage() {
  const { login } = useAuth();
  const router    = useRouter();

  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [lockInfo,  setLockInfo]  = useState(null);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!lockInfo?.lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = lockInfo.lockedUntil - Date.now();
      if (remaining <= 0) { setLockInfo(null); setError(''); clearInterval(interval); }
      else {
        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setCountdown(`${m}:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockInfo]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const { locked, remaining } = checkLockout(email);
    if (locked) { setError(`Too many failed attempts. Try again in ${remaining} minute${remaining !== 1 ? 's' : ''}.`); return; }

    setLoading(true);
    try {
      await login(email, password);
      clearLockoutState(email);
      router.replace('/dashboard');
    } catch (err) {
      if (err.message === 'AUTHOR')    { setError('Author accounts are not permitted here. Use the Ariva Admin portal.'); setLoading(false); return; }
      if (err.message === 'SUSPENDED') { setError('This account has been suspended. Please contact your administrator.'); setLoading(false); return; }
      if (err.message === 'UNVERIFIED'){ setError('Please verify your email before signing in. Check your inbox.'); setLoading(false); return; }

      await logEvent('login_failed', email, `Failed login attempt for ${email}`);
      const result = recordFailedAttempt(email);
      if (result.lockedUntil) {
        const duration = result.tier === 2 && result.attempts >= MAX_ATTEMPTS_1 + MAX_ATTEMPTS_2 ? LOCKOUT_2_MS : LOCKOUT_1_MS;
        setLockInfo({ lockedUntil: result.lockedUntil });
        setError(`Too many failed attempts. Account locked for ${formatTime(duration)}.`);
        await logEvent('login_locked', email, `Account locked for ${formatTime(duration)}: ${email}`);
      } else {
        const rem = result.tier === 1 ? MAX_ATTEMPTS_1 - result.attempts : MAX_ATTEMPTS_2 - (result.attempts - MAX_ATTEMPTS_1);
        setError(`Invalid email or password. ${rem} attempt${rem !== 1 ? 's' : ''} remaining.`);
      }
    } finally {
      setLoading(false);
    }
  }

  const isLocked = lockInfo && lockInfo.lockedUntil > Date.now();

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <nav className="auth-nav">
        <Link href="/" className="auth-nav-logo">
          <div className="auth-nav-logo-icon"><i className="fa-solid fa-paper-plane" /></div>
          Ariva
        </Link>
        <span className="auth-nav-right">
          No account? <Link href="/signup">Sign up free</Link>
        </span>
      </nav>

      <div className="auth-body">
        <div className="auth-wrap">
          <div className="auth-card">
            <div className="auth-header">
              <h1 className="auth-title">Welcome back</h1>
              <p className="auth-subtitle">Sign in to your Ariva dashboard</p>
            </div>

            {error && (
              <div className="auth-alert auth-alert-error">
                {error}
                {isLocked && countdown && (
                  <div className="auth-lockout-timer">Unlocks in: {countdown}</div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="auth-field">
                <label className="auth-label">Email address</label>
                <input
                  type="email"
                  className={`auth-input${isLocked ? ' auth-input-err' : ''}`}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  disabled={isLocked}
                />
              </div>

              <div className="auth-field">
                <label className="auth-label">Password</label>
                <input
                  type="password"
                  className="auth-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  disabled={isLocked}
                />
              </div>

              <button
                type="submit"
                className="auth-btn auth-btn-primary"
                disabled={loading || isLocked}
              >
                {loading && <span className="auth-btn-spinner" />}
                {loading ? 'Signing in…' : isLocked ? <><i className="fa-solid fa-lock" style={{ marginRight: 6 }} />Account locked</> : 'Sign in →'}
              </button>
            </form>

            <div className="auth-links-row" style={{ marginTop: 22 }}>
              <Link href="/forgot-password" className="auth-muted" style={{ fontSize: 13 }}>
                Forgot password?
              </Link>
              <Link href="/signup" className="auth-btn-link">
                Create account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
