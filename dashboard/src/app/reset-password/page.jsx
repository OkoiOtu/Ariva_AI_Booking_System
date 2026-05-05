'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { checkPasswordStrength } from '@/lib/auth';
import { api } from '@/lib/api';
import '@/styles/auth.css';

function PasswordStrengthBar({ password }) {
  const { score, label, color, tips } = checkPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="auth-strength">
      <div className="auth-strength-track">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="auth-strength-seg"
            style={{ background: i <= score ? color : 'rgba(255,255,255,0.1)' }}
          />
        ))}
      </div>
      <div className="auth-strength-meta">
        <span className="auth-strength-label" style={{ color }}>{label}</span>
        {tips[0] && <span className="auth-strength-tip">{tips[0]}</span>}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get('token');

  const [pass,    setPass]    = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!token) setError('Invalid or missing reset token. Please request a new reset link.');
  }, [token]);

  const strength = checkPasswordStrength(pass);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token)           return;
    if (pass.length < 8)  { setError('Password must be at least 8 characters'); return; }
    if (strength.score < 2){ setError('Password is too weak — ' + (strength.tips[0] ?? 'choose a stronger one')); return; }
    if (pass !== confirm)  { setError('Passwords do not match'); return; }

    setLoading(true); setError('');
    try {
      const res = await api('/auth/confirm-password-reset', {
        method: 'POST',
        body:   JSON.stringify({ token, password: pass, passwordConfirm: confirm }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Reset failed. The link may have expired.');
      }
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

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
      </nav>

      <div className="auth-body">
        <div className="auth-wrap">
          <div className="auth-card">
            {done ? (
              <div className="auth-state">
                <span className="auth-state-icon" style={{ color: '#10B981' }}><i className="fa-solid fa-circle-check" /></span>
                <h1 className="auth-state-title">Password updated!</h1>
                <p className="auth-state-body">
                  Your password has been changed successfully. You can now sign in with your new password.
                </p>
                <Link href="/login" className="auth-btn auth-btn-primary" style={{ display: 'flex', marginTop: 0 }}>
                  Sign in →
                </Link>
              </div>
            ) : (
              <>
                <div className="auth-header">
                  <h1 className="auth-title">Set new password</h1>
                  <p className="auth-subtitle">Choose a strong password for your account.</p>
                </div>

                {error && <div className="auth-alert auth-alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                  <div className="auth-field">
                    <label className="auth-label">New password</label>
                    <input
                      type="password"
                      className="auth-input"
                      value={pass}
                      onChange={e => setPass(e.target.value)}
                      placeholder="Min. 8 characters"
                      required
                    />
                    <PasswordStrengthBar password={pass} />
                  </div>

                  <div className="auth-field">
                    <label className="auth-label">Confirm new password</label>
                    <input
                      type="password"
                      className={`auth-input${confirm && pass !== confirm ? ' auth-input-err' : ''}`}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repeat your password"
                      required
                    />
                    {confirm && pass !== confirm && (
                      <p className="auth-field-error">Passwords do not match</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="auth-btn auth-btn-primary"
                    disabled={loading || !token}
                  >
                    {loading && <span className="auth-btn-spinner" />}
                    {loading ? 'Updating…' : 'Update password →'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
