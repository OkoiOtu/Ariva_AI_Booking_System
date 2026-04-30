'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { getAllCompanies, getAllBookings } from '@/lib/api';
import { format, parseISO } from 'date-fns';

const PLANS = ['all', 'starter', 'professional', 'enterprise'];
const STATUS = ['all', 'active', 'inactive'];
const SORTS  = ['newest', 'oldest', 'most bookings', 'highest revenue'];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [bookings,  setBookings]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [plan,      setPlan]      = useState('all');
  const [status,    setStatus]    = useState('all');
  const [sort,      setSort]      = useState('newest');

  useEffect(() => {
    Promise.all([getAllCompanies(), getAllBookings()])
      .then(([c, b]) => { setCompanies(c); setBookings(b); })
      .finally(() => setLoading(false));
  }, []);

  const enriched = useMemo(() => companies.map(c => {
    const cb = bookings.filter(b => b.company_id === c.id);
    return {
      ...c,
      bookingCount: cb.length,
      revenue:      cb.reduce((s: number, b: any) => s + (Number(b.price) || 0), 0),
      lastBooking:  cb.sort((a: any, z: any) => z.created > a.created ? 1 : -1)[0]?.created ?? null,
    };
  }), [companies, bookings]);

  const filtered = useMemo(() => {
    let r = enriched;
    if (search) r = r.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.city?.toLowerCase().includes(search.toLowerCase()));
    if (plan !== 'all')   r = r.filter(c => c.plan === plan);
    if (status === 'active')   r = r.filter(c => c.active);
    if (status === 'inactive') r = r.filter(c => !c.active);
    if (sort === 'newest')         r = [...r].sort((a, b) => b.created > a.created ? 1 : -1);
    if (sort === 'oldest')         r = [...r].sort((a, b) => a.created > b.created ? 1 : -1);
    if (sort === 'most bookings')  r = [...r].sort((a, b) => b.bookingCount - a.bookingCount);
    if (sort === 'highest revenue') r = [...r].sort((a, b) => b.revenue - a.revenue);
    return r;
  }, [enriched, search, plan, status, sort]);

  function exportCsv() {
    const rows = [
      ['Name','Slug','Plan','City','Email','Phone','Status','Bookings','Revenue','Signed Up'],
      ...filtered.map(c => [c.name, c.slug, c.plan, c.city, c.email, c.phone, c.active ? 'Active' : 'Inactive', c.bookingCount, c.revenue, format(parseISO(c.created), 'yyyy-MM-dd')]),
    ];
    const csv  = rows.map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'companies.csv'; a.click();
  }

  function planBadge(p: string) {
    const map: any = { professional: ['var(--accent-bg)', 'var(--accent)'], enterprise: ['var(--purple-bg)', 'var(--purple)'], starter: ['var(--gray-bg)', 'var(--gray)'] };
    const [bg, color] = map[p] ?? map.starter;
    return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, background: bg, color }}>{p}</span>;
  }

  const iStyle = { padding: '7px 10px', fontSize: 13 };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>Companies</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{loading ? '...' : `${filtered.length} of ${companies.length} companies`}</p>
        </div>
        <button className="primary" onClick={exportCsv} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or city..." style={{ ...iStyle, width: 240 }} />
        <select value={plan} onChange={e => setPlan(e.target.value)} style={iStyle}>
          {PLANS.map(p => <option key={p} value={p}>{p === 'all' ? 'All plans' : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} style={iStyle}>
          {STATUS.map(s => <option key={s} value={s}>{s === 'all' ? 'All status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} style={iStyle}>
          {SORTS.map(s => <option key={s} value={s}>Sort: {s}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)', padding: 32, textAlign: 'center' }}>Loading...</p>
      ) : (
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Company</th><th>Plan</th><th>City</th><th>Bookings</th>
                <th>Revenue</th><th>Users</th><th>Status</th><th>Signed Up</th><th>Last Booking</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-bg)', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--accent)', flexShrink: 0, overflow: 'hidden' }}>
                        {c.logo_url ? <img src={c.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : c.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <Link href={`/companies/${c.id}`} style={{ fontWeight: 500, color: 'var(--accent)' }}>{c.name}</Link>
                        <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{c.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td>{planBadge(c.plan)}</td>
                  <td style={{ color: 'var(--muted)' }}>{c.city || '—'}</td>
                  <td style={{ fontWeight: 500 }}>{c.bookingCount}</td>
                  <td style={{ color: 'var(--green)' }}>₦{c.revenue.toLocaleString()}</td>
                  <td style={{ color: 'var(--muted)' }}>—</td>
                  <td>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: c.active ? 'var(--green-bg)' : 'var(--red-bg)', color: c.active ? 'var(--green)' : 'var(--red)' }}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{format(parseISO(c.created), 'MMM d, yyyy')}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{c.lastBooking ? format(parseISO(c.lastBooking), 'MMM d') : '—'}</td>
                  <td>
                    <Link href={`/companies/${c.id}`}>
                      <button style={{ fontSize: 12, padding: '4px 10px' }}>View</button>
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No companies match your filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
