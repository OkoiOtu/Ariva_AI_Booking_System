'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPB } from '@/lib/pb';
import { getCompanyBookings, getCompanyCalls, getCompanyLeads, getCompanyUsers, getCompanyDrivers, getCompanyPayments, getCompanyActivity } from '@/lib/api';
import { format, parseISO } from 'date-fns';

const TABS = ['Overview','Bookings','Calls','Leads','Drivers','Users','Payments','Settings'];

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, background: bg, color }}>{label}</span>;
}

function planBadge(plan: string) {
  if (plan === 'professional') return <Badge label="Professional" color="var(--accent)" bg="var(--accent-bg)" />;
  if (plan === 'enterprise')   return <Badge label="Enterprise"   color="var(--purple)" bg="var(--purple-bg)" />;
  return <Badge label="Starter" color="var(--gray)" bg="var(--gray-bg)" />;
}

export default function CompanyDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();
  const [tab,     setTab]     = useState('Overview');
  const [company, setCompany] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [calls,    setCalls]   = useState<any[]>([]);
  const [leads,    setLeads]   = useState<any[]>([]);
  const [users,    setUsers]   = useState<any[]>([]);
  const [drivers,  setDrivers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading,  setLoading] = useState(true);
  const [saving,   setSaving]  = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getPB().collection('companies').getOne(id, { requestKey: null }),
      getCompanyBookings(id), getCompanyCalls(id), getCompanyLeads(id),
      getCompanyUsers(id), getCompanyDrivers(id), getCompanyPayments(id),
      getCompanyActivity(id),
    ]).then(([co, bk, ca, le, us, dr, pa, ac]) => {
      setCompany(co); setBookings(bk); setCalls(ca); setLeads(le);
      setUsers(us); setDrivers(dr); setPayments(pa); setActivity(ac);
      setEditForm({ name: co.name, city: co.city ?? '', email: co.email ?? '', phone: co.phone ?? '', plan: co.plan ?? 'starter', vapi_assistant_id: co.vapi_assistant_id ?? '', twilio_number: co.twilio_number ?? '' });
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  async function saveSettings() {
    if (!editForm) return;
    setSaving(true);
    try {
      const updated = await getPB().collection('companies').update(id, editForm, { requestKey: null });
      setCompany(updated);
      alert('Saved!');
    } catch (e) { alert('Failed to save'); }
    finally { setSaving(false); }
  }

  async function suspendCompany() {
    if (!confirm(`${company?.active ? 'Deactivate' : 'Activate'} ${company?.name}?`)) return;
    await getPB().collection('companies').update(id, { active: !company?.active }, { requestKey: null });
    setCompany((p: any) => ({ ...p, active: !p.active }));
  }

  async function deleteCompany() {
    if (!confirm(`Permanently delete ${company?.name}? This cannot be undone.`)) return;
    if (!confirm('Are you absolutely sure?')) return;
    await getPB().collection('companies').delete(id);
    router.push('/companies');
  }

  if (loading) return <p style={{ color: 'var(--muted)', padding: 40 }}>Loading...</p>;
  if (!company) return <p style={{ color: 'var(--red)', padding: 40 }}>Company not found</p>;

  const revenue = bookings.reduce((s, b) => s + (Number(b.price) || 0), 0);

  const tabContent: Record<string, React.ReactNode> = {
    Overview: (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 12, marginBottom: 24 }}>
          {[
            ['Total Bookings', bookings.length, 'var(--accent)'],
            ['Revenue (₦)',    `₦${revenue.toLocaleString()}`, 'var(--green)'],
            ['Leads',          leads.length, 'var(--amber)'],
            ['AI Calls',       calls.length, 'var(--blue)'],
          ].map(([label, value, color]) => (
            <div key={label as string} style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', borderTop: `2px solid ${color}` }}>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
              <p style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: color as string }}>{value}</p>
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 500 }}>Recent Activity</p>
          </div>
          {activity.slice(0, 10).map(a => (
            <div key={a.id} style={{ padding: '10px 18px', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 13 }}>{a.description}</p>
              <p style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0, marginLeft: 12 }}>{format(parseISO(a.created), 'MMM d, HH:mm')}</p>
            </div>
          ))}
          {activity.length === 0 && <p style={{ color: 'var(--muted)', padding: '16px 18px', fontSize: 13 }}>No activity yet</p>}
        </div>
      </div>
    ),

    Bookings: (
      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table>
          <thead><tr><th>Reference</th><th>Customer</th><th>Pickup</th><th>Status</th><th>Price</th><th>Date</th></tr></thead>
          <tbody>
            {bookings.map(b => (
              <tr key={b.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{b.reference}</td>
                <td>{b.customer_name || '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>{b.pickup_location || '—'}</td>
                <td><span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: 'var(--accent-bg)', color: 'var(--accent)' }}>{b.status}</span></td>
                <td style={{ color: 'var(--green)' }}>₦{Number(b.price || 0).toLocaleString()}</td>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>{format(parseISO(b.created), 'MMM d, yyyy')}</td>
              </tr>
            ))}
            {bookings.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No bookings yet</td></tr>}
          </tbody>
        </table>
      </div>
    ),

    Calls: (
      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table>
          <thead><tr><th>Date</th><th>Caller</th><th>Duration</th><th>Outcome</th></tr></thead>
          <tbody>
            {calls.map(c => (
              <tr key={c.id}>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>{format(parseISO(c.created), 'MMM d, HH:mm')}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.caller_number || '—'}</td>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{c.duration ? `${c.duration}s` : '—'}</td>
                <td><span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: 'var(--accent-bg)', color: 'var(--accent)' }}>{c.outcome || c.status || '—'}</span></td>
              </tr>
            ))}
            {calls.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No calls yet</td></tr>}
          </tbody>
        </table>
      </div>
    ),

    Leads: (
      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {leads.map(l => (
              <tr key={l.id}>
                <td>{l.customer_name || '—'}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{l.customer_phone || '—'}</td>
                <td><span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: 'var(--surface-2)', color: 'var(--muted)' }}>{l.status || 'new'}</span></td>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>{format(parseISO(l.created), 'MMM d, yyyy')}</td>
              </tr>
            ))}
            {leads.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No leads yet</td></tr>}
          </tbody>
        </table>
      </div>
    ),

    Drivers: (
      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th>Vehicle</th><th>Status</th></tr></thead>
          <tbody>
            {drivers.map(d => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.phone || '—'}</td>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{d.vehicle_plate || '—'}</td>
                <td><span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: d.available ? 'var(--green-bg)' : 'var(--amber-bg)', color: d.available ? 'var(--green)' : 'var(--amber)' }}>{d.available ? 'Available' : 'On trip'}</span></td>
              </tr>
            ))}
            {drivers.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No drivers yet</td></tr>}
          </tbody>
        </table>
      </div>
    ),

    Users: (
      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Verified</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.full_name || '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>{u.email}</td>
                <td><span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: 'var(--accent-bg)', color: 'var(--accent)' }}>{u.role}</span></td>
                <td><span style={{ fontSize: 11, color: u.verified ? 'var(--green)' : 'var(--amber)' }}>{u.verified ? 'Yes' : 'No'}</span></td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No users yet</td></tr>}
          </tbody>
        </table>
      </div>
    ),

    Payments: (
      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table>
          <thead><tr><th>Reference</th><th>Plan</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.reference}</td>
                <td>{planBadge(p.plan)}</td>
                <td style={{ color: 'var(--green)' }}>${Number(p.amount || 0).toLocaleString()}</td>
                <td><span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: p.status === 'paid' ? 'var(--green-bg)' : 'var(--amber-bg)', color: p.status === 'paid' ? 'var(--green)' : 'var(--amber)' }}>{p.status}</span></td>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>{p.paid_at ? format(parseISO(p.paid_at), 'MMM d, yyyy') : '—'}</td>
              </tr>
            ))}
            {payments.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No payments yet</td></tr>}
          </tbody>
        </table>
      </div>
    ),

    Settings: editForm && (
      <div style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[['Company Name','name'],['City','city'],['Email','email'],['Phone','phone'],['Vapi Assistant ID','vapi_assistant_id'],['Twilio Number','twilio_number']].map(([label, key]) => (
            <div key={key}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>{label}</label>
              <input value={editForm[key] ?? ''} onChange={e => setEditForm((p: any) => ({ ...p, [key]: e.target.value }))} style={{ width: '100%', padding: '8px 10px' }} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>Plan</label>
            <select value={editForm.plan} onChange={e => setEditForm((p: any) => ({ ...p, plan: e.target.value }))} style={{ width: '100%', padding: '8px 10px' }}>
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <button className="primary" onClick={saveSettings} disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
        </div>
      </div>
    ),
  };

  return (
    <div>
      {/* Breadcrumb */}
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>
        <Link href="/companies" style={{ color: 'var(--accent)' }}>Companies</Link> / {company.name}
      </p>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--accent-bg)', border: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--accent)', overflow: 'hidden' }}>
            {company.logo_url ? <img src={company.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : company.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>{company.name}</h1>
              {planBadge(company.plan)}
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: company.active ? 'var(--green-bg)' : 'var(--red-bg)', color: company.active ? 'var(--green)' : 'var(--red)' }}>
                {company.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
              {[company.city, company.email, company.phone].filter(Boolean).join(' · ')}
            </p>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              Signed up {format(parseISO(company.created), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setTab('Settings')} style={{ fontSize: 12, padding: '6px 12px' }}>Edit</button>
          <button onClick={suspendCompany} style={{ fontSize: 12, padding: '6px 12px', background: company.active ? 'var(--amber-bg)' : 'var(--green-bg)', color: company.active ? 'var(--amber)' : 'var(--green)', border: 'none' }}>
            {company.active ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={deleteCompany} className="danger" style={{ fontSize: 12, padding: '6px 12px' }}>Delete</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '0.5px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontSize: 13, padding: '8px 16px', background: 'none', border: 'none',
            borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            color: tab === t ? 'var(--accent)' : 'var(--muted)',
            borderRadius: 0, marginBottom: -1,
          }}>{t}</button>
        ))}
      </div>

      {tabContent[tab]}
    </div>
  );
}
