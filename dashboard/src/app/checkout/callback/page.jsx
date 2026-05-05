'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { api } from '@/lib/api';

const PAGE_STYLE = { minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'DM Sans, sans-serif', display:'flex', flexDirection:'column' };
const GRID_BG    = { position:'fixed', inset:0, zIndex:0, pointerEvents:'none', backgroundImage:'linear-gradient(rgba(108,99,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(108,99,255,0.04) 1px,transparent 1px)', backgroundSize:'60px 60px' };
const GLOW       = { position:'fixed', width:400, height:400, borderRadius:'50%', background:'rgba(108,99,255,0.14)', filter:'blur(80px)', top:'10%', left:'50%', transform:'translateX(-50%)', pointerEvents:'none', zIndex:0 };

export default function CheckoutCallbackPage() {
  const searchParams = useSearchParams();
  const reference    = searchParams.get('reference') ?? searchParams.get('trxref');
  const [status,  setStatus]  = useState('verifying');
  const [payment, setPayment] = useState(null);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!reference) { setStatus('error'); setError('No payment reference found.'); return; }

    async function verify() {
      try {
        const res  = await api(`/payments/verify/${reference}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Verification failed');

        if (data.status === 'success') {
          setPayment(data);
          setStatus('success');
        } else {
          setStatus('failed');
          setError(`Payment status: ${data.status}. Please contact support if you were charged.`);
        }
      } catch (err) {
        setStatus('error');
        setError(err.message ?? 'Could not verify payment. Please contact support.');
      }
    }

    verify();
  }, [reference]);

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');`}</style>
      <div style={PAGE_STYLE}>
        <div style={GRID_BG} />
        <div style={GLOW} />

        {/* Header */}
        <div style={{ padding:'18px 32px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', position:'relative', zIndex:1 }}>
          <Link href="/" style={{ display:'flex', alignItems:'center', gap:8, fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:20, color:'#fff', textDecoration:'none' }}>
            <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#6c63ff,#a78bfa)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🚗</div>
            Arrival
          </Link>
        </div>

        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px', position:'relative', zIndex:1 }}>
          <div style={{ width:'100%', maxWidth:480 }}>
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:16, padding:'48px 36px', textAlign:'center' }}>

              {status === 'verifying' && (
                <>
                  <div style={{ width:48, height:48, border:'3px solid rgba(255,255,255,0.1)', borderTop:'3px solid #6c63ff', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 24px' }} />
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:700, marginBottom:8 }}>Verifying payment...</h2>
                  <p style={{ fontSize:14, color:'rgba(255,255,255,0.4)' }}>Please wait while we confirm your payment.</p>
                </>
              )}

              {status === 'success' && (
                <>
                  <div style={{ fontSize:56, marginBottom:20 }}>🎉</div>
                  <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:24, fontWeight:700, marginBottom:12 }}>Payment successful!</h2>
                  <p style={{ fontSize:15, color:'rgba(255,255,255,0.6)', lineHeight:1.7, marginBottom:8 }}>
                    Your plan has been upgraded to{' '}
                    <strong style={{ color:'#fff', textTransform:'capitalize' }}>{payment?.plan}</strong>.
                  </p>
                  <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:32 }}>
                    All features are now active on your dashboard.
                  </p>

                  {payment && (
                    <div style={{ background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:10, padding:'16px', marginBottom:28, textAlign:'left' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 16px' }}>
                        {[
                          ['Reference', payment.reference?.slice(-12)],
                          ['Amount',    `${payment.currency} ${Number(payment.amount).toLocaleString()}`],
                          ['Plan',      payment.plan],
                          ['Date',      payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' }) : 'Today'],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginBottom:2 }}>{label}</p>
                            <p style={{ fontSize:13, textTransform:'capitalize' }}>{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Link href="/dashboard" style={{
                    display:'block', padding:'13px', borderRadius:10, fontSize:15, fontWeight:500,
                    textAlign:'center', background:'#6c63ff', color:'#fff', textDecoration:'none',
                  }}>
                    Go to dashboard →
                  </Link>
                </>
              )}

              {(status === 'failed' || status === 'error') && (
                <>
                  <div style={{ fontSize:52, marginBottom:20 }}>❌</div>
                  <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:700, marginBottom:12 }}>Payment failed</h2>
                  <p style={{ fontSize:14, color:'rgba(255,255,255,0.5)', lineHeight:1.7, marginBottom:28 }}>
                    {error || 'Your payment could not be processed. You have not been charged.'}
                  </p>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <Link href={`/checkout?plan=professional`} style={{
                      display:'block', padding:'13px', borderRadius:10, fontSize:15, fontWeight:500,
                      textAlign:'center', background:'#6c63ff', color:'#fff', textDecoration:'none',
                    }}>
                      Try again →
                    </Link>
                    <a href="mailto:hello@arrival.ai" style={{ fontSize:13, color:'rgba(255,255,255,0.4)', textDecoration:'none' }}>
                      Contact support
                    </a>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
