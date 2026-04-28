'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { checkPasswordStrength } from '@/lib/auth';
import { api } from '@/lib/api';

const PAGE_STYLE = { minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'DM Sans, sans-serif', display:'flex', flexDirection:'column' };
const GRID_BG    = { position:'fixed', inset:0, zIndex:0, pointerEvents:'none', backgroundImage:'linear-gradient(rgba(108,99,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(108,99,255,0.04) 1px,transparent 1px)', backgroundSize:'60px 60px' };
const GLOW       = { position:'fixed', width:400, height:400, borderRadius:'50%', background:'rgba(108,99,255,0.14)', filter:'blur(80px)', top:'10%', left:'50%', transform:'translateX(-50%)', pointerEvents:'none', zIndex:0 };

function PasswordStrengthBar({ password }) {
  const { score, label, color, tips } = checkPasswordStrength(password);
  if (!password) return null;
  return (
    <div style={{ marginTop:8 }}>
      <div style={{ display:'flex', gap:4, marginBottom:5 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex:1, height:3, borderRadius:10, background: i <= score ? color : 'rgba(255,255,255,0.1)', transition:'background 0.3s' }} />
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, color, fontWeight:500 }}>{label}</span>
        {tips[0] && <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>{tips[0]}</span>}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get('token');

  const [pass,     setPass]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (!token) setError('Invalid or missing reset token. Please request a new reset link.');
  }, [token]);

  const strength = checkPasswordStrength(pass);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token) return;
    if (pass.length < 8)    { setError('Password must be at least 8 characters');   return; }
    if (strength.score < 2) { setError('Password is too weak — ' + (strength.tips[0] ?? 'choose a stronger one')); return; }
    if (pass !== confirm)   { setError('Passwords do not match');                   return; }

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

              {done ? (
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
                  <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:700, marginBottom:12 }}>Password updated!</h1>
                  <p style={{ fontSize:14, color:'rgba(255,255,255,0.5)', lineHeight:1.7, marginBottom:28 }}>
                    Your password has been changed successfully. You can now sign in with your new password.
                  </p>
                  <Link href="/login" style={{ display:'block', padding:'13px', borderRadius:10, fontSize:15, fontWeight:500, textAlign:'center', background:'#6c63ff', color:'#fff', textDecoration:'none' }}>
                    Sign in →
                  </Link>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom:28 }}>
                    <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:700, marginBottom:6 }}>Set new password</h1>
                    <p style={{ fontSize:14, color:'rgba(255,255,255,0.4)' }}>Choose a strong password for your account.</p>
                  </div>

                  {error && (
                    <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:8, padding:'10px 14px', marginBottom:18 }}>
                      <p style={{ fontSize:13, color:'#fca5a5' }}>{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom:16 }}>
                      <label style={{ display:'block', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.7)', marginBottom:6 }}>New password</label>
                      <input
                        type="password" value={pass} onChange={e => setPass(e.target.value)}
                        placeholder="Min. 8 characters" required
                        style={{ width:'100%', padding:'11px 14px', borderRadius:10, fontSize:14, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', outline:'none', fontFamily:'DM Sans, sans-serif' }}
                        onFocus={e => e.target.style.borderColor='rgba(108,99,255,0.6)'}
                        onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.12)'}
                      />
                      <PasswordStrengthBar password={pass} />
                    </div>

                    <div style={{ marginBottom:18 }}>
                      <label style={{ display:'block', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.7)', marginBottom:6 }}>Confirm new password</label>
                      <input
                        type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                        placeholder="Repeat your password" required
                        style={{ width:'100%', padding:'11px 14px', borderRadius:10, fontSize:14, background:'rgba(255,255,255,0.06)', border:`1px solid ${confirm && pass !== confirm ? '#f87171' : 'rgba(255,255,255,0.12)'}`, color:'#fff', outline:'none', fontFamily:'DM Sans, sans-serif' }}
                        onFocus={e => e.target.style.borderColor='rgba(108,99,255,0.6)'}
                        onBlur={e  => e.target.style.borderColor= confirm && pass !== confirm ? '#f87171' : 'rgba(255,255,255,0.12)'}
                      />
                      {confirm && pass !== confirm && <p style={{ fontSize:12, color:'#f87171', marginTop:4 }}>Passwords do not match</p>}
                    </div>

                    <button type="submit" disabled={loading || !token} style={{
                      width:'100%', padding:'13px', borderRadius:10, fontSize:15, fontWeight:500,
                      fontFamily:'DM Sans, sans-serif', textAlign:'center',
                      background: loading || !token ? 'rgba(108,99,255,0.4)' : '#6c63ff',
                      border:'none', color:'#fff', cursor: loading || !token ? 'not-allowed' : 'pointer',
                      transition:'all 0.2s', marginTop:4,
                    }}>
                      {loading ? 'Updating...' : 'Update password →'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
