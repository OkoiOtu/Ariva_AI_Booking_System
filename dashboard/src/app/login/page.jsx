'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { logEvent } from '@/lib/activityLog';

const MAX_ATTEMPTS_1  = 5;   // lockout after 5 fails
const LOCKOUT_1_MS    = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS_2  = 2;   // lockout after 2 more fails
const LOCKOUT_2_MS    = 30 * 60 * 1000; // 30 minutes

function getLockoutState(email) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`login_attempts_${email}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setLockoutState(email, state) {
  localStorage.setItem(`login_attempts_${email}`, JSON.stringify(state));
}

function clearLockoutState(email) {
  localStorage.removeItem(`login_attempts_${email}`);
}

function checkLockout(email) {
  const state = getLockoutState(email);
  if (!state) return { locked: false, attempts: 0 };

  const now = Date.now();

  if (state.lockedUntil && now < state.lockedUntil) {
    const remaining = Math.ceil((state.lockedUntil - now) / 60000);
    return { locked: true, remaining, attempts: state.attempts };
  }

  // Lockout expired — clear it
  if (state.lockedUntil && now >= state.lockedUntil) {
    // Keep attempt count to enable second-tier lockout
    const updated = { ...state, lockedUntil: null };
    setLockoutState(email, updated);
    return { locked: false, attempts: state.attempts };
  }

  return { locked: false, attempts: state.attempts ?? 0 };
}

function recordFailedAttempt(email) {
  const state = getLockoutState(email) ?? { attempts: 0, tier: 1 };
  const attempts = (state.attempts ?? 0) + 1;
  const tier = state.tier ?? 1;

  let lockedUntil = null;
  let newTier = tier;

  if (tier === 1 && attempts >= MAX_ATTEMPTS_1) {
    lockedUntil = Date.now() + LOCKOUT_1_MS;
    newTier = 2;
  } else if (tier === 2 && attempts >= MAX_ATTEMPTS_1 + MAX_ATTEMPTS_2) {
    lockedUntil = Date.now() + LOCKOUT_2_MS;
    newTier = 2;
  }

  setLockoutState(email, { attempts, lockedUntil, tier: newTier });
  return { attempts, lockedUntil, tier: newTier };
}

function formatTime(ms) {
  const mins = Math.ceil(ms / 60000);
  return `${mins} minute${mins !== 1 ? 's' : ''}`;
}

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [lockInfo, setLockInfo] = useState(null);
  const [countdown, setCountdown] = useState('');

  // Update countdown every second when locked
  useEffect(() => {
    if (!lockInfo?.lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = lockInfo.lockedUntil - Date.now();
      if (remaining <= 0) {
        setLockInfo(null);
        setError('');
        clearInterval(interval);
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setCountdown(`${mins}:${secs.toString().padStart(2,'0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockInfo]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const { locked, remaining } = checkLockout(email);
    if (locked) {
      setError(`Too many failed attempts. Try again in ${remaining} minute${remaining !== 1 ? 's' : ''}.`);
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      clearLockoutState(email);
      router.replace('/dashboard');
    } catch (err) {
      if (err.message === 'AUTHOR') {
        setError('Author accounts are not permitted on this dashboard. Please use the Ariva Admin portal.');
        setLoading(false);
        return;
      }
      // Suspended users get a clear message, no lockout counter
      if (err.message === 'SUSPENDED') {
        setError('This account has been suspended. Please contact your administrator.');
        setLoading(false);
        return;
      }
      if (err.message === 'UNVERIFIED') {
        setError('Please verify your email before signing in. Check your inbox for the verification link.');
        setLoading(false);
        return;
      }
      // Log failed attempt
      await logEvent(
        'login_failed',
        email,
        `Failed login attempt for ${email}`
      );
      const result = recordFailedAttempt(email);

      if (result.lockedUntil) {
        const duration = result.tier === 2 && result.attempts >= MAX_ATTEMPTS_1 + MAX_ATTEMPTS_2
          ? LOCKOUT_2_MS : LOCKOUT_1_MS;
        setLockInfo({ lockedUntil: result.lockedUntil });
        setError(`Too many failed attempts. Account locked for ${formatTime(duration)}.`);
        await logEvent(
          'login_locked',
          email,
          `Account locked for ${formatTime(duration)} after too many failed attempts: ${email}`
        );
      } else {
        const remaining = result.tier === 1
          ? MAX_ATTEMPTS_1 - result.attempts
          : MAX_ATTEMPTS_2 - (result.attempts - MAX_ATTEMPTS_1);
        setError(`Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
      }
    } finally {
      setLoading(false);
    }
  }

  const isLocked = lockInfo && lockInfo.lockedUntil > Date.now();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
        .lp-login-input { background: rgba(255,255,255,0.06) !important; border: 1px solid rgba(255,255,255,0.12) !important; color: #fff !important; border-radius: 10px !important; padding: 11px 14px !important; font-family: 'DM Sans', sans-serif !important; font-size: 14px !important; transition: border-color 0.2s; }
        .lp-login-input:focus { border-color: rgba(108,99,255,0.6) !important; outline: none !important; }
        .lp-login-input::placeholder { color: rgba(255,255,255,0.25) !important; }
        .lp-login-input:disabled { opacity: 0.5; }
      `}</style>

      <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'DM Sans, sans-serif', display:'flex', flexDirection:'column' }}>

        {/* Grid bg */}
        <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', backgroundImage:'linear-gradient(rgba(108,99,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(108,99,255,0.04) 1px,transparent 1px)', backgroundSize:'60px 60px' }} />

        {/* Glow orb */}
        <div style={{ position:'fixed', width:400, height:400, borderRadius:'50%', background:'rgba(108,99,255,0.14)', filter:'blur(80px)', top:'10%', left:'50%', transform:'translateX(-50%)', pointerEvents:'none', zIndex:0 }} />

        {/* Top bar */}
        <div style={{ padding:'18px 32px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', position:'relative', zIndex:1 }}>
          <a href="/" style={{ display:'flex', alignItems:'center', gap:8, fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:20, color:'#fff', textDecoration:'none' }}>
            <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#6c63ff,#a78bfa)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🚗</div>
            Ariva
          </a>
        </div>

        {/* Form */}
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px', position:'relative', zIndex:1 }}>
          <div style={{ width:'100%', maxWidth:420 }}>

            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:16, padding:'40px 36px' }}>
              <div style={{ marginBottom:30 }}>
                <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:24, fontWeight:700, marginBottom:6 }}>Welcome back</h1>
                <p style={{ fontSize:14, color:'rgba(255,255,255,0.4)' }}>Sign in to your Ariva dashboard</p>
              </div>

              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div>
                  <label style={{ display:'block', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.7)', marginBottom:6 }}>Email address</label>
                  <input
                    type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    required disabled={isLocked}
                    placeholder="you@company.com"
                    className="lp-login-input"
                    style={{ width:'100%' }}
                  />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.7)', marginBottom:6 }}>Password</label>
                  <input
                    type="password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    required disabled={isLocked}
                    placeholder="Your password"
                    className="lp-login-input"
                    style={{ width:'100%' }}
                  />
                </div>

                {error && (
                  <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:8, padding:'10px 14px' }}>
                    <p style={{ fontSize:13, color:'#fca5a5', lineHeight:1.5 }}>{error}</p>
                    {isLocked && countdown && (
                      <p style={{ marginTop:4, fontWeight:600, fontFamily:'monospace', fontSize:13, color:'#fca5a5' }}>
                        Unlocks in: {countdown}
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || isLocked}
                  style={{
                    marginTop:4, padding:'13px', textAlign:'center',
                    background: isLocked ? 'rgba(255,255,255,0.06)' : '#6c63ff',
                    color: isLocked ? 'rgba(255,255,255,0.35)' : '#fff',
                    border: isLocked ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    borderRadius:10, fontSize:15, fontWeight:500,
                    fontFamily:'DM Sans, sans-serif', textAlign:'center',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    transition:'all 0.2s',
                  }}
                >
                  {loading ? 'Signing in...' : isLocked ? 'Account locked' : 'Sign in →'}
                </button>
              </form>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:22 }}>
                <a href="/forgot-password" style={{ fontSize:13, color:'rgba(255,255,255,0.4)', textDecoration:'none' }}>
                  Forgot password?
                </a>
                <a href="/signup" style={{ fontSize:13, color:'#a78bfa', textDecoration:'none' }}>
                  Create account
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
