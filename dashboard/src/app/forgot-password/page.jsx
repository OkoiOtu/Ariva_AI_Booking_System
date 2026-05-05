'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import '@/styles/auth.css';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.includes('@')) { setError('Enter a valid email address'); return; }
    setLoading(true); setError('');
    try {
      await api('/auth/request-password-reset', {
        method: 'POST',
        body:   JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
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
          <div className="auth-nav-logo-icon">✈</div>
          Ariva
        </Link>
      </nav>

      <div className="auth-body">
        <div className="auth-wrap">
          <div className="auth-card">
            {sent ? (
              <div className="auth-state">
                <span className="auth-state-icon">📬</span>
                <h1 className="auth-state-title">Check your inbox</h1>
                <p className="auth-state-body">
                  If an account exists for <strong>{email}</strong>, we sent a password reset link.
                  Check your spam folder too.
                </p>
                <Link href="/login" className="auth-btn auth-btn-primary" style={{ display: 'flex', marginTop: 0 }}>
                  Back to sign in
                </Link>
              </div>
            ) : (
              <>
                <div className="auth-header">
                  <h1 className="auth-title">Reset your password</h1>
                  <p className="auth-subtitle">We'll send a reset link to your email address.</p>
                </div>

                {error && <div className="auth-alert auth-alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                  <div className="auth-field">
                    <label className="auth-label">Email address</label>
                    <input
                      type="email"
                      className="auth-input"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                    />
                  </div>
                  <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
                    {loading && <span className="auth-btn-spinner" />}
                    {loading ? 'Sending…' : 'Send reset link →'}
                  </button>
                </form>

                <div className="auth-links-center">
                  <span className="auth-muted">
                    Remember your password? <Link href="/login">Sign in</Link>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
