'use client';
import { useEffect, useState, useMemo } from 'react';
import { getAllPayments, getAllCompanies } from '@/lib/api';
import { format, parseISO, startOfMonth } from 'date-fns';

export default function PaymentsPage() {
  const [payments,  setPayments]  = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [status,    setStatus]    = useState('');
  const [company,   setCompany]   = useState('');

  useEffect(() => {
    Promise.all([getAllPayments(), getAllCompanies()])
      .then(([p, c]) => { setPayments(p); setCompanies(c); })
      .finally(() => setLoading(false));
  }, []);

  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies]);

  const filtered = useMemo(() => payments.filter(p => {
    if (status  && p.status  !== status)  return false;
    if (company && p.company_id !== company) return false;
    return true;
  }), [payments, status, company]);

  const paid       = payments.filter(p => p.status === 'paid');
  const totalRev   = paid.reduce((s, p) => s + (p.amount || 0), 0);
  const thisMonth  = paid.filter(p => parseISO(p.paid_at || p.created) >= startOfMonth(new Date())).reduce((s, p) => s + (p.amount || 0), 0);

  const iStyle = { padding: '7px 10px', fontSize: 13 };

  function planBadge(plan: string) {
    const map: any = { professional: ['var(--accent-bg)', 'var(--accent)'], enterprise: ['var(--purple-bg)', 'var(--purple)'], starter: ['var(--gray-bg)', 'var(--gray)'] };
    const [bg, color] = map[plan] ?? map.starter;
    return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, background: bg, color }}>{plan}</span>;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>Payments</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>All Paystack subscription payments</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, marginBottom: 20 }}>
        {[
          ['Total Revenue',  `$${totalRev.toLocaleString()}`,   'var(--accent)'],
          ['This Month',     `$${thisMonth.toLocaleString()}`,  'var(--green)'],
          ['Paid',           paid.length,                       'var(--green)'],
          ['Pending/Failed', payments.filter(p => p.status !== 'paid').length, 'var(--amber)'],
        ].map(([label, val, color]) => (
          <div key={label as string} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', borderTop: `2px solid ${color}` }}>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: color as string }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <select value={status} onChange={e => setStatus(e.target.value)} style={iStyle}>
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <select value={company} onChange={e => setCompany(e.target.value)} style={iStyle}>
          <option value="">All companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>Loading...</p>
      ) : (
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table>
            <thead>
              <tr><th>Reference</th><th>Company</th><th>Plan</th><th>Amount</th><th>Status</th><th>Email</th><th>Paid At</th></tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.reference?.slice(0, 30) || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--accent)' }}>{companyMap[p.company_id]?.name ?? p.company_id?.slice(0, 8) ?? '—'}</td>
                  <td>{planBadge(p.plan)}</td>
                  <td style={{ color: 'var(--green)', fontWeight: 600 }}>${Number(p.amount || 0).toLocaleString()}</td>
                  <td>
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20,
                      background: p.status === 'paid' ? 'var(--green-bg)' : p.status === 'failed' ? 'var(--red-bg)' : 'var(--amber-bg)',
                      color:      p.status === 'paid' ? 'var(--green)'    : p.status === 'failed' ? 'var(--red)'    : 'var(--amber)',
                    }}>{p.status}</span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{p.email || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{p.paid_at ? format(parseISO(p.paid_at), 'MMM d, yyyy') : '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>No payments found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
