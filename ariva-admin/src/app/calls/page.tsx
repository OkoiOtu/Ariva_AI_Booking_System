'use client';
import { useEffect, useState, useMemo } from 'react';
import { getAllCalls, getAllCompanies } from '@/lib/api';
import { format, parseISO } from 'date-fns';

export default function AllCallsPage() {
  const [calls,     setCalls]     = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [company,   setCompany]   = useState('');

  useEffect(() => {
    Promise.all([getAllCalls(), getAllCompanies()])
      .then(([c, co]) => { setCalls(c); setCompanies(co); })
      .finally(() => setLoading(false));
  }, []);

  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies]);

  const filtered = useMemo(() => calls.filter(c => {
    if (search  && !c.caller_number?.includes(search) && !c.vapi_call_id?.includes(search)) return false;
    if (company && c.company_id !== company) return false;
    return true;
  }), [calls, search, company]);

  const iStyle = { padding: '7px 10px', fontSize: 13 };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>All Calls</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
          {loading ? '...' : `${filtered.length} of ${calls.length} AI calls`}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, marginBottom: 20 }}>
        {[
          ['Total Calls', calls.length, 'var(--blue)'],
          ['Became Bookings', calls.filter(c => c.outcome === 'booked' || c.booking_id).length, 'var(--green)'],
          ['Leads Generated', calls.filter(c => c.outcome === 'lead').length, 'var(--amber)'],
          ['No Answer', calls.filter(c => c.outcome === 'no_answer' || c.status === 'no-answer').length, 'var(--muted)'],
        ].map(([label, val, color]) => (
          <div key={label as string} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: color as string }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by phone or call ID..." style={{ ...iStyle, width: 240 }} />
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
              <tr><th>Date</th><th>Company</th><th>Caller</th><th>Duration</th><th>Outcome</th><th>Call ID</th></tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{format(parseISO(c.created), 'MMM d, HH:mm')}</td>
                  <td style={{ fontSize: 12, color: 'var(--accent)' }}>{companyMap[c.company_id]?.name ?? '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.caller_number || '—'}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{c.duration ? `${c.duration}s` : '—'}</td>
                  <td>
                    <span style={{
                      fontSize: 11, padding: '2px 7px', borderRadius: 20,
                      background: c.outcome === 'booked' ? 'var(--green-bg)' : c.outcome === 'lead' ? 'var(--amber-bg)' : 'var(--surface-2)',
                      color:      c.outcome === 'booked' ? 'var(--green)'    : c.outcome === 'lead' ? 'var(--amber)'    : 'var(--muted)',
                    }}>{c.outcome || c.status || '—'}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--muted)' }}>{c.vapi_call_id?.slice(0, 14) || '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>No calls found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
