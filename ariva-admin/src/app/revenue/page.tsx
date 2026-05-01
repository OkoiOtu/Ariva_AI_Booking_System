'use client';
import { useEffect, useState } from 'react';
import { getAllBookings, getAllCompanies, getAllPayments } from '@/lib/api';
import { useCurrency } from '@/lib/currencyContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

const TOOLTIP_STYLE = { background: '#1a1b22', border: '0.5px solid var(--border)', borderRadius: 8, fontSize: 12 };

export default function RevenuePage() {
  const [bookings,  setBookings]  = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [payments,  setPayments]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const { fmt, currency } = useCurrency();

  useEffect(() => {
    Promise.all([getAllBookings(), getAllCompanies(), getAllPayments()])
      .then(([b, c, p]) => { setBookings(b); setCompanies(c); setPayments(p); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: 'var(--muted)', padding: 40, textAlign: 'center' }}>Loading revenue data...</p>;

  const paidPayments    = payments.filter(p => p.status === 'paid');
  const platformRevenue = paidPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalGmv        = bookings.reduce((s, b) => s + (Number(b.price) || 0), 0);
  const now             = new Date();
  const thisMonth       = startOfMonth(now);
  const mrrPayments     = paidPayments.filter(p => parseISO(p.paid_at || p.created) >= thisMonth);
  const mrr             = mrrPayments.reduce((s, p) => s + (p.amount || 0), 0);

  // Monthly platform revenue (subscription payments — stored in NGN)
  const revMonthly = Array.from({ length: 12 }, (_, i) => {
    const month = subMonths(now, 11 - i);
    const rev   = paidPayments
      .filter(p => isWithinInterval(parseISO(p.paid_at || p.created), { start: startOfMonth(month), end: endOfMonth(month) }))
      .reduce((s, p) => s + (p.amount || 0), 0);
    return { month: format(month, 'MMM'), revenue: rev };
  });

  // GMV per company
  const gmvByCompany = companies.map(c => {
    const cb = bookings.filter((b: any) => b.company_id === c.id);
    return {
      name:     c.name,
      plan:     c.plan,
      bookings: cb.length,
      gmv:      cb.reduce((s: number, b: any) => s + (Number(b.price) || 0), 0),
    };
  }).sort((a, b) => b.gmv - a.gmv);

  // Monthly GMV
  const gmvMonthly = Array.from({ length: 12 }, (_, i) => {
    const month = subMonths(now, 11 - i);
    const gmv   = bookings
      .filter((b: any) => isWithinInterval(parseISO(b.created), { start: startOfMonth(month), end: endOfMonth(month) }))
      .reduce((s, b) => s + (Number(b.price) || 0), 0);
    return { month: format(month, 'MMM'), gmv };
  });

  // By plan
  const byPlan: Record<string, number> = { starter: 0, professional: 0, enterprise: 0 };
  paidPayments.forEach(p => { if (byPlan[p.plan] !== undefined) byPlan[p.plan] += p.amount || 0; });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Syne, sans-serif', marginBottom: 4 }}>Revenue</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Platform subscription revenue + operator GMV</p>
        </div>
        {currency !== 'NGN' && (
          <div style={{ fontSize: 12, color: 'var(--amber)', background: 'var(--amber-bg)', padding: '6px 12px', borderRadius: 8 }}>
            Displaying in {currency} — converted from NGN at live rate
          </div>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12, marginBottom: 28 }}>
        {[
          ['Platform Revenue', fmt(platformRevenue), 'var(--accent)', 'Total subscription payments'],
          ['MRR (this month)',  fmt(mrr),             'var(--green)',  'Paid this month'],
          ['Platform GMV',     fmt(totalGmv),         'var(--blue)',   'Total booking value processed'],
          ['Active Pro',       companies.filter(c => c.plan === 'professional' && c.active).length, 'var(--accent)', 'Paying subscribers'],
        ].map(([label, val, color, sub]) => (
          <div key={label as string} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', borderTop: `2px solid ${color}` }}>
            <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: color as string, lineHeight: 1 }}>{val}</p>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Section 1: Platform Revenue */}
      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>1. Platform Revenue (subscription income)</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px' }}>
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Monthly Subscription Revenue</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revMonthly}>
              <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [fmt(v), 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px' }}>
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Revenue by Plan</p>
          {Object.entries(byPlan).map(([plan, amount]) => (
            <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: plan === 'professional' ? 'var(--accent)' : plan === 'enterprise' ? 'var(--purple)' : 'var(--gray-bg)' }} />
                <p style={{ fontSize: 13, textTransform: 'capitalize' }}>{plan}</p>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{fmt(amount as number)}</p>
            </div>
          ))}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 13, fontWeight: 600 }}>Total</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{fmt(platformRevenue)}</p>
          </div>
        </div>
      </div>

      {/* Section 2: GMV */}
      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>2. Operator GMV (booking value processed)</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px' }}>
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Monthly GMV</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={gmvMonthly}>
              <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [fmt(v), 'GMV']} />
              <Bar dataKey="gmv" fill="var(--blue)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '0.5px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 500 }}>GMV by Company</p>
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {gmvByCompany.length === 0
              ? <p style={{ color: 'var(--muted)', padding: 24, textAlign: 'center', fontSize: 13 }}>No data yet</p>
              : gmvByCompany.map(c => (
                <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 18px', borderBottom: '0.5px solid var(--border)' }}>
                  <div>
                    <p style={{ fontSize: 13 }}>{c.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--muted)' }}>{c.bookings} bookings · {c.plan}</p>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)' }}>{fmt(c.gmv)}</p>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
