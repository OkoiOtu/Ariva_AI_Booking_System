'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

const PAGE_STYLE = { minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'DM Sans, sans-serif', display:'flex', flexDirection:'column' };
const GRID_BG    = { position:'fixed', inset:0, zIndex:0, pointerEvents:'none', backgroundImage:'linear-gradient(rgba(108,99,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(108,99,255,0.04) 1px,transparent 1px)', backgroundSize:'60px 60px' };
const GLOW       = { position:'fixed', width:400, height:400, borderRadius:'50%', background:'rgba(108,99,255,0.14)', filter:'blur(80px)', top:'10%', left:'50%', transform:'translateX(-50%)', pointerEvents:'none', zIndex:0 };

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token        = searchParams.get('token');

  const [status, setStatus] = useState('verifying'); // verifying | success | error

  useEffect(() => {
    if (!token) { setStatus('error'); return; }

    api(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async res => {
        if (res.ok) setStatus('success');
        else        setStatus('error');
      })
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');`}</style>
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
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:16, padding:'48px 36px', textAlign:'center' }}>

              {status === 'verifying' && (
                <>
                  <div style={{ width:44, height:44, border:'3px solid rgba(255,255,255,0.1)', borderTop:'3px solid #6c63ff', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 20px' }} />
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  <p style={{ fontSize:15, color:'rgba(255,255,255,0.6)' }}>Verifying your email...</p>
                </>
              )}

              {status === 'success' && (
                <>
                  <div style={{ fontSize:52, marginBottom:18 }}>✅</div>
                  <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:24, fontWeight:700, marginBottom:12 }}>Email verified!</h1>
                  <p style={{ fontSize:14, color:'rgba(255,255,255,0.5)', lineHeight:1.7, marginBottom:32 }}>
                    Your email has been verified successfully. You can now sign in to your Ariva dashboard.
                  </p>
                  <Link href="/login" style={{ display:'block', padding:'13px', borderRadius:10, fontSize:15, fontWeight:500, textAlign:'center', background:'#6c63ff', color:'#fff', textDecoration:'none' }}>
                    Sign in to dashboard →
                  </Link>
                </>
              )}

              {status === 'error' && (
                <>
                  <div style={{ fontSize:52, marginBottom:18 }}>❌</div>
                  <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:700, marginBottom:12 }}>Verification failed</h1>
                  <p style={{ fontSize:14, color:'rgba(255,255,255,0.5)', lineHeight:1.7, marginBottom:28 }}>
                    The verification link is invalid or has expired. Links expire after 24 hours.
                  </p>
                  <Link href="/signup" style={{ display:'block', padding:'13px', borderRadius:10, fontSize:15, fontWeight:500, textAlign:'center', background:'#6c63ff', color:'#fff', textDecoration:'none', marginBottom:12 }}>
                    Sign up again
                  </Link>
                  <Link href="/login" style={{ display:'block', fontSize:13, color:'#a78bfa', textDecoration:'none' }}>
                    Already verified? Sign in
                  </Link>
                </>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
