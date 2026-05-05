'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import '@/styles/auth.css';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token        = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // verifying | success | error

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    api(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async res => { setStatus(res.ok ? 'success' : 'error'); })
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <nav className="auth-nav">
        <Link href="/" className="auth-nav-logo">
          <div className="auth-nav-logo-icon"><span className="material-symbols-outlined">flight_takeoff</span></div>
          Ariva
        </Link>
      </nav>

      <div className="auth-body">
        <div className="auth-wrap">
          <div className="auth-card">

            {status === 'verifying' && (
              <div className="auth-state">
                <div className="auth-spinner" />
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)' }}>Verifying your email…</p>
              </div>
            )}

            {status === 'success' && (
              <div className="auth-state">
                <span className="auth-state-icon" style={{ color: '#10B981' }}><span className="material-symbols-outlined">check_circle</span></span>
                <h1 className="auth-state-title">Email verified!</h1>
                <p className="auth-state-body">
                  Your email has been verified successfully. You can now sign in to your Ariva dashboard.
                </p>
                <Link href="/login" className="auth-btn auth-btn-primary" style={{ display: 'flex', marginTop: 0 }}>
                  Sign in to dashboard →
                </Link>
              </div>
            )}

            {status === 'error' && (
              <div className="auth-state">
                <span className="auth-state-icon" style={{ color: '#EF4444' }}><span className="material-symbols-outlined">cancel</span></span>
                <h1 className="auth-state-title">Verification failed</h1>
                <p className="auth-state-body">
                  The verification link is invalid or has expired. Links expire after 24 hours.
                </p>
                <Link href="/signup" className="auth-btn auth-btn-primary" style={{ display: 'flex', marginTop: 0 }}>
                  Sign up again
                </Link>
                <Link href="/login" className="auth-btn auth-btn-link" style={{ marginTop: 14 }}>
                  Already verified? Sign in
                </Link>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
