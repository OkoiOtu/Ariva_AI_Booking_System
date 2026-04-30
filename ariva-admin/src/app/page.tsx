'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getAllCompanies, getAllBookings, getAllLeads, getAllCalls, getAllPayments } from '@/lib/api';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, subDays } from 'date-fns';

const PLAN_COLORS = { starter: 'var(--gray)', professional: 'var(--accent)', enterprise: 'var(--purple)' };

function StatCard({ label, value, sub, color, icon, badge }: {
  label: string; value: string | number; sub?: string;
  color?: string; icon?: string; badge?: string;
}) {
  return (
    <div style={{
      background: 'var(--surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '18px 20px',
      borderTop: `2px solid ${color ?? 'var(--accent)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        {icon && <span className="material-symbols-outlined" style={{ fontSize: 16, color: color ?? 'var(--accent)' }}>{icon}</span>}
      </div>
      <p style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: color ?? 'var(--text)', lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{sub}</p>}
      {badge && (
        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--green-bg)', color: 'var(--green)', fontWeight: 500, marginTop: 6, display: 'inline-block' }}>
          {badge}
        </span>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 20px 16px' }}>
      <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>{title}</p>
      {children}
    </div>
  );
}

const TOOLTIP_STYLE = { background: '#1a1b22', border: '0.5px solid var(--border)', borderRadius: 8, fontSize: 12 };

export default function OverviewPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [bookings,  setBookings]  = useState<any[]>([]);
  const [leads,     setLeads]     = useState<any[]>([]);
  const [calls,     setCalls]     = useState<any[]>([]);
  const [payments,  setPayments]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([getAllCompanies(), getAllBookings(), getAllLeads(), getAllCalls(), getAllPayments()])
      .then(([c, b, l, ca, p]) => {
        setCompanies(c); setBookings(b); setLeads(l); setCalls(ca); setPayments(p);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: 'var(--muted)', padding: 40, textAlign: 'center' }}>Loading platform data...</div>;

  // KPIs
  const byPlan = { starter: 0, professional: 0, enterprise: 0 };
  companies.forEach(c => { if ((byPlan as any)[c.plan] !== undefined) (byPlan as any)[c.plan]++; });
  const mrr = byPlan.professional * 49;
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const newThisMonth = companies.filter(c => parseISO(c.created) >= thisMonthStart).length;
  const activeBookings = bookings.filter(b => ['confirmed','on_trip'].includes(b.status)).length;
  const paidPayments = payments.filter(p => p.status === 'paid');
  const platformRevenue = paidPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const revenueLastMonth = paidPayments.filter(p => {
    const d = parseISO(p.paid_at || p.created);
    return isWithinInterval(d, { start: lastMonthStart, end: lastMonthEnd });
  }).reduce((s, p) => s + (p.amount || 0), 0);
  const revenueThisMonth = paidPayments.filter(p => parseISO(p.paid_at || p.created) >= thisMonthStart).reduce((s, p) => s + (p.amount || 0), 0);
  const revenueChange = revenueLastMonth > 0 ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100) : 0;
  const callConversionRate = calls.length > 0 ? Math.round((bookings.length / calls.length) * 100) : 0;
  const leadConversionRate = leads.length > 0 ? Math.round((leads.filter(l => l.status === 'converted').length / leads.length) * 100) : 0;

  // Company growth chart (last 12 months)
  const growthData = Array.from({ length: 12 }, (_, i) => {
    const month = subMonths(now, 11 - i);
    const label = format(month, 'MMM');
    const count = companies.filter(c => parseISO(c.created) <= endOfMonth(month)).length;
    return { month: label, companies: count };
  });

  // Plan distribution pie
  const pieData = [
    { name: 'Starter',      value: byPlan.starter,      color: 'rgba(255,255,255,0.35)' },
    { name: 'Professional', value: byPlan.professional,  color: '#f97316' },
    { name: 'Enterprise',   value: byPlan.enterprise,    color: '#a855f7' },
  ].filter(d => d.value > 0);

  // Bookings by month (last 12)
  const bookingChartData = Array.from({ length: 12 }, (_, i) => {
    const month = subMonths(now, 11 - i);
    const label = format(month, 'MMM');
    const inMonth = bookings.filter(b => {
      const d = parseISO(b.created);
      return isWithinInterval(d, { start: startOfMonth(month), end: endOfMonth(month) });
    });
    return {
      month: label,
      confirmed: inMonth.filter(b => b.status === 'confirmed').length,
      completed: inMonth.filter(b => b.status === 'completed').length,
      cancelled: inMonth.filter(b => b.status === 'cancelled').length,
    };
  });

  // Leads by month
  const leadsChartData = Array.from({ length: 12 }, (_, i) => {
    const month = subMonths(now, 11 - i);
    return {
      month: format(month, 'MMM'),
      leads: leads.filter(l => isWithinInterval(parseISO(l.created), { start: startOfMonth(month), end: endOfMonth(month) })).length,
    };
  });

  // Calls last 30 days
  const callsChartData = Array.from({ length: 30 }, (_, i) => {
    const day = subDays(now, 29 - i);
    const label = format(day, 'MMM d');
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const dayEnd   = new Date(dayStart.getTime() + 86400000);
    return {
      day: label,
      calls: calls.filter(c => { const d = parseISO(c.created); return d >= dayStart && d < dayEnd; }).length,
    };
  });

  // Revenue trend (last 12 months)
  const revChartData = Array.from({ length: 12 }, (_, i) => {
    const month = subMonths(now, 11 - i);
    const rev = paidPayments.filter(p => isWithinInterval(parseISO(p.paid_at || p.created), { start: startOfMonth(month), end: endOfMonth(month) })).reduce((s, p) => s + (p.amount || 0), 0);
    return { month: format(month, 'MMM'), revenue: rev };
  });

  // Alerts
  const thirtyDaysAgo = subDays(now, 30);
  const sevenDaysAgo  = subDays(now, 7);
  const starterOld = companies.filter(c => c.plan === 'starter' && parseISO(c.created) <= thirtyDaysAgo && c.active);
  const inactive   = companies.filter(c => c.active && !bookings.some(b => b.company_id === c.id && parseISO(b.created) >= sevenDaysAgo));
  const approaching = companies.filter(c => {
    if (c.plan !== 'starter') return false;
    const count = bookings.filter(b => b.company_id === c.id && parseISO(b.created) >= startOfMonth(now)).length;
    return count >= 40;
  });
  const failedPayments = payments.filter(p => p.status === 'failed' && parseISO(p.created) >= thirtyDaysAgo);

  const recentCompanies = [...companies].sort((a, b) => b.created > a.created ? 1 : -1).slice(0, 10);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>Platform Overview</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          {format(now, 'EEEE, MMMM d yyyy')} · All companies · All time
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard
          label="Total Companies" icon="domain"
          value={companies.length}
          badge={newThisMonth > 0 ? `+${newThisMonth} this month` : undefined}
          sub={`Starter ${byPlan.starter} · Pro ${byPlan.professional} · Ent ${byPlan.enterprise}`}
        />
        <StatCard
          label="MRR (USD)" icon="trending_up" color="var(--green)"
          value={`$${mrr.toLocaleString()}`}
          sub="Professional subscriptions only"
        />
        <StatCard
          label="Total Bookings" icon="calendar_month"
          value={bookings.length.toLocaleString()}
          sub={`${activeBookings} active now`}
        />
        <StatCard
          label="Total AI Calls" icon="call"
          value={calls.length.toLocaleString()}
          sub={`${callConversionRate}% became bookings`}
          color="var(--blue)"
        />
        <StatCard
          label="Total Leads" icon="people"
          value={leads.length.toLocaleString()}
          sub={`${leadConversionRate}% converted`}
          color="var(--amber)"
        />
        <StatCard
          label="Platform Revenue" icon="payments" color="var(--accent)"
          value={`$${platformRevenue.toLocaleString()}`}
          badge={revenueChange !== 0 ? `${revenueChange > 0 ? '+' : ''}${revenueChange}% vs last month` : undefined}
          sub="Subscription payments (paid)"
        />
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="Platform Growth — Companies Over Time">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={growthData}>
              <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="companies" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Companies by Plan">
          {pieData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pieData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 500 }}>{d.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--muted)' }}>{d.value} ({Math.round((d.value / companies.length) * 100)}%)</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : <p style={{ color: 'var(--muted)', fontSize: 13 }}>No data yet</p>}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="Platform Bookings — All Companies">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bookingChartData}>
              <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="confirmed" stackId="a" fill="var(--accent)"   radius={[0,0,0,0]} />
              <Bar dataKey="completed" stackId="a" fill="var(--green)"    radius={[0,0,0,0]} />
              <Bar dataKey="cancelled" stackId="a" fill="var(--red)"      radius={[4,4,0,0]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Platform Leads — All Companies">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={leadsChartData}>
              <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="leads" fill="var(--amber)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <ChartCard title="AI Call Volume — Last 30 Days">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={callsChartData}>
              <XAxis dataKey="day" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="calls" stroke="var(--blue)" fill="var(--blue-bg)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Ariva Platform Revenue (USD)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revChartData}>
              <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`$${v}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Bottom: Recent Companies + Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        {/* Recent companies table */}
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 12px', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 500 }}>Recent Companies</p>
            <Link href="/companies" style={{ fontSize: 12, color: 'var(--accent)' }}>View all →</Link>
          </div>
          <table>
            <thead>
              <tr>
                <th>Company</th><th>Plan</th><th>City</th><th>Signed up</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentCompanies.map(c => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/companies/${c.id}`} style={{ color: 'var(--accent)', fontWeight: 500 }}>{c.name}</Link>
                  </td>
                  <td>
                    <span style={{
                      fontSize: 11, padding: '2px 7px', borderRadius: 20, fontWeight: 500,
                      background: c.plan === 'professional' ? 'var(--accent-bg)' : c.plan === 'enterprise' ? 'var(--purple-bg)' : 'var(--gray-bg)',
                      color:      c.plan === 'professional' ? 'var(--accent)'    : c.plan === 'enterprise' ? 'var(--purple)'    : 'var(--gray)',
                    }}>{c.plan}</span>
                  </td>
                  <td style={{ color: 'var(--muted)' }}>{c.city || '—'}</td>
                  <td style={{ color: 'var(--muted)' }}>{format(parseISO(c.created), 'MMM d, yyyy')}</td>
                  <td>
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: c.active ? 'var(--green-bg)' : 'var(--red-bg)', color: c.active ? 'var(--green)' : 'var(--red)' }}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {recentCompanies.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No companies yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Alerts panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Alerts</p>

          {starterOld.length > 0 && (
            <div style={{ background: 'var(--amber-bg)', border: '0.5px solid var(--amber)', borderRadius: 'var(--radius-lg)', padding: '12px 14px' }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--amber)', marginBottom: 6 }}>Upgrade candidates ({starterOld.length})</p>
              {starterOld.slice(0, 3).map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <p style={{ fontSize: 12 }}>{c.name}</p>
                  <Link href={`/companies/${c.id}`} style={{ fontSize: 11, color: 'var(--accent)' }}>View</Link>
                </div>
              ))}
              {starterOld.length > 3 && <p style={{ fontSize: 11, color: 'var(--muted)' }}>+{starterOld.length - 3} more</p>}
            </div>
          )}

          {approaching.length > 0 && (
            <div style={{ background: 'var(--red-bg)', border: '0.5px solid var(--red)', borderRadius: 'var(--radius-lg)', padding: '12px 14px' }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--red)', marginBottom: 6 }}>Approaching booking limit ({approaching.length})</p>
              {approaching.slice(0, 3).map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <p style={{ fontSize: 12 }}>{c.name}</p>
                  <Link href={`/companies/${c.id}`} style={{ fontSize: 11, color: 'var(--accent)' }}>View</Link>
                </div>
              ))}
            </div>
          )}

          {inactive.length > 0 && (
            <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 14px' }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 6 }}>Inactive 7+ days ({inactive.length})</p>
              {inactive.slice(0, 3).map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <p style={{ fontSize: 12 }}>{c.name}</p>
                  <Link href={`/companies/${c.id}`} style={{ fontSize: 11, color: 'var(--accent)' }}>View</Link>
                </div>
              ))}
              {inactive.length > 3 && <p style={{ fontSize: 11, color: 'var(--muted)' }}>+{inactive.length - 3} more</p>}
            </div>
          )}

          {failedPayments.length > 0 && (
            <div style={{ background: 'var(--red-bg)', border: '0.5px solid var(--red)', borderRadius: 'var(--radius-lg)', padding: '12px 14px' }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--red)', marginBottom: 4 }}>Failed payments ({failedPayments.length})</p>
              <p style={{ fontSize: 11, color: 'var(--muted)' }}>In the last 30 days</p>
            </div>
          )}

          {starterOld.length === 0 && approaching.length === 0 && inactive.length === 0 && failedPayments.length === 0 && (
            <div style={{ background: 'var(--green-bg)', border: '0.5px solid var(--green)', borderRadius: 'var(--radius-lg)', padding: '16px 14px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--green)', fontSize: 24, display: 'block', marginBottom: 6 }}>check_circle</span>
              <p style={{ fontSize: 12, color: 'var(--green)' }}>All clear — no alerts</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
