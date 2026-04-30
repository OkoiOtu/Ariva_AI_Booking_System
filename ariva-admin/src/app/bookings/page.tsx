'use client';
import { useEffect, useState, useMemo } from 'react';
import { getAllBookings, getAllCompanies } from '@/lib/api';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';

export default function AllBookingsPage() {
  const [bookings,   setBookings]   = useState<any[]>([]);
  const [companies,  setCompanies]  = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [company,    setCompany]    = useState('');
  const [status,     setStatus]     = useState('');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');

  useEffect(() => {
    Promise.all([getAllBookings(), getAllCompanies()])
      .then(([b, c]) => { setBookings(b); setCompanies(c); })
      .finally(() => setLoading(false));
  }, []);

  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies]);

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (search && !b.reference?.includes(search) && !b.customer_name?.toLowerCase().includes(search.toLowerCase()) && !b.customer_phone?.includes(search)) return false;
      if (company && b.company_id !== company) return false;
      if (status  && b.status !== status) return false;
      if (dateFrom) { const d = parseISO(b.created); if (d < startOfDay(new Date(dateFrom))) return false; }
      if (dateTo)   { const d = parseISO(b.created); if (d > endOfDay(new Date(dateTo))) return false; }
      return true;
    });
  }, [bookings, search, company, status, dateFrom, dateTo]);

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart  = new Date(now.getTime() - 7 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todays = bookings.filter(b => parseISO(b.created) >= todayStart).length;
  const weeks  = bookings.filter(b => parseISO(b.created) >= weekStart).length;
  const months = bookings.filter(b => parseISO(b.created) >= monthStart).length;

  function exportCsv() {
    const rows = [
      ['Reference','Company','Customer','Phone','Pickup','Status','Price','Date'],
      ...filtered.map(b => [b.reference, companyMap[b.company_id]?.name ?? '—', b.customer_name, b.customer_phone, b.pickup_location, b.status, b.price, format(parseISO(b.created), 'yyyy-MM-dd')]),
    ];
    const csv  = rows.map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'bookings.csv'; a.click();
  }

  const iStyle = { padding: '7px 10px', fontSize: 13 };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>All Bookings</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{loading ? '...' : `${filtered.length} results`}</p>
        </div>
        <button className="primary" onClick={exportCsv}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>download</span>Export CSV
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginBottom: 20 }}>
        {[['Today', todays, 'var(--accent)'], ["This week", weeks, 'var(--blue)'], ['This month', months, 'var(--green)'], ['All time', bookings.length, 'var(--muted)']].map(([label, val, color]) => (
          <div key={label as string} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: color as string }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ref, customer, phone..." style={{ ...iStyle, width: 220 }} />
        <select value={company} onChange={e => setCompany(e.target.value)} style={iStyle}>
          <option value="">All companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} style={iStyle}>
          <option value="">All statuses</option>
          {['confirmed','on_trip','completed','cancelled','pending'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={iStyle} title="From" />
        <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={iStyle} title="To" />
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>Loading...</p>
      ) : (
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table>
            <thead>
              <tr><th>Reference</th><th>Company</th><th>Customer</th><th>Pickup</th><th>Status</th><th>Price</th><th>Date</th></tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{b.reference || '—'}</td>
                  <td>
                    <span style={{ fontSize: 12, color: 'var(--accent)' }}>{companyMap[b.company_id]?.name ?? '—'}</span>
                  </td>
                  <td>
                    <p style={{ fontSize: 13 }}>{b.customer_name || '—'}</p>
                    <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{b.customer_phone || ''}</p>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{b.pickup_location || '—'}</td>
                  <td>
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20,
                      background: b.status === 'completed' ? 'var(--green-bg)' : b.status === 'cancelled' ? 'var(--red-bg)' : 'var(--accent-bg)',
                      color:      b.status === 'completed' ? 'var(--green)'    : b.status === 'cancelled' ? 'var(--red)'    : 'var(--accent)',
                    }}>{b.status}</span>
                  </td>
                  <td style={{ color: 'var(--green)' }}>₦{Number(b.price || 0).toLocaleString()}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{format(parseISO(b.created), 'MMM d, yyyy')}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>No bookings match your filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
