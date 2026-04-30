'use client';
import { useState, FormEvent } from 'react';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(email, password);
      window.location.href = '/';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'var(--accent-bg)', border: '1.5px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--accent)' }}>shield</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}>
            Ariva <span style={{ color: 'var(--accent)' }}>Admin</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>Platform Administration Console</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '28px 32px',
        }}>
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 20 }}>Sign in to Admin</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Email address</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="author@ariva.ai"
                style={{ width: '100%', padding: '9px 12px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Password</label>
              <input
                type="password" required value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', padding: '9px 12px' }}
              />
            </div>

            {error && (
              <div style={{
                background: 'var(--red-bg)', border: '0.5px solid var(--red)',
                borderRadius: 'var(--radius)', padding: '10px 12px',
                fontSize: 12, color: 'var(--red)',
              }}>{error}</div>
            )}

            <button type="submit" className="primary" disabled={loading} style={{ width: '100%', padding: '10px', marginTop: 4 }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginTop: 20 }}>
          Invite-only · Author accounts only
        </p>
      </div>
    </div>
  );
}
