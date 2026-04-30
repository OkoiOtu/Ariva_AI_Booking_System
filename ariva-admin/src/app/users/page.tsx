'use client';
import { useEffect, useState, useMemo } from 'react';
import { getAllUsers, getAllCompanies } from '@/lib/api';
import { format, parseISO } from 'date-fns';

const ROLES = ['super_admin','admin','user','author'];

export default function AllUsersPage() {
  const [users,     setUsers]     = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [role,      setRole]      = useState('');
  const [company,   setCompany]   = useState('');

  useEffect(() => {
    Promise.all([getAllUsers(), getAllCompanies()])
      .then(([u, c]) => { setUsers(u); setCompanies(c); })
      .finally(() => setLoading(false));
  }, []);

  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies]);

  const filtered = useMemo(() => users.filter(u => {
    if (search  && !u.email?.toLowerCase().includes(search.toLowerCase()) && !u.full_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (role    && u.role !== role) return false;
    if (company && u.company_id !== company) return false;
    return true;
  }), [users, search, role, company]);

  const iStyle = { padding: '7px 10px', fontSize: 13 };

  function roleBadge(r: string) {
    const map: Record<string, [string, string]> = {
      author:      ['var(--accent-bg)',  'var(--accent)'],
      super_admin: ['var(--purple-bg)',  'var(--purple)'],
      admin:       ['var(--blue-bg)',    'var(--blue)'],
      user:        ['var(--gray-bg)',    'var(--gray)'],
    };
    const [bg, color] = map[r] ?? map.user;
    return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, background: bg, color }}>{r}</span>;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>All Users</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
          {loading ? '...' : `${filtered.length} of ${users.length} users`}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginBottom: 20 }}>
        {(['super_admin','admin','user','author'] as const).map(r => (
          <div key={r} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, textTransform: 'capitalize' }}>{r.replace('_', ' ')}</p>
            <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>{users.filter(u => u.role === r).length}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." style={{ ...iStyle, width: 240 }} />
        <select value={role} onChange={e => setRole(e.target.value)} style={iStyle}>
          <option value="">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
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
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Company</th><th>Verified</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.full_name || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{u.email}</td>
                  <td>{roleBadge(u.role)}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{u.company_id ? (companyMap[u.company_id]?.name ?? u.company_id.slice(0, 8)) : <span style={{ color: 'var(--accent)' }}>Platform</span>}</td>
                  <td>
                    <span style={{ fontSize: 11, color: u.verified ? 'var(--green)' : 'var(--amber)' }}>
                      {u.verified ? '✓ Yes' : '✗ No'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{format(parseISO(u.created), 'MMM d, yyyy')}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
