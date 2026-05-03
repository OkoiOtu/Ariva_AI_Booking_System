'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

const PLAN_META = {
  starter:      { label:'Starter',      bg:'var(--gray-bg)',   color:'var(--gray)'   },
  professional: { label:'Professional', bg:'var(--accent-bg)', color:'var(--accent)' },
  enterprise:   { label:'Enterprise',   bg:'var(--purple-bg)', color:'var(--purple)' },
};

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'18px 20px' }}>
      <p style={{ fontSize:12, color:'var(--muted)', marginBottom:6 }}>{label}</p>
      <p style={{ fontSize:26, fontWeight:600, color: color ?? 'var(--text)', lineHeight:1 }}>{value}</p>
      {sub && <p style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>{sub}</p>}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 16px' }}>
      <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'24px 28px', width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <p style={{ fontSize:15, fontWeight:500 }}>{title}</p>
          <button onClick={onClose} style={{ border:'none', background:'none', fontSize:20, color:'var(--muted)', padding:0 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const emptyForm = { name:'', slug:'', phone:'', email:'', city:'Lagos', plan:'starter', vapi_assistant_id:'', twilio_number:'' };

function CompanyForm({ initial, onSave, onCancel, saving, error, isEdit }) {
  const [form, setForm] = useState(initial);
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const s = { width:'100%', padding:'7px 10px', fontSize:13, marginTop:4 };

  function handleSlug(e) {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    setForm(p => ({ ...p, slug: val }));
  }

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={{ fontSize:12, color:'var(--muted)' }}>Company name</label>
          <input required value={form.name} onChange={e => {
            f('name')(e);
            if (!isEdit) setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-') }));
          }} style={s} />
        </div>
        <div>
          <label style={{ fontSize:12, color:'var(--muted)' }}>Slug (URL identifier)</label>
          <input required value={form.slug} onChange={handleSlug} placeholder="e.g. blessed-global" disabled={isEdit} style={{ ...s, opacity: isEdit ? 0.6 : 1 }} />
          {!isEdit && <p style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>Cannot be changed after creation</p>}
        </div>
        <div>
          <label style={{ fontSize:12, color:'var(--muted)' }}>Plan</label>
          <select value={form.plan} onChange={f('plan')} style={s}>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize:12, color:'var(--muted)' }}>City</label>
          <input value={form.city} onChange={f('city')} style={s} />
        </div>
        <div>
          <label style={{ fontSize:12, color:'var(--muted)' }}>Phone</label>
          <input value={form.phone} onChange={f('phone')} placeholder="+234..." style={s} />
        </div>
        <div>
          <label style={{ fontSize:12, color:'var(--muted)' }}>Email</label>
          <input type="email" value={form.email} onChange={f('email')} style={s} />
        </div>
        <div>
          <label style={{ fontSize:12, color:'var(--muted)' }}>Vapi Assistant ID</label>
          <input value={form.vapi_assistant_id} onChange={f('vapi_assistant_id')} placeholder="From Vapi dashboard" style={s} />
        </div>
        <div>
          <label style={{ fontSize:12, color:'var(--muted)' }}>Twilio number</label>
          <input value={form.twilio_number} onChange={f('twilio_number')} placeholder="+1..." style={s} />
        </div>
      </div>

      {error && <p style={{ fontSize:12, color:'var(--red)', background:'var(--red-bg)', padding:'8px 10px', borderRadius:'var(--radius)' }}>{error}</p>}

      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create company'}</button>
      </div>
    </form>
  );
}

function PlanBadge({ plan }) {
  const meta = PLAN_META[plan] ?? PLAN_META.starter;
  return (
    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500, background:meta.bg, color:meta.color }}>
      {meta.label}
    </span>
  );
}

const TABS = ['Overview', 'Companies', 'Recent bookings', 'System'];

export default function CompaniesPage() {
  const { user } = useAuth();
  const isAuthor = user?.role === 'author';

  const [tab,        setTab]        = useState('Overview');
  const [stats,      setStats]      = useState(null);
  const [companies,  setCompanies]  = useState([]);
  const [bookings,   setBookings]   = useState([]);
  const [health,     setHealth]     = useState(null);
  const [loading,    setLoading]    = useState(true);

  const [showAdd,    setShowAdd]    = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [planTarget, setPlanTarget] = useState(null);
  const [error,      setError]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const [actionMsg,  setActionMsg]  = useState('');

  async function load() {
    setLoading(true);
    try {
      const [statsRes, companiesRes] = await Promise.all([
        api('/admin/stats').then(r => r.json()),
        api('/admin/companies').then(r => r.json()),
      ]);
      setStats(statsRes);
      setCompanies(Array.isArray(companiesRes) ? companiesRes : []);
    } finally { setLoading(false); }
  }

  async function loadBookings() {
    const res = await api('/admin/bookings?from=' + new Date(Date.now() - 7 * 86400000).toISOString().slice(0,10));
    const data = await res.json();
    setBookings(Array.isArray(data) ? data.slice(0, 50) : []);
  }

  async function loadHealth() {
    const res = await api('/admin/system/health');
    setHealth(await res.json());
  }

  useEffect(() => { if (isAuthor) load(); }, [isAuthor]);

  useEffect(() => {
    if (!isAuthor) return;
    if (tab === 'Recent bookings') loadBookings();
    if (tab === 'System') loadHealth();
  }, [tab, isAuthor]);

  async function createCompany(form) {
    setSaving(true); setError('');
    try {
      const res  = await api('/companies', { method:'POST', body:JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create'); return; }
      setShowAdd(false); load();
    } finally { setSaving(false); }
  }

  async function updateCompany(form) {
    setSaving(true); setError('');
    try {
      const res  = await api(`/admin/companies/${editTarget.id}`, { method:'PATCH', body:JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to update'); return; }
      setEditTarget(null); load();
    } finally { setSaving(false); }
  }

  async function changePlan(companyId, plan) {
    setSaving(true);
    const res  = await api(`/admin/companies/${companyId}/plan`, { method:'PATCH', body:JSON.stringify({ plan }) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setActionMsg(data.error ?? 'Failed'); return; }
    setActionMsg(`Plan updated to ${plan}`);
    setPlanTarget(null);
    load();
  }

  async function toggleActive(company) {
    await api(`/admin/companies/${company.id}/suspend`, { method:'PATCH', body:JSON.stringify({ active: !company.active }) });
    load();
  }

  async function provisionCalling(companyId) {
    setSaving(true); setActionMsg('');
    try {
      const res  = await api(`/phone-numbers/provision/${companyId}`, { method:'POST' });
      const data = await res.json();
      setActionMsg(res.ok ? `Calling provisioned — ${data.number ?? 'number assigned'}` : (data.error ?? 'Failed'));
      if (res.ok) load();
    } catch { setActionMsg('Failed to provision calling'); }
    finally { setSaving(false); }
  }

  if (!isAuthor) {
    return (
      <div style={{ width:'100%' }}>
        <h1 style={{ fontSize:20, fontWeight:500, marginBottom:12 }}>Companies</h1>
        <div style={{ background:'var(--amber-bg)', color:'var(--amber)', padding:'14px 18px', borderRadius:'var(--radius-lg)', fontSize:13 }}>
          This page is only accessible to the platform author.
        </div>
      </div>
    );
  }

  return (
    <div style={{ width:'100%' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:500 }}>Author dashboard</h1>
          <p style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>Platform-level view — all tenants</p>
        </div>
        <button className="primary" onClick={() => { setShowAdd(true); setError(''); }}>+ Add company</button>
      </div>

      {/* Action message */}
      {actionMsg && (
        <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:'var(--radius)', fontSize:13,
          background:'var(--green-bg)', color:'var(--green)', border:'0.5px solid var(--green)' }}>
          {actionMsg}
          <button onClick={() => setActionMsg('')} style={{ float:'right', background:'none', border:'none', cursor:'pointer', fontSize:14, color:'inherit' }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, marginBottom:20, borderBottom:'0.5px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'7px 16px', fontSize:13, border:'none', background:'none', cursor:'pointer',
            color: tab === t ? 'var(--accent)' : 'var(--muted)',
            borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom:-1, fontWeight: tab === t ? 500 : 400,
          }}>{t}</button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'Overview' && (
        loading ? <p style={{ color:'var(--muted)' }}>Loading...</p> : stats && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px,1fr))', gap:10, marginBottom:24 }}>
              <StatCard label="Total tenants"    value={stats.totalCompanies}    sub={`${stats.activeCompanies} active`} />
              <StatCard label="New this month"   value={stats.newThisMonth}      color="var(--accent)" />
              <StatCard label="Starter"          value={stats.companiesByPlan?.starter ?? 0}      color="var(--gray)" />
              <StatCard label="Professional"     value={stats.companiesByPlan?.professional ?? 0} color="var(--accent)" />
              <StatCard label="Enterprise"       value={stats.companiesByPlan?.enterprise ?? 0}   color="var(--purple)" />
              <StatCard label="Est. MRR (₦)"     value={`₦${(stats.mrr ?? 0).toLocaleString()}`} color="var(--green)" sub="Professional × ₦49k" />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px,1fr))', gap:10, marginBottom:24 }}>
              <StatCard label="Total bookings"   value={stats.totalBookings}  sub={`${stats.activeBookings} active`} />
              <StatCard label="Total leads"      value={stats.totalLeads}     sub={`${stats.convertedLeads} converted`} />
              <StatCard label="Total calls"      value={stats.totalCalls} />
              <StatCard label="Revenue this month" value={`₦${(stats.revenueThisMonth ?? 0).toLocaleString()}`} color="var(--green)" sub={`₦${(stats.revenueLastMonth ?? 0).toLocaleString()} last month`} />
              <StatCard label="Total platform revenue" value={`₦${(stats.totalRevenue ?? 0).toLocaleString()}`} color="var(--green)" />
            </div>

            {/* Companies snapshot */}
            <p style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>All tenants</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {companies.map(c => (
                <div key={c.id} style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'14px 18px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap', opacity: c.active ? 1 : 0.5 }}>
                  <div style={{ flex:1, minWidth:160 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
                      <span style={{ fontSize:14, fontWeight:500 }}>{c.name}</span>
                      <PlanBadge plan={c.plan} />
                      {!c.active && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'var(--red-bg)', color:'var(--red)' }}>Inactive</span>}
                    </div>
                    <p style={{ fontSize:12, color:'var(--muted)' }}>{c.city ?? ''}{c.city && c.email ? ' · ' : ''}{c.email ?? ''}</p>
                  </div>
                  <div style={{ display:'flex', gap:16, fontSize:12, color:'var(--muted)' }}>
                    <span><strong style={{ color:'var(--text)' }}>{c.bookingCount ?? 0}</strong> bookings</span>
                    <span><strong style={{ color:'var(--text)' }}>{c.userCount ?? 0}</strong> users</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )
      )}

      {/* COMPANIES TAB */}
      {tab === 'Companies' && (
        loading ? <p style={{ color:'var(--muted)' }}>Loading...</p> :
        companies.length === 0 ? (
          <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'48px 24px', textAlign:'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize:36, color:'var(--muted)', display:'block', marginBottom:10 }}>domain</span>
            <p style={{ color:'var(--muted)', fontSize:14 }}>No companies yet.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {companies.map(company => (
              <div key={company.id} style={{
                background:'var(--surface)', border:'0.5px solid var(--border)',
                borderRadius:'var(--radius-lg)', padding:'18px 20px',
                opacity: company.active ? 1 : 0.55,
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, flex:1 }}>
                    {/* Logo or initial */}
                    <div style={{ width:38, height:38, borderRadius:8, flexShrink:0, overflow:'hidden', background:'var(--accent-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'var(--accent)', border:'0.5px solid var(--border)' }}>
                      {(company.logo_data || company.logo_url)
                        ? <img src={company.logo_data ?? company.logo_url} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }} onError={e => { e.currentTarget.style.display='none'; }} />
                        : company.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                        <p style={{ fontSize:14, fontWeight:500 }}>{company.name}</p>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'var(--gray-bg)', color:'var(--gray)', fontFamily:'monospace' }}>{company.slug}</span>
                        <PlanBadge plan={company.plan} />
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500,
                          background: company.active ? 'var(--green-bg)' : 'var(--red-bg)',
                          color:      company.active ? 'var(--green)'    : 'var(--red)',
                        }}>{company.active ? 'Active' : 'Inactive'}</span>
                        {company.calling_enabled && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'var(--purple-bg)', color:'var(--purple)' }}>AI calling</span>}
                      </div>
                      <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                        {company.city  && <p style={{ fontSize:12, color:'var(--muted)' }}>{company.city}</p>}
                        {company.phone && <p style={{ fontSize:12, color:'var(--muted)' }}>{company.phone}</p>}
                        {company.email && <p style={{ fontSize:12, color:'var(--muted)' }}>{company.email}</p>}
                        <p style={{ fontSize:12, color:'var(--muted)' }}>{company.bookingCount ?? 0} bookings · {company.userCount ?? 0} users</p>
                        {company.lastBookingDate && <p style={{ fontSize:12, color:'var(--muted)' }}>Last booking: {new Date(company.lastBookingDate).toLocaleDateString()}</p>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap' }}>
                    <button onClick={() => { setEditTarget(company); setError(''); }} style={{ fontSize:12, padding:'4px 10px' }}>Edit</button>
                    <button onClick={() => setPlanTarget(company)} style={{ fontSize:12, padding:'4px 10px' }}>Plan</button>
                    {!company.calling_enabled && company.plan !== 'starter' && (
                      <button onClick={() => provisionCalling(company.id)} disabled={saving} style={{ fontSize:12, padding:'4px 10px', color:'var(--purple)', border:'0.5px solid var(--purple)', background:'var(--purple-bg)' }}>
                        Provision AI
                      </button>
                    )}
                    <button onClick={() => toggleActive(company)} style={{ fontSize:12, padding:'4px 10px',
                      background: company.active ? 'var(--amber-bg)' : 'var(--green-bg)',
                      color:      company.active ? 'var(--amber)'    : 'var(--green)',
                      border:'none',
                    }}>
                      {company.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* RECENT BOOKINGS TAB */}
      {tab === 'Recent bookings' && (
        bookings.length === 0 ? (
          <p style={{ color:'var(--muted)' }}>Loading bookings...</p>
        ) : (
          <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
            <div className="table-scroll">
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
                <thead>
                  <tr style={{ borderBottom:'0.5px solid var(--border)' }}>
                    {['Reference','Company','Customer','Pickup','Status','Created'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'10px 16px', fontSize:12, color:'var(--muted)', fontWeight:500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id} style={{ borderBottom:'0.5px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--bg)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'10px 16px', fontSize:12, fontFamily:'monospace' }}>{b.reference}</td>
                      <td style={{ padding:'10px 16px', fontSize:12 }}>{b.company?.name ?? '—'}</td>
                      <td style={{ padding:'10px 16px', fontSize:13 }}>{b.caller_name ?? '—'}</td>
                      <td style={{ padding:'10px 16px', fontSize:12, color:'var(--muted)' }}>
                        {b.pickup_datetime ? new Date(b.pickup_datetime).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding:'10px 16px' }}>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500,
                          background: b.status === 'completed' ? 'var(--green-bg)' : b.status === 'cancelled' ? 'var(--red-bg)' : b.status === 'on_trip' ? 'var(--accent-bg)' : 'var(--gray-bg)',
                          color:      b.status === 'completed' ? 'var(--green)'    : b.status === 'cancelled' ? 'var(--red)'    : b.status === 'on_trip' ? 'var(--accent)'    : 'var(--gray)',
                        }}>{b.status}</span>
                      </td>
                      <td style={{ padding:'10px 16px', fontSize:12, color:'var(--muted)' }}>
                        {new Date(b.created).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* SYSTEM TAB */}
      {tab === 'System' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {health ? (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10 }}>
                {[
                  ['Backend',    health.backend,    health.backend    === 'operational'],
                  ['PocketBase', health.pocketbase, health.pocketbase === 'operational'],
                ].map(([name, status, ok]) => (
                  <div key={name} style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'18px 20px' }}>
                    <p style={{ fontSize:12, color:'var(--muted)', marginBottom:6 }}>{name}</p>
                    <p style={{ fontSize:15, fontWeight:500, color: ok ? 'var(--green)' : 'var(--red)' }}>
                      {ok ? '● Operational' : '● ' + status}
                    </p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize:12, color:'var(--muted)' }}>Checked at {new Date(health.timestamp).toLocaleTimeString()}</p>
              <button onClick={loadHealth} style={{ width:'fit-content', fontSize:13 }}>Refresh health</button>
            </>
          ) : (
            <p style={{ color:'var(--muted)' }}>Loading system status...</p>
          )}
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <Modal title="Add company" onClose={() => setShowAdd(false)}>
          <CompanyForm initial={emptyForm} onSave={createCompany} onCancel={() => setShowAdd(false)} saving={saving} error={error} isEdit={false} />
        </Modal>
      )}

      {editTarget && (
        <Modal title="Edit company" onClose={() => setEditTarget(null)}>
          <CompanyForm
            initial={{ name:editTarget.name??'', slug:editTarget.slug??'', phone:editTarget.phone??'', email:editTarget.email??'', city:editTarget.city??'', plan:editTarget.plan??'starter', vapi_assistant_id:editTarget.vapi_assistant_id??'', twilio_number:editTarget.twilio_number??'' }}
            onSave={updateCompany} onCancel={() => setEditTarget(null)} saving={saving} error={error} isEdit={true}
          />
        </Modal>
      )}

      {planTarget && (
        <Modal title={`Change plan — ${planTarget.name}`} onClose={() => setPlanTarget(null)}>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <p style={{ fontSize:13, color:'var(--muted)' }}>Current plan: <strong>{planTarget.plan}</strong></p>
            {['starter','professional','enterprise'].map(p => (
              <button key={p} onClick={() => changePlan(planTarget.id, p)} disabled={saving || planTarget.plan === p}
                style={{ padding:'10px 14px', fontSize:13, textAlign:'left',
                  background: planTarget.plan === p ? 'var(--accent-bg)' : 'var(--surface)',
                  color:      planTarget.plan === p ? 'var(--accent)'    : 'var(--text)',
                  border:`0.5px solid ${planTarget.plan === p ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius:'var(--radius)', opacity: planTarget.plan === p ? 0.7 : 1,
                }}>
                {p.charAt(0).toUpperCase() + p.slice(1)}{planTarget.plan === p ? ' (current)' : ''}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
