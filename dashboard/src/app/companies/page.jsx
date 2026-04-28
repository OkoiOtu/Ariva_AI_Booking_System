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

const emptyForm = { name:'', slug:'', phone:'', email:'', city:'Lagos', plan:'starter', logo_url:'', vapi_assistant_id:'', twilio_number:'' };

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
        <div style={{ gridColumn:'1/-1' }}>
          <label style={{ fontSize:12, color:'var(--muted)' }}>Logo URL</label>
          <input value={form.logo_url} onChange={f('logo_url')} placeholder="https://example.com/logo.png" style={s} />
          <p style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>Paste a direct image URL (PNG or SVG recommended). Shown in the dashboard sidebar.</p>
          {form.logo_url && (
            <img src={form.logo_url} alt="Logo preview" style={{ marginTop:8, height:40, objectFit:'contain', borderRadius:6, border:'0.5px solid var(--border)', padding:4, background:'var(--bg)' }} />
          )}
        </div>
      </div>

      <p style={{ fontSize:12, fontWeight:500, color:'var(--muted)', marginTop:4 }}>Integrations (optional)</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
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

export default function CompaniesPage() {
  const { user } = useAuth();
  const isAuthor = user?.role === 'author';

  const [companies,  setCompanies]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showAdd,    setShowAdd]    = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [error,      setError]      = useState('');
  const [saving,     setSaving]     = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res  = await api('/companies');
      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

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
      const res  = await api(`/companies/${editTarget.id}`, { method:'PATCH', body:JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to update'); return; }
      setEditTarget(null); load();
    } finally { setSaving(false); }
  }

  async function toggleActive(company) {
    await api(`/companies/${company.id}`, { method:'PATCH', body:JSON.stringify({ active: !company.active }) });
    load();
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

  // Platform stats derived from company list
  const total      = companies.length;
  const active     = companies.filter(c => c.active).length;
  const byPlan     = { starter: 0, professional: 0, enterprise: 0 };
  companies.forEach(c => { if (byPlan[c.plan] !== undefined) byPlan[c.plan]++; });
  const mrr = byPlan.professional * 49 + byPlan.enterprise * 0; // USD estimate

  return (
    <div style={{ width:'100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:500 }}>Author dashboard</h1>
          <p style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>Platform-level view — all tenants</p>
        </div>
        <button className="primary" onClick={() => { setShowAdd(true); setError(''); }}>+ Add company</button>
      </div>

      {/* Platform stats */}
      {!loading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:10, marginBottom:24 }}>
          <StatCard label="Total tenants"    value={total}                  sub={`${active} active`} />
          <StatCard label="Starter"          value={byPlan.starter}         color="var(--gray)" />
          <StatCard label="Professional"     value={byPlan.professional}    color="var(--accent)" />
          <StatCard label="Enterprise"       value={byPlan.enterprise}      color="var(--purple)" />
          <StatCard label="Est. MRR (USD)"   value={`$${mrr.toLocaleString()}`} color="var(--green)" sub="Professional only" />
        </div>
      )}

      {loading ? (
        <p style={{ color:'var(--muted)' }}>Loading...</p>
      ) : companies.length === 0 ? (
        <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'48px 24px', textAlign:'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize:36, color:'var(--muted)', display:'block', marginBottom:10 }}>domain</span>
          <p style={{ color:'var(--muted)', fontSize:14 }}>No companies yet.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {companies.map(company => {
            const planMeta = PLAN_META[company.plan] ?? PLAN_META.starter;
            return (
              <div key={company.id} style={{
                background:'var(--surface)', border:'0.5px solid var(--border)',
                borderRadius:'var(--radius-lg)', padding:'18px 20px',
                opacity: company.active ? 1 : 0.55,
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, flex:1 }}>
                    {/* Logo or initial */}
                    <div style={{ width:38, height:38, borderRadius:8, flexShrink:0, overflow:'hidden', background:'var(--accent-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'var(--accent)', border:'0.5px solid var(--border)' }}>
                      {company.logo_url
                        ? <img src={company.logo_url} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                        : company.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                        <p style={{ fontSize:14, fontWeight:500 }}>{company.name}</p>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'var(--gray-bg)', color:'var(--gray)', fontFamily:'monospace' }}>{company.slug}</span>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500, background:planMeta.bg, color:planMeta.color }}>{planMeta.label}</span>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500,
                          background: company.active ? 'var(--green-bg)' : 'var(--red-bg)',
                          color:      company.active ? 'var(--green)'    : 'var(--red)',
                        }}>{company.active ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                        {company.city  && <p style={{ fontSize:12, color:'var(--muted)' }}>{company.city}</p>}
                        {company.phone && <p style={{ fontSize:12, color:'var(--muted)' }}>{company.phone}</p>}
                        {company.email && <p style={{ fontSize:12, color:'var(--muted)' }}>{company.email}</p>}
                        {company.vapi_assistant_id && <p style={{ fontSize:12, color:'var(--purple)' }}>Vapi ✓</p>}
                        {company.twilio_number && <p style={{ fontSize:12, color:'var(--blue)' }}>{company.twilio_number}</p>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    <button onClick={() => { setEditTarget(company); setError(''); }} style={{ fontSize:12, padding:'4px 10px' }}>Edit</button>
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
            );
          })}
        </div>
      )}

      {showAdd && (
        <Modal title="Add company" onClose={() => setShowAdd(false)}>
          <CompanyForm initial={emptyForm} onSave={createCompany} onCancel={() => setShowAdd(false)} saving={saving} error={error} isEdit={false} />
        </Modal>
      )}

      {editTarget && (
        <Modal title="Edit company" onClose={() => setEditTarget(null)}>
          <CompanyForm
            initial={{ name:editTarget.name, slug:editTarget.slug, phone:editTarget.phone??'', email:editTarget.email??'', city:editTarget.city??'', plan:editTarget.plan??'starter', logo_url:editTarget.logo_url??'', vapi_assistant_id:editTarget.vapi_assistant_id??'', twilio_number:editTarget.twilio_number??'' }}
            onSave={updateCompany} onCancel={() => setEditTarget(null)} saving={saving} error={error} isEdit={true}
          />
        </Modal>
      )}
    </div>
  );
}
