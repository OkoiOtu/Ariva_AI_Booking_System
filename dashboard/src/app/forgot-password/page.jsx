'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

const PAGE_STYLE = { minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'DM Sans, sans-serif', display:'flex', flexDirection:'column' };
const GRID_BG    = { position:'fixed', inset:0, zIndex:0, pointerEvents:'none', backgroundImage:'linear-gradient(rgba(108,99,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(108,99,255,0.04) 1px,transparent 1px)', backgroundSize:'60px 60px' };
const GLOW       = { position:'fixed', width:400, height:400, borderRadius:'50%', background:'rgba(108,99,255,0.14)', filter:'blur(80px)', top:'10%', left:'50%', transform:'translateX(-50%)', pointerEvents:'none', zIndex:0 };

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
      // Backend always returns 200 regardless of whether email exists
      // (to prevent email enumeration attacks)
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap'); input::placeholder{color:rgba(255,255,255,0.25)!important} input{color-scheme:dark}`}</style>
      <div style={PAGE_STYLE}>
        <div style={GRID_BG} />
        <div style={GLOW} />

        <div style={{ padding:'18px 32px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', position:'relative', zIndex:1 }}>
          <Link href="/" style={{ display:'flex', alignItems:'center', gap:8, fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:20, color:'#fff', textDecoration:'none' }}>
            <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#6c63ff,#a78bfa)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🚗</div>
            Ariva
          </Link>
        </div>

        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px', position:'relative', zIndex:1 }}>
          <div style={{ width:'100%', maxWidth:420 }}>
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:16, padding:'40px 36px' }}>

              {sent ? (
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>📬</div>
                  <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:700, marginBottom:12 }}>Check your inbox</h1>
                  <p style={{ fontSize:14, color:'rgba(255,255,255,0.5)', lineHeight:1.7, marginBottom:28 }}>
                    If an account exists for <strong style={{ color:'rgba(255,255,255,0.8)' }}>{email}</strong>, we sent a password reset link. Check your spam folder too.
                  </p>
                  <Link href="/login" style={{ display:'block', width:'100%', padding:'13px', borderRadius:10, fontSize:15, fontWeight:500, textAlign:'center', background:'#6c63ff', color:'#fff', textDecoration:'none' }}>
                    Back to sign in
                  </Link>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom:28 }}>
                    <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:700, marginBottom:6 }}>Reset your password</h1>
                    <p style={{ fontSize:14, color:'rgba(255,255,255,0.4)' }}>We&apos;ll send you a reset link by email.</p>
                  </div>

                  {error && (
                    <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:8, padding:'10px 14px', marginBottom:18 }}>
                      <p style={{ fontSize:13, color:'#fca5a5' }}>{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom:18 }}>
                      <label style={{ display:'block', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.7)', marginBottom:6 }}>Email address</label>
                      <input
                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="you@company.com" required
                        style={{ width:'100%', padding:'11px 14px', borderRadius:10, fontSize:14, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', outline:'none', fontFamily:'DM Sans, sans-serif' }}
                        onFocus={e => e.target.style.borderColor='rgba(108,99,255,0.6)'}
                        onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.12)'}
                      />
                    </div>

                    <button type="submit" disabled={loading} style={{
                      width:'100%', padding:'13px', borderRadius:10, fontSize:15, fontWeight:500,
                      fontFamily:'DM Sans, sans-serif', textAlign:'center',
                      background: loading ? 'rgba(108,99,255,0.4)' : '#6c63ff',
                      border:'none', color:'#fff', cursor: loading ? 'not-allowed' : 'pointer',
                      transition:'all 0.2s', marginTop:4,
                    }}>
                      {loading ? 'Sending...' : 'Send reset link →'}
                    </button>
                  </form>

                  <p style={{ textAlign:'center', fontSize:13, color:'rgba(255,255,255,0.3)', marginTop:22 }}>
                    Remember your password? <Link href="/login" style={{ color:'#a78bfa', textDecoration:'none' }}>Sign in</Link>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
