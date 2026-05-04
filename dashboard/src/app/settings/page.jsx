'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth, checkPasswordStrength } from '@/lib/auth';
import { useCurrency, CURRENCIES } from '@/lib/currencyContext';
import { useCompany } from '@/lib/companyContext';
import { api } from '@/lib/api';
import pb from '@/lib/pb';

const TABS = [
  { id: 'profile',       label: 'Company Profile'    },
  { id: 'appearance',    label: 'Appearance'          },
  { id: 'ai',            label: 'AI Agent & Calling'  },
  { id: 'notifications', label: 'Notifications & SMS' },
  { id: 'billing',       label: 'Billing & Plan'      },
  { id: 'security',      label: 'Security'            },
];

const SETTINGS_CONFIG = [
  {
    group: 'Customer SMS',
    items: [
      { key:'sms_booking_confirmed', label:'Booking confirmed', desc:'Send customer an SMS when their booking is confirmed' },
      { key:'sms_booking_cancelled', label:'Booking cancelled', desc:'Notify customer when a booking is cancelled'         },
      { key:'sms_reminder_1hr',      label:'1-hour reminder',   desc:'Send customer a reminder SMS 1 hour before pickup'   },
    ],
  },
  {
    group: 'Admin alerts',
    items: [
      { key:'sms_admin_new_booking', label:'New booking alert', desc:'Send admin an SMS when a new booking is confirmed' },
      { key:'sms_admin_new_lead',    label:'New lead alert',    desc:'Send admin an SMS when a call is logged as a lead' },
    ],
  },
];

const VEHICLE_OPTIONS = [
  { value:'sedan',      label:'Sedan'                },
  { value:'suv',        label:'SUV'                  },
  { value:'van',        label:'Van'                  },
  { value:'bus',        label:'Bus'                  },
  { value:'limo',       label:'Stretch Limo'         },
  { value:'sprinter',   label:'Sprinter Van'         },
  { value:'party_bus',  label:'Party Bus'            },
  { value:'wheelchair', label:'Wheelchair Accessible'},
];

const LANGUAGE_OPTIONS = ['English','Spanish','French','Arabic','Portuguese','Yoruba','Hausa','Igbo'];

const PLAN_META = {
  starter:      { label:'Starter',      color:'var(--muted)',  bg:'var(--bg)',              subtitle:'Free — 50 bookings/month'           },
  professional: { label:'Professional', color:'var(--accent)', bg:'var(--accent-bg)',        subtitle:'₦49,000/month — unlimited bookings'  },
  enterprise:   { label:'Enterprise',   color:'#f59e0b',       bg:'rgba(245,158,11,0.1)',    subtitle:'Custom pricing — unlimited everything'},
};

// ── Shared UI primitives ─────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }) {
  return (
    <div onClick={disabled ? undefined : onChange} style={{
      width:40, height:22, borderRadius:11, flexShrink:0,
      cursor: disabled ? 'not-allowed' : 'pointer',
      background: checked ? 'var(--accent)' : 'var(--border)',
      position:'relative', transition:'background 0.2s',
      opacity: disabled ? 0.5 : 1,
    }}>
      <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left: checked ? 21 : 3, transition:'left 0.2s' }} />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:28 }}>
      <p style={{ fontSize:12, fontWeight:500, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>{title}</p>
      <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, desc, children, last }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom: last ? 'none' : '0.5px solid var(--border)', gap:16 }}>
      <div style={{ flex:1 }}>
        <p style={{ fontSize:14, fontWeight:500, marginBottom:2 }}>{label}</p>
        {desc && <p style={{ fontSize:12, color:'var(--muted)', lineHeight:1.5 }}>{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function FullRow({ label, desc, children, last }) {
  return (
    <div style={{ padding:'16px 20px', borderBottom: last ? 'none' : '0.5px solid var(--border)' }}>
      <p style={{ fontSize:14, fontWeight:500, marginBottom:2 }}>{label}</p>
      {desc && <p style={{ fontSize:12, color:'var(--muted)', lineHeight:1.5, marginBottom:10 }}>{desc}</p>}
      {children}
    </div>
  );
}

function SaveBar({ onSave, saving, saved, error, label = 'Save changes' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
      <button className="primary" onClick={onSave} disabled={saving} style={{ padding:'9px 24px', fontSize:14 }}>
        {saving ? 'Saving...' : label}
      </button>
      {saved && <span style={{ fontSize:13, color:'var(--green)', display:'flex', alignItems:'center', gap:4 }}><span className="material-symbols-outlined" style={{ fontSize:16 }}>check_circle</span> Saved</span>}
      {error && <span style={{ fontSize:13, color:'var(--red)' }}>{error}</span>}
    </div>
  );
}

function CallingStatusCard({ company, phoneNumber }) {
  const isActive  = company?.calling_enabled;
  const number    = phoneNumber?.number ?? company?.twilio_number;
  const agentName = company?.ai_agent_name || 'Aria';

  if (isActive) return (
    <div style={{ background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.3)', borderRadius:'var(--radius-lg)', padding:'16px 20px', marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#34d399' }} />
        <p style={{ fontSize:13, fontWeight:600, color:'#34d399' }}>AI Calling Active</p>
      </div>
      <p style={{ fontSize:14 }}>Your number: <strong>{number}</strong></p>
      <p style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>{agentName} is answering calls automatically</p>
    </div>
  );

  if (number) return (
    <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:'var(--radius-lg)', padding:'16px 20px', marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--red)' }} />
        <p style={{ fontSize:13, fontWeight:600, color:'var(--red)' }}>AI Calling Paused</p>
      </div>
      <p style={{ fontSize:14 }}>Your number <strong>{number}</strong> is reserved for you</p>
      <p style={{ fontSize:13, color:'var(--muted)', marginTop:4, marginBottom:10 }}>Renew your plan to reactivate</p>
      <a href="/plans" style={{ fontSize:13, padding:'6px 16px', background:'var(--accent)', color:'#fff', borderRadius:'var(--radius)', textDecoration:'none' }}>Upgrade →</a>
    </div>
  );

  return (
    <div style={{ background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.3)', borderRadius:'var(--radius-lg)', padding:'16px 20px', marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--amber)' }} />
        <p style={{ fontSize:13, fontWeight:600, color:'var(--amber)' }}>Number Not Yet Assigned</p>
      </div>
      <p style={{ fontSize:13, color:'var(--muted)' }}>Your AI calling number will be assigned when your plan is activated.</p>
    </div>
  );
}

// ── Main settings component ──────────────────────────────────────────────────

function SettingsInner() {
  const searchParams            = useSearchParams();
  const router                  = useRouter();
  const { user, logout }        = useAuth();
  const { company, refreshCompany } = useCompany();
  const { currency, setCurrency }   = useCurrency();

  const isAdmin = ['admin','super_admin','author'].includes(user?.role);
  const isPro   = ['professional','enterprise'].includes(company?.plan);

  const activeTab = searchParams.get('tab') ?? 'profile';
  function setTab(id) { router.push(`/settings?tab=${id}`); }

  // Theme
  const [theme, setTheme] = useState('light');

  // Profile tab
  const [profile,       setProfile]       = useState({ name:'', city:'', email:'', phone:'' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved,  setProfileSaved]  = useState(false);
  const [profileError,  setProfileError]  = useState('');
  const [logoFile,      setLogoFile]      = useState(null);
  const [logoPreview,   setLogoPreview]   = useState(null);
  const [logoSaving,    setLogoSaving]    = useState(false);
  const [logoSaved,     setLogoSaved]     = useState(false);
  const [logoError,     setLogoError]     = useState('');

  // Notifications tab
  const [settings,   setSettings]   = useState(null);
  const [notiSaving, setNotiSaving] = useState(false);
  const [notiSaved,  setNotiSaved]  = useState(false);
  const [notiError,  setNotiError]  = useState('');

  // Re-engagement campaign
  const [reengEnabled,  setReengEnabled]  = useState(false);
  const [reengDays,     setReengDays]     = useState(30);
  const [reengMsg,      setReengMsg]      = useState('');
  const [reengSaving,   setReengSaving]   = useState(false);
  const [reengSaved,    setReengSaved]    = useState(false);
  const [reengError,    setReengError]    = useState('');

  // Review requests
  const [reviewEnabled, setReviewEnabled] = useState(false);
  const [reviewDelay,   setReviewDelay]   = useState(30);
  const [reviewSaving,  setReviewSaving]  = useState(false);
  const [reviewSaved,   setReviewSaved]   = useState(false);
  const [reviewError,   setReviewError]   = useState('');

  // AI tab
  const [phoneNumber, setPhoneNumber] = useState(null);
  const [customQA,    setCustomQA]    = useState([]);
  const [newQA,       setNewQA]       = useState({ question:'', answer:'' });
  const [showNewQA,   setShowNewQA]   = useState(false);
  const [aiSaving,    setAiSaving]    = useState(false);
  const [aiSaved,     setAiSaved]     = useState(false);
  const [aiError,     setAiError]     = useState('');
  const [ai, setAi] = useState({
    ai_agent_name:'', ai_greeting:'', ai_business_hours:'24/7',
    ai_hours_start:'08:00', ai_hours_end:'22:00', ai_hours_days:'1,2,3,4,5',
    ai_after_hours_msg:'', ai_service_area:'',
    ai_min_hours:1, ai_max_hours:12, ai_advance_notice_hrs:2,
    ai_ask_flight:true, ai_ask_email:true, ai_quote_prices:true, ai_ask_special_req:true,
    ai_languages:'English', ai_vehicle_types:'sedan,suv,van,bus', google_review_url:'',
  });

  // Security tab
  const [pwForm,   setPwForm]   = useState({ current:'', password:'', confirm:'' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved,  setPwSaved]  = useState(false);
  const [pwError,  setPwError]  = useState('');
  const pwStrength = checkPasswordStrength(pwForm.password);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const t = localStorage.getItem('theme') ?? 'light';
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
  }, []);

  useEffect(() => {
    api('/notifications/settings').then(r => r.json()).then(setSettings).catch(console.error);
  }, []);

  useEffect(() => {
    if (!company) return;
    setProfile({
      name:  company.name  || '',
      city:  company.city  || '',
      email: company.email || '',
      phone: company.phone || '',
    });
    setAi(prev => ({
      ...prev,
      ai_agent_name:         company.ai_agent_name         || '',
      ai_greeting:           company.ai_greeting           || '',
      ai_business_hours:     company.ai_business_hours     || '24/7',
      ai_hours_start:        company.ai_hours_start        || '08:00',
      ai_hours_end:          company.ai_hours_end          || '22:00',
      ai_hours_days:         company.ai_hours_days         || '1,2,3,4,5',
      ai_after_hours_msg:    company.ai_after_hours_msg    || '',
      ai_service_area:       company.ai_service_area       || '',
      ai_min_hours:          company.ai_min_hours          ?? 1,
      ai_max_hours:          company.ai_max_hours          ?? 12,
      ai_advance_notice_hrs: company.ai_advance_notice_hrs ?? 2,
      ai_ask_flight:         company.ai_ask_flight         ?? true,
      ai_ask_email:          company.ai_ask_email          ?? true,
      ai_quote_prices:       company.ai_quote_prices       ?? true,
      ai_ask_special_req:    company.ai_ask_special_req    ?? true,
      ai_languages:          company.ai_languages          || 'English',
      ai_vehicle_types:      company.ai_vehicle_types      || 'sedan,suv,van,bus',
      google_review_url:     company.google_review_url     || '',
    }));
    api('/phone-numbers/my-number').then(r => r.json()).then(setPhoneNumber).catch(() => {});
    api('/ai-custom-qa').then(r => r.json()).then(d => setCustomQA(Array.isArray(d) ? d : [])).catch(() => {});
    setReviewEnabled(company.review_request_enabled ?? false);
    setReviewDelay(company.review_request_delay_mins ?? 30);
    setReengEnabled(company.reengagement_enabled ?? false);
    setReengDays(company.reengagement_days ?? 30);
    setReengMsg(company.reengagement_message ?? '');
  }, [company]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }

  async function saveProfile() {
    if (!company?.id) return;
    setProfileSaving(true); setProfileError(''); setProfileSaved(false);
    try {
      const res  = await api(`/companies/${company.id}`, {
        method: 'PATCH',
        body:   JSON.stringify({ name: profile.name, city: profile.city, email: profile.email, phone: profile.phone }),
      });
      const data = await res.json();
      if (!res.ok) { setProfileError(data.error ?? 'Save failed'); return; }
      setProfileSaved(true);
      refreshCompany();
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      setProfileError(err.message ?? 'Save failed');
    } finally { setProfileSaving(false); }
  }

  function onLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file); setLogoError(''); setLogoSaved(false);
    const reader = new FileReader();
    reader.onload = ev => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function saveLogo() {
    if (!logoFile || !company?.id) return;
    setLogoSaving(true); setLogoError(''); setLogoSaved(false);
    try {
      const form = new FormData();
      form.append('logo', logoFile);
      const res  = await api(`/companies/${company.id}/logo`, { method:'PATCH', body:form });
      const data = await res.json();
      if (!res.ok) { setLogoError(data.error ?? 'Upload failed'); return; }
      setLogoSaved(true); setLogoFile(null); setLogoPreview(null);
      refreshCompany();
      setTimeout(() => setLogoSaved(false), 3000);
    } catch (err) {
      setLogoError(err.message ?? 'Upload failed');
    } finally { setLogoSaving(false); }
  }

  async function saveAiSettings() {
    setAiSaving(true); setAiError(''); setAiSaved(false);
    try {
      const res  = await api('/companies/ai-settings', { method:'PATCH', body:JSON.stringify({ ...ai, customQA }) });
      const data = await res.json();
      if (!res.ok) { setAiError(data.error ?? 'Failed to save'); return; }
      setAiSaved(true);
      setTimeout(() => setAiSaved(false), 4000);
    } catch (err) {
      setAiError(err.message ?? 'Failed to save');
    } finally { setAiSaving(false); }
  }

  function toggleNoti(key) {
    if (!isAdmin) return;
    setSettings(s => ({ ...s, [key]: !s[key] }));
    setNotiSaved(false);
  }

  async function saveReengagement() {
    if (!company?.id) return;
    setReengSaving(true); setReengError(''); setReengSaved(false);
    try {
      const res  = await api(`/companies/${company.id}`, {
        method: 'PATCH',
        body:   JSON.stringify({ reengagement_enabled: reengEnabled, reengagement_days: Number(reengDays), reengagement_message: reengMsg }),
      });
      const data = await res.json();
      if (!res.ok) { setReengError(data.error ?? 'Save failed'); return; }
      setReengSaved(true);
      refreshCompany();
      setTimeout(() => setReengSaved(false), 3000);
    } catch (err) {
      setReengError(err.message ?? 'Save failed');
    } finally { setReengSaving(false); }
  }

  async function saveReviewSettings() {
    if (!company?.id) return;
    setReviewSaving(true); setReviewError(''); setReviewSaved(false);
    try {
      const res  = await api(`/companies/${company.id}`, {
        method: 'PATCH',
        body:   JSON.stringify({ review_request_enabled: reviewEnabled, review_request_delay_mins: Number(reviewDelay) }),
      });
      const data = await res.json();
      if (!res.ok) { setReviewError(data.error ?? 'Save failed'); return; }
      setReviewSaved(true);
      refreshCompany();
      setTimeout(() => setReviewSaved(false), 3000);
    } catch (err) {
      setReviewError(err.message ?? 'Save failed');
    } finally { setReviewSaving(false); }
  }

  async function saveNotifications() {
    setNotiSaving(true); setNotiError(''); setNotiSaved(false);
    try {
      const res  = await api('/notifications/settings', { method:'PATCH', body:JSON.stringify(settings) });
      const data = await res.json();
      if (!res.ok) { setNotiError(data.error ?? 'Save failed'); return; }
      setSettings(data); setNotiSaved(true);
      setTimeout(() => setNotiSaved(false), 3000);
    } finally { setNotiSaving(false); }
  }

  async function changePassword() {
    if (!pwForm.current)                     { setPwError('Current password is required'); return; }
    if (pwForm.password.length < 8)          { setPwError('Password must be at least 8 characters'); return; }
    if (pwForm.password !== pwForm.confirm)  { setPwError('Passwords do not match'); return; }
    setPwSaving(true); setPwError(''); setPwSaved(false);
    try {
      await pb.collection('users').update(user.id, {
        oldPassword:     pwForm.current,
        password:        pwForm.password,
        passwordConfirm: pwForm.confirm,
      });
      setPwSaved(true);
      setPwForm({ current:'', password:'', confirm:'' });
      setTimeout(() => setPwSaved(false), 4000);
    } catch (err) {
      setPwError(err.message ?? 'Failed to change password');
    } finally { setPwSaving(false); }
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const selectedVehicles  = (ai.ai_vehicle_types || '').split(',').map(v => v.trim()).filter(Boolean);
  const selectedLanguages = (ai.ai_languages     || '').split(',').map(l => l.trim()).filter(Boolean);
  const selectedDays      = (ai.ai_hours_days    || '').split(',').map(v => v.trim()).filter(Boolean);
  const planInfo          = PLAN_META[company?.plan] ?? PLAN_META.starter;

  const inp  = { padding:'8px 12px', fontSize:13, width:'100%', borderRadius:'var(--radius)', border:'0.5px solid var(--border)', background:'var(--bg)', color:'var(--text)' };
  const txta = { ...inp, resize:'vertical', minHeight:80 };
  const chipStyle = (on) => ({
    fontSize:13, padding:'4px 10px', borderRadius:'var(--radius)', cursor:'pointer',
    border:'0.5px solid var(--border)',
    background: on ? 'var(--accent-bg)' : 'var(--bg)',
    color:      on ? 'var(--accent)'    : 'var(--muted)',
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ width:'100%', maxWidth:720, margin:'0 auto' }}>
      <h1 style={{ fontSize:20, fontWeight:500, marginBottom:20 }}>Settings</h1>

      {/* Tab bar */}
      <div style={{ display:'flex', borderBottom:'0.5px solid var(--border)', marginBottom:28, overflowX:'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'10px 16px', fontSize:13, fontWeight: activeTab===t.id ? 600 : 400,
            background:'none', border:'none', cursor:'pointer', whiteSpace:'nowrap',
            borderBottom: activeTab===t.id ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab===t.id ? 'var(--accent)' : 'var(--muted)',
            marginBottom:-1, transition:'color 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Company Profile ─────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <>
          <Section title="Company details">
            <FullRow label="Company name">
              <input value={profile.name} onChange={e => setProfile(p => ({...p, name:e.target.value}))} placeholder="Ariva Transport" style={inp} disabled={!isAdmin} />
            </FullRow>
            <FullRow label="City">
              <input value={profile.city} onChange={e => setProfile(p => ({...p, city:e.target.value}))} placeholder="Lagos" style={inp} disabled={!isAdmin} />
            </FullRow>
            <FullRow label="Contact email" desc="Used for billing and account notifications">
              <input type="email" value={profile.email} onChange={e => setProfile(p => ({...p, email:e.target.value}))} placeholder="hello@yourcompany.com" style={inp} disabled={!isAdmin} />
            </FullRow>
            <FullRow label="Contact phone" desc="For admin SMS alerts" last>
              <input value={profile.phone} onChange={e => setProfile(p => ({...p, phone:e.target.value}))} placeholder="+234..." style={inp} disabled={!isAdmin} />
            </FullRow>
          </Section>

          {isAdmin && (
            <SaveBar onSave={saveProfile} saving={profileSaving} saved={profileSaved} error={profileError} />
          )}

          {company?.slug && (
            <Section title="Online booking widget">
              <FullRow label="Embed code" desc="Paste this into any website to add a booking form for your customers." last>
                <div style={{ background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--radius)', padding:12, marginBottom:8, fontFamily:'monospace', fontSize:12, color:'var(--muted)', wordBreak:'break-all', lineHeight:1.7 }}>
                  {`<iframe src="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://ariva-dashboard.up.railway.app'}/widget/${company.slug}" width="100%" height="650" frameborder="0" style="border:none;border-radius:12px;"></iframe>`}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button
                    onClick={() => navigator.clipboard.writeText(`<iframe src="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://ariva-dashboard.up.railway.app'}/widget/${company.slug}" width="100%" height="650" frameborder="0" style="border:none;border-radius:12px;"></iframe>`)}
                    style={{ fontSize:12, padding:'6px 14px', display:'flex', alignItems:'center', gap:4 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize:14 }}>content_copy</span>
                    Copy embed code
                  </button>
                  <a
                    href={`/widget/${company.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize:12, padding:'6px 14px', color:'var(--accent)', border:'0.5px solid var(--accent)', borderRadius:'var(--radius)', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize:14 }}>open_in_new</span>
                    Preview widget
                  </a>
                </div>
              </FullRow>
            </Section>
          )}

          <Section title="Company logo">
            <FullRow label="Logo" desc="Shown in the sidebar. Max 5 MB — JPEG, PNG, WebP, or SVG." last>
              <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                {(logoPreview || company?.logo_data || company?.logo_url) && (
                  <img
                    src={logoPreview ?? company.logo_data ?? company.logo_url}
                    alt="Logo"
                    onError={e => { e.currentTarget.style.display='none'; }}
                    style={{ width:56, height:56, objectFit:'contain', borderRadius:8, border:'0.5px solid var(--border)', background:'var(--bg)', padding:4, flexShrink:0 }}
                  />
                )}
                <div style={{ flex:1, minWidth:200 }}>
                  <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml" onChange={onLogoChange} style={{ fontSize:13, width:'100%', marginBottom:8 }} />
                  {logoFile && (
                    <button className="primary" onClick={saveLogo} disabled={logoSaving} style={{ fontSize:13, padding:'6px 16px' }}>
                      {logoSaving ? 'Uploading...' : 'Upload logo'}
                    </button>
                  )}
                  {logoSaved && <p style={{ fontSize:12, color:'var(--green)', marginTop:4 }}>Logo updated — refresh to see it in the sidebar</p>}
                  {logoError && <p style={{ fontSize:12, color:'var(--red)',   marginTop:4 }}>{logoError}</p>}
                </div>
              </div>
            </FullRow>
          </Section>
        </>
      )}

      {/* ── Tab 2: Appearance ─────────────────────────────────────────────── */}
      {activeTab === 'appearance' && (
        <Section title="Appearance">
          <Row label="Theme" desc="Switch between light and dark mode">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:13, color:'var(--muted)' }}>{theme === 'light' ? 'Light' : 'Dark'}</span>
              <Toggle checked={theme === 'dark'} onChange={toggleTheme} />
            </div>
          </Row>
          <Row label="Display currency" desc="All money amounts will show in this currency, converted from NGN at live rates." last>
            <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ padding:'6px 10px', fontSize:13, minWidth:180 }}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
            </select>
          </Row>
        </Section>
      )}

      {/* ── Tab 3: AI Agent & Calling ──────────────────────────────────────── */}
      {activeTab === 'ai' && (
        <>
          {!isPro ? (
            <div style={{ position:'relative', borderRadius:'var(--radius-lg)', overflow:'hidden', background:'var(--surface)', border:'0.5px solid var(--border)' }}>
              <div style={{ filter:'blur(3px)', pointerEvents:'none', userSelect:'none' }}>
                {[
                  ['Agent name','Aria'], ['Custom greeting','Welcome to us, how can I help?'],
                  ['Service area','Lagos and surrounding areas'], ['Ask for flight number',''],
                  ['Ask for customer email',''], ['Quote prices on call',''],
                  ['Ask for special requests',''], ['Minimum booking duration','1 hr'],
                  ['Advance notice required','2 hrs'], ['Languages','English'],
                ].map(([label, val], i, arr) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom: i<arr.length-1 ? '0.5px solid var(--border)' : 'none', gap:16 }}>
                    <p style={{ fontSize:14, fontWeight:500 }}>{label}</p>
                    {val
                      ? <span style={{ fontSize:13, color:'var(--muted)' }}>{val}</span>
                      : <div style={{ width:36, height:20, borderRadius:10, background:'var(--border)' }} />
                    }
                  </div>
                ))}
              </div>
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(var(--bg-rgb,255,255,255),0.82)', backdropFilter:'blur(4px)' }}>
                <span className="material-symbols-outlined" style={{ fontSize:36, color:'var(--muted)', marginBottom:10 }}>lock</span>
                <p style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>Professional plan required</p>
                <p style={{ fontSize:13, color:'var(--muted)', marginBottom:20, textAlign:'center', maxWidth:260 }}>Upgrade to customise your AI agent, set business hours, and manage call behaviour.</p>
                <a href="/plans" style={{ fontSize:13, padding:'9px 24px', background:'var(--accent)', color:'#fff', borderRadius:'var(--radius)', textDecoration:'none', fontWeight:500 }}>View plans →</a>
              </div>
            </div>
          ) : (
            <>
              <CallingStatusCard company={company} phoneNumber={phoneNumber} />

              <Section title="Agent Identity">
                <Row label="Agent name" desc="The name your AI uses when answering calls">
                  <input value={ai.ai_agent_name} onChange={e => setAi(a => ({...a, ai_agent_name:e.target.value}))} placeholder="Aria" style={{ ...inp, width:200 }} />
                </Row>
                <FullRow label="Custom greeting" desc="Leave blank to use the default greeting (max 200 chars)" last>
                  <textarea value={ai.ai_greeting} onChange={e => setAi(a => ({...a, ai_greeting:e.target.value.slice(0,200)}))} placeholder={`Welcome to ${company?.name || 'us'}, I'm Aria, how can I help you today?`} style={txta} />
                  <p style={{ fontSize:11, color:'var(--muted)', marginTop:4, textAlign:'right' }}>{(ai.ai_greeting||'').length}/200</p>
                </FullRow>
              </Section>

              <Section title="Business Hours">
                <FullRow label="Call handling">
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {[['24/7','Answer all calls anytime'],['business_hours','Only answer during set hours'],['custom','Set specific days and hours']].map(([val,lbl]) => (
                      <label key={val} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}>
                        <input type="radio" name="ai_bh" value={val} checked={ai.ai_business_hours===val} onChange={() => setAi(a => ({...a, ai_business_hours:val}))} />
                        <strong>{val === '24/7' ? '24/7' : val.replace('_',' ')}</strong> — {lbl}
                      </label>
                    ))}
                  </div>
                </FullRow>
                {ai.ai_business_hours !== '24/7' && (
                  <FullRow label="Hours">
                    <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                      <span style={{ fontSize:13, color:'var(--muted)' }}>From</span>
                      <input type="time" value={ai.ai_hours_start} onChange={e => setAi(a => ({...a, ai_hours_start:e.target.value}))} style={{ padding:'6px 10px', fontSize:13 }} />
                      <span style={{ fontSize:13, color:'var(--muted)' }}>To</span>
                      <input type="time" value={ai.ai_hours_end}   onChange={e => setAi(a => ({...a, ai_hours_end:e.target.value}))}   style={{ padding:'6px 10px', fontSize:13 }} />
                    </div>
                  </FullRow>
                )}
                {ai.ai_business_hours === 'custom' && (
                  <FullRow label="Days">
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {[['1','Mon'],['2','Tue'],['3','Wed'],['4','Thu'],['5','Fri'],['6','Sat'],['7','Sun']].map(([d,lbl]) => (
                        <label key={d} style={chipStyle(selectedDays.includes(d))}>
                          <input type="checkbox" checked={selectedDays.includes(d)} onChange={() => {
                            const next = selectedDays.includes(d) ? selectedDays.filter(v=>v!==d) : [...selectedDays,d];
                            setAi(a => ({...a, ai_hours_days:next.sort().join(',')}));
                          }} style={{ display:'none' }} />
                          {lbl}
                        </label>
                      ))}
                    </div>
                  </FullRow>
                )}
                <FullRow label="After-hours message" desc="Played when someone calls outside operating hours" last>
                  <textarea value={ai.ai_after_hours_msg} onChange={e => setAi(a => ({...a, ai_after_hours_msg:e.target.value}))} placeholder="We are currently closed. Our hours are 8AM to 10PM Monday to Friday." style={txta} />
                </FullRow>
              </Section>

              <Section title="Booking Rules">
                <FullRow label="Service area" desc="Aria mentions this when asked about coverage">
                  <input value={ai.ai_service_area} onChange={e => setAi(a => ({...a, ai_service_area:e.target.value}))} placeholder="Lagos and surrounding areas" style={inp} />
                </FullRow>
                <Row label="Minimum booking duration">
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <input type="number" min={1} max={24} value={ai.ai_min_hours} onChange={e => setAi(a => ({...a, ai_min_hours:+e.target.value}))} style={{ ...inp, width:70, textAlign:'center' }} />
                    <span style={{ fontSize:13, color:'var(--muted)' }}>hrs</span>
                  </div>
                </Row>
                <Row label="Maximum booking duration">
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <input type="number" min={1} max={72} value={ai.ai_max_hours} onChange={e => setAi(a => ({...a, ai_max_hours:+e.target.value}))} style={{ ...inp, width:70, textAlign:'center' }} />
                    <span style={{ fontSize:13, color:'var(--muted)' }}>hrs</span>
                  </div>
                </Row>
                <Row label="Advance notice required" desc="Minimum notice before a booking can be made">
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <input type="number" min={0} max={48} value={ai.ai_advance_notice_hrs} onChange={e => setAi(a => ({...a, ai_advance_notice_hrs:+e.target.value}))} style={{ ...inp, width:70, textAlign:'center' }} />
                    <span style={{ fontSize:13, color:'var(--muted)' }}>hrs</span>
                  </div>
                </Row>
                <FullRow label="Vehicle types offered">
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {VEHICLE_OPTIONS.map(({ value, label }) => (
                      <label key={value} style={chipStyle(selectedVehicles.includes(value))}>
                        <input type="checkbox" checked={selectedVehicles.includes(value)} onChange={() => {
                          const next = selectedVehicles.includes(value) ? selectedVehicles.filter(v=>v!==value) : [...selectedVehicles,value];
                          setAi(a => ({...a, ai_vehicle_types:next.join(',')}));
                        }} style={{ display:'none' }} />
                        {label}
                      </label>
                    ))}
                  </div>
                </FullRow>
                <FullRow label="Languages" last>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {LANGUAGE_OPTIONS.map(lang => (
                      <label key={lang} style={chipStyle(selectedLanguages.includes(lang))}>
                        <input type="checkbox" checked={selectedLanguages.includes(lang)} onChange={() => {
                          const next = selectedLanguages.includes(lang) ? selectedLanguages.filter(l=>l!==lang) : [...selectedLanguages,lang];
                          setAi(a => ({...a, ai_languages:next.join(',')}));
                        }} style={{ display:'none' }} />
                        {lang}
                      </label>
                    ))}
                  </div>
                </FullRow>
              </Section>

              <Section title="Call Behaviour">
                {[
                  { key:'ai_ask_flight',      label:'Ask for flight number',    desc:'Aria will ask for flight number on airport pickups'        },
                  { key:'ai_ask_email',        label:'Ask for customer email',   desc:'Aria will request an email for booking confirmation'       },
                  { key:'ai_quote_prices',     label:'Quote prices on the call', desc:'Aria will quote prices from your pricing rules'            },
                  { key:'ai_ask_special_req',  label:'Ask for special requests', desc:'Aria will ask if the customer has any special requirements' },
                ].map(({ key, label, desc }, i, arr) => (
                  <Row key={key} label={label} desc={desc} last={i===arr.length-1}>
                    <Toggle checked={!!ai[key]} onChange={() => setAi(a => ({...a, [key]:!a[key]}))} />
                  </Row>
                ))}
              </Section>

              <Section title={`Custom Q&A (${customQA.length}/20)`}>
                {customQA.length === 0 && !showNewQA && (
                  <div style={{ padding:'20px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>No Q&A pairs yet.</div>
                )}
                {customQA.map((qa, i) => (
                  <div key={i} style={{ padding:'12px 20px', borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:13, fontWeight:500, marginBottom:2 }}>{qa.question}</p>
                      <p style={{ fontSize:12, color:'var(--muted)', lineHeight:1.5 }}>{qa.answer}</p>
                    </div>
                    <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                      <Toggle checked={qa.active !== false} onChange={() => setCustomQA(q => q.map((item,idx) => idx===i ? {...item, active:!item.active} : item))} />
                      <button onClick={() => setCustomQA(q => q.filter((_,idx) => idx!==i))} style={{ fontSize:12, padding:'4px 8px', color:'var(--red)', border:'0.5px solid var(--red)', background:'var(--red-bg)', borderRadius:'var(--radius)' }}>Remove</button>
                    </div>
                  </div>
                ))}
                {showNewQA && (
                  <div style={{ padding:'16px 20px', borderBottom:'0.5px solid var(--border)', display:'flex', flexDirection:'column', gap:10 }}>
                    <input value={newQA.question} onChange={e => setNewQA(q => ({...q, question:e.target.value}))} placeholder="Do you offer wheelchair accessible vehicles?" style={inp} />
                    <textarea value={newQA.answer} onChange={e => setNewQA(q => ({...q, answer:e.target.value}))} placeholder="Yes, we have fully accessible vehicles available on request." style={{ ...txta, minHeight:60 }} />
                    <div style={{ display:'flex', gap:8 }}>
                      <button className="primary" onClick={() => {
                        if (!newQA.question.trim() || !newQA.answer.trim() || customQA.length >= 20) return;
                        setCustomQA(q => [...q, {...newQA, active:true}]);
                        setNewQA({ question:'', answer:'' });
                        setShowNewQA(false);
                      }} style={{ fontSize:13, padding:'7px 16px' }}>Save</button>
                      <button onClick={() => { setShowNewQA(false); setNewQA({ question:'', answer:'' }); }} style={{ fontSize:13, padding:'7px 16px' }}>Cancel</button>
                    </div>
                  </div>
                )}
                <div style={{ padding:'12px 20px' }}>
                  <button onClick={() => { if (customQA.length < 20) setShowNewQA(true); }} disabled={customQA.length >= 20} style={{ fontSize:13, padding:'7px 16px' }}>+ Add Q&amp;A</button>
                </div>
              </Section>

              <Section title="Reviews">
                <FullRow label="Google review link" desc="Aria can share this with satisfied customers after a trip" last>
                  <input value={ai.google_review_url} onChange={e => setAi(a => ({...a, google_review_url:e.target.value}))} placeholder="https://g.page/r/your-review-link" style={inp} />
                </FullRow>
              </Section>

              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
                <button className="primary" onClick={saveAiSettings} disabled={aiSaving} style={{ padding:'10px 28px', fontSize:14 }}>
                  {aiSaving ? 'Saving...' : 'Save AI Settings'}
                </button>
                {aiSaved && <span style={{ fontSize:13, color:'var(--green)', display:'flex', alignItems:'center', gap:4 }}><span className="material-symbols-outlined" style={{ fontSize:16 }}>check_circle</span> Saved — applies to next call</span>}
                {aiError && <span style={{ fontSize:13, color:'var(--red)' }}>{aiError}</span>}
              </div>

              {(company?.twilio_number || phoneNumber?.number) && (
                <p style={{ fontSize:13, color:'var(--muted)', marginBottom:28 }}>
                  Test your AI: call <strong>{phoneNumber?.number ?? company?.twilio_number}</strong>
                </p>
              )}
            </>
          )}
        </>
      )}

      {/* ── Tab 4: Notifications & SMS ─────────────────────────────────────── */}
      {activeTab === 'notifications' && (
        <>
          {!settings ? (
            <p style={{ fontSize:13, color:'var(--muted)', padding:'20px 0' }}>Loading settings…</p>
          ) : (
            <>
              {SETTINGS_CONFIG.map(({ group, items }) => (
                <Section key={group} title={group}>
                  {items.map(({ key, label, desc }, i) => (
                    <Row key={key} label={label} desc={desc} last={i===items.length-1}>
                      <Toggle checked={!!settings[key]} onChange={() => toggleNoti(key)} disabled={!isAdmin} />
                    </Row>
                  ))}
                </Section>
              ))}

              <Section title="Admin contact">
                <Row label="Admin alert number" desc="Override the default admin phone for SMS alerts." last>
                  <input
                    value={settings.admin_phone_override ?? ''}
                    onChange={e => { if (isAdmin) { setSettings(s => ({...s, admin_phone_override:e.target.value})); setNotiSaved(false); } }}
                    placeholder={isAdmin ? '+234...' : 'Set by admin'}
                    disabled={!isAdmin}
                    style={{ width:160, padding:'6px 10px', fontSize:13 }}
                  />
                </Row>
              </Section>

              {isAdmin ? (
                <SaveBar onSave={saveNotifications} saving={notiSaving} saved={notiSaved} error={notiError} />
              ) : (
                <p style={{ fontSize:13, color:'var(--muted)' }}>Contact an admin to change notification settings.</p>
              )}

              <Section title="Customer re-engagement">
                <Row label="Enable re-engagement campaign" desc="Send a win-back SMS to customers who haven't booked in a while">
                  <Toggle checked={reengEnabled} onChange={() => { if (isAdmin) setReengEnabled(e => !e); }} disabled={!isAdmin} />
                </Row>
                <Row label="Inactivity window" desc="Contact customers with no booking in this many days">
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input type="number" min={7} max={365} value={reengDays} onChange={e => setReengDays(+e.target.value)} disabled={!isAdmin} style={{ width:70, padding:'6px 10px', fontSize:13, textAlign:'center' }} />
                    <span style={{ fontSize:13, color:'var(--muted)' }}>days</span>
                  </div>
                </Row>
                <FullRow label="Message" desc="Use {name} for customer name and {company} for your company name. 'Reply STOP to opt out' is appended automatically." last>
                  <textarea
                    value={reengMsg}
                    onChange={e => setReengMsg(e.target.value)}
                    disabled={!isAdmin}
                    placeholder={`Hi {name}, it's been a while since your last trip with {company}. We'd love to have you back — book now and get the same great service.`}
                    style={txta}
                  />
                  <p style={{ fontSize:11, color:'var(--muted)', marginTop:4, textAlign:'right' }}>{reengMsg.length} chars</p>
                </FullRow>
              </Section>
              {isAdmin && (
                <SaveBar onSave={saveReengagement} saving={reengSaving} saved={reengSaved} error={reengError} label="Save re-engagement settings" />
              )}

              <Section title="Post-trip review requests">
                <Row label="Send review request SMS" desc="Automatically text customers a Google review link after their trip completes">
                  <Toggle checked={reviewEnabled} onChange={() => { if (isAdmin) setReviewEnabled(e => !e); }} disabled={!isAdmin} />
                </Row>
                <Row label="Send delay" desc="How long after the trip completes to send the message" last>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input
                      type="number" min={5} max={1440} value={reviewDelay}
                      onChange={e => setReviewDelay(+e.target.value)}
                      disabled={!isAdmin}
                      style={{ width:70, padding:'6px 10px', fontSize:13, textAlign:'center' }}
                    />
                    <span style={{ fontSize:13, color:'var(--muted)' }}>mins</span>
                  </div>
                </Row>
              </Section>
              {!company?.google_review_url && reviewEnabled && (
                <p style={{ fontSize:12, color:'var(--amber)', marginBottom:20 }}>
                  Set your Google review link in the <strong>AI Agent & Calling</strong> tab to activate this feature.
                </p>
              )}
              {isAdmin && (
                <SaveBar onSave={saveReviewSettings} saving={reviewSaving} saved={reviewSaved} error={reviewError} label="Save review settings" />
              )}
            </>
          )}
        </>
      )}

      {/* ── Tab 5: Billing & Plan ──────────────────────────────────────────── */}
      {activeTab === 'billing' && (
        <>
          <Section title="Current plan">
            <div style={{ padding:'20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                <span style={{
                  fontSize:13, fontWeight:600, padding:'4px 14px', borderRadius:'var(--radius)',
                  background:planInfo.bg, color:planInfo.color,
                  border:`0.5px solid ${planInfo.color}`, textTransform:'capitalize',
                }}>
                  {planInfo.label}
                </span>
                <span style={{ fontSize:12, color:'var(--muted)' }}>{planInfo.subtitle}</span>
              </div>
              {company?.plan === 'starter' && (
                <>
                  <p style={{ fontSize:13, color:'var(--muted)', marginBottom:16, lineHeight:1.6 }}>
                    Starter includes 50 bookings/month, 1 team member, and the core dashboard. AI calling is not included.
                  </p>
                  <a href="/plans" style={{ display:'inline-block', fontSize:13, padding:'9px 24px', background:'var(--accent)', color:'#fff', borderRadius:'var(--radius)', textDecoration:'none', fontWeight:500 }}>
                    Upgrade to Professional →
                  </a>
                </>
              )}
              {company?.plan !== 'starter' && (
                <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6 }}>
                  Your subscription is managed through Paystack. Contact support at <strong>support@ariva.app</strong> to modify or cancel.
                </p>
              )}
            </div>
          </Section>

          <Section title="Plan comparison">
            {[
              { feature:'Bookings / month',  starter:'50',        pro:'Unlimited',   enterprise:'Unlimited'  },
              { feature:'Team members',      starter:'1',         pro:'10',          enterprise:'Unlimited'  },
              { feature:'AI voice agent',    starter:'—',         pro:'Included',    enterprise:'Included'   },
              { feature:'SMS notifications', starter:'Included',  pro:'Included',    enterprise:'Included'   },
              { feature:'PDF invoices',      starter:'—',         pro:'Coming soon', enterprise:'Coming soon'},
              { feature:'Flight tracking',   starter:'—',         pro:'Coming soon', enterprise:'Coming soon'},
              { feature:'Re-engagement SMS', starter:'—',         pro:'Coming soon', enterprise:'Coming soon'},
              { feature:'Support',           starter:'Community', pro:'Email',       enterprise:'Dedicated'  },
            ].map(({ feature, starter, pro, enterprise }, i, arr) => {
              const val = company?.plan === 'enterprise' ? enterprise : company?.plan === 'professional' ? pro : starter;
              const dim = val === '—';
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderBottom: i<arr.length-1 ? '0.5px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize:13 }}>{feature}</span>
                  <span style={{ fontSize:13, fontWeight:500, color: dim ? 'var(--muted)' : 'var(--accent)' }}>{val}</span>
                </div>
              );
            })}
          </Section>
        </>
      )}

      {/* ── Tab 6: Security ────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <>
          <Section title="Change password">
            <FullRow label="Current password">
              <input type="password" value={pwForm.current} onChange={e => setPwForm(f => ({...f, current:e.target.value}))} placeholder="••••••••" style={inp} />
            </FullRow>
            <FullRow label="New password">
              <input type="password" value={pwForm.password} onChange={e => setPwForm(f => ({...f, password:e.target.value}))} placeholder="••••••••" style={inp} />
              {pwForm.password && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                  <div style={{ flex:1, height:4, borderRadius:2, background:'var(--border)', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:2, background:pwStrength.color, width:`${(pwStrength.score/4)*100}%`, transition:'width 0.3s, background 0.3s' }} />
                  </div>
                  <span style={{ fontSize:11, color:pwStrength.color, minWidth:36 }}>{pwStrength.label}</span>
                </div>
              )}
            </FullRow>
            <FullRow label="Confirm new password" last>
              <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({...f, confirm:e.target.value}))} placeholder="••••••••" style={inp} />
            </FullRow>
          </Section>

          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
            <button
              className="primary"
              onClick={changePassword}
              disabled={pwSaving || !pwForm.current || !pwForm.password || !pwForm.confirm}
              style={{ padding:'9px 24px', fontSize:14 }}
            >
              {pwSaving ? 'Updating...' : 'Change password'}
            </button>
            {pwSaved && <span style={{ fontSize:13, color:'var(--green)', display:'flex', alignItems:'center', gap:4 }}><span className="material-symbols-outlined" style={{ fontSize:16 }}>check_circle</span> Password updated</span>}
            {pwError && <span style={{ fontSize:13, color:'var(--red)' }}>{pwError}</span>}
          </div>

          <Section title="Account">
            <Row label="Email" desc="Your login email address" last>
              <span style={{ fontSize:13, color:'var(--muted)' }}>{user?.email}</span>
            </Row>
          </Section>

          <div style={{ marginTop:8 }}>
            <button
              onClick={() => { logout(); window.location.href = '/login'; }}
              style={{ fontSize:13, padding:'9px 24px', color:'var(--red)', border:'0.5px solid var(--red)', background:'var(--red-bg)', borderRadius:'var(--radius)', cursor:'pointer' }}
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsInner />
    </Suspense>
  );
}
