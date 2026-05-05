'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useCompany } from '@/lib/companyContext';
import { api } from '@/lib/api';

const NGN_PRICE = 49000; // ₦49,000 — canonical price

const PLAN_FEATURES = [
  'Unlimited bookings',
  'Driver management',
  'Revenue tracking + CSV exports',
  'Pricing rules engine',
  'Up to 10 team members',
  'SMS reminders and admin alerts',
  'Priority support',
];

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const plan         = searchParams.get('plan') ?? 'professional';
  const { user }     = useAuth();
  const { company }  = useCompany();

  const [usdAmount, setUsdAmount] = useState(null); // informational only
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  // Fetch USD equivalent for info display only — payment is always NGN
  useEffect(() => {
    api('/payments/rate')
      .then(r => r.json())
      .then(d => { if (d.usdPerNgn) setUsdAmount(Math.ceil(NGN_PRICE * d.usdPerNgn)); })
      .catch(() => {});
  }, []);

  const displayPrice = `₦${NGN_PRICE.toLocaleString('en-NG')}`;

  async function handlePay() {
    if (!user?.email || !company?.id) {
      setError('Please sign in to your dashboard before upgrading.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res  = await api('/payments/initialize', {
        method:  'POST',
        body:    JSON.stringify({ plan, companyId: company.id, email: user.email, currency: 'NGN' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to initialize payment.');
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (plan !== 'professional') {
    return (
      <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'DM Sans, sans-serif' }}>
        <div style={{ textAlign:'center' }}>
          <p style={{ fontSize:18, marginBottom:16 }}>Invalid plan selected.</p>
          <Link href="/plans" style={{ color:'#a78bfa' }}>View available plans →</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .co-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }
        .co-header { padding: 18px 32px; }
        .co-body   { padding: 40px 20px; }
        @media (max-width: 660px) {
          .co-grid   { grid-template-columns: 1fr; }
          .co-header { padding: 14px 18px; }
          .co-body   { padding: 24px 16px; }
        }
      `}</style>

      <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'DM Sans, sans-serif', display:'flex', flexDirection:'column' }}>
        <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', backgroundImage:'linear-gradient(rgba(108,99,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(108,99,255,0.04) 1px,transparent 1px)', backgroundSize:'60px 60px' }} />
        <div style={{ position:'fixed', width:400, height:400, borderRadius:'50%', background:'rgba(108,99,255,0.14)', filter:'blur(80px)', top:'10%', left:'50%', transform:'translateX(-50%)', pointerEvents:'none', zIndex:0 }} />

        {/* Header */}
        <div className="co-header" style={{ borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative', zIndex:1 }}>
          <Link href="/" style={{ display:'flex', alignItems:'center', gap:8, fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:20, color:'#fff', textDecoration:'none' }}>
            <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#6c63ff,#a78bfa)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>🚗</div>
            Arrival
          </Link>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:13, color:'rgba(255,255,255,0.3)' }}>Secure checkout</span>
            <span style={{ fontSize:16 }}>🔒</span>
          </div>
        </div>

        {/* Body */}
        <div className="co-body" style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', zIndex:1 }}>
          <div style={{ width:'100%', maxWidth:860 }}>
            <div className="co-grid">

              {/* Left — order summary */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:16, padding:'28px 24px' }}>
                <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:18 }}>Order summary</p>

                <div style={{ marginBottom:20, paddingBottom:20, borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <p style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:700 }}>Arrival Professional</p>
                      <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginTop:3 }}>per month</p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <p style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:700 }}>{displayPrice}</p>
                      {usdAmount && (
                        <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:2 }}>≈ ${usdAmount} USD</p>
                      )}
                    </div>
                  </div>
                </div>

                <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:9, marginBottom:20 }}>
                  {PLAN_FEATURES.map(f => (
                    <li key={f} style={{ fontSize:13, display:'flex', gap:8, color:'rgba(255,255,255,0.7)' }}>
                      <span style={{ color:'#34d399', fontWeight:700 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>

                {company && (
                  <div style={{ background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:8, padding:'10px 14px' }}>
                    <p style={{ fontSize:12, color:'#34d399' }}>Activating for: <strong>{company.name}</strong></p>
                  </div>
                )}
              </div>

              {/* Right — payment */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:16, padding:'28px 24px' }}>
                <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:18 }}>Payment details</p>

                {/* Price summary */}
                <div style={{ marginBottom:20, padding:'14px 16px', borderRadius:10, background:'rgba(108,99,255,0.08)', border:'1px solid rgba(108,99,255,0.2)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <p style={{ fontSize:13, color:'rgba(255,255,255,0.6)' }}>Amount due</p>
                    <p style={{ fontFamily:'Syne, sans-serif', fontSize:20, fontWeight:700 }}>₦{NGN_PRICE.toLocaleString()}</p>
                  </div>
                  {usdAmount && (
                    <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:4, textAlign:'right' }}>≈ ${usdAmount} USD at current rate</p>
                  )}
                </div>

                {/* Billing email */}
                <div style={{ marginBottom:20 }}>
                  <label style={{ display:'block', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.7)', marginBottom:8 }}>Billing email</label>
                  <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', fontSize:14, color:'rgba(255,255,255,0.6)' }}>
                    {user?.email ?? 'Sign in to continue'}
                  </div>
                </div>

                <div style={{ background:'rgba(108,99,255,0.08)', border:'1px solid rgba(108,99,255,0.2)', borderRadius:8, padding:'12px 14px', marginBottom:20 }}>
                  <p style={{ fontSize:12, color:'rgba(255,255,255,0.6)', lineHeight:1.6 }}>
                    You'll be redirected to <strong style={{ color:'#fff' }}>Paystack</strong> to pay securely. We accept cards, bank transfer, and USSD.
                  </p>
                </div>

                {error && (
                  <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:8, padding:'10px 14px', marginBottom:14 }}>
                    <p style={{ fontSize:13, color:'#fca5a5' }}>{error}</p>
                  </div>
                )}

                <button
                  onClick={handlePay}
                  disabled={loading || !user}
                  style={{
                    width:'100%', padding:'14px', borderRadius:10, fontSize:15, fontWeight:600,
                    fontFamily:'DM Sans, sans-serif', textAlign:'center', border:'none', color:'#fff',
                    cursor: (!user || loading) ? 'not-allowed' : 'pointer', transition:'all 0.2s',
                    background: (!user || loading) ? 'rgba(108,99,255,0.4)' : '#6c63ff',
                    marginBottom:10,
                  }}
                >
                  {loading ? 'Redirecting to Paystack...' : `Pay ${displayPrice} →`}
                </button>

                <p style={{ fontSize:11, color:'rgba(255,255,255,0.2)', textAlign:'center' }}>
                  Secured by Paystack · Cancel anytime
                </p>

                {!user && (
                  <p style={{ textAlign:'center', marginTop:12, fontSize:13, color:'rgba(255,255,255,0.4)' }}>
                    <Link href="/login" style={{ color:'#a78bfa', textDecoration:'none' }}>Sign in</Link> to your dashboard first
                  </p>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
