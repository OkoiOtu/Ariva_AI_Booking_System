'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useCurrency, CURRENCIES } from '@/lib/currencyContext';
import { useCompany } from '@/lib/companyContext';
import { api } from '@/lib/api';

const API = () => process.env.NEXT_PUBLIC_API_URL;

const SETTINGS_CONFIG = [
  {
    group: 'Customer SMS',
    items: [
      { key:'sms_booking_confirmed', label:'Booking confirmed',  desc:'Send customer an SMS when their booking is confirmed'  },
      { key:'sms_booking_cancelled', label:'Booking cancelled',  desc:'Notify customer when a booking is cancelled'           },
      { key:'sms_reminder_1hr',      label:'1-hour reminder',    desc:'Send customer a reminder SMS 1 hour before pickup'     },
    ],
  },
  {
    group: 'Admin alerts',
    items: [
      { key:'sms_admin_new_booking', label:'New booking alert',  desc:'Send admin an SMS when a new booking is confirmed'     },
      { key:'sms_admin_new_lead',    label:'New lead alert',     desc:'Send admin an SMS when a call is logged as a lead'     },
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

export default function SettingsPage() {
  const { user }                  = useAuth();
  const { company }               = useCompany();
  const { currency, setCurrency } = useCurrency();
  const isAdmin = ['admin','super_admin','author'].includes(user?.role);
  const isPro   = ['professional','enterprise'].includes(company?.plan);

  const [theme,       setTheme]       = useState('light');
  const [settings,    setSettings]    = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState('');
  const [logoFile,    setLogoFile]    = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoSaving,  setLogoSaving]  = useState(false);
  const [logoSaved,   setLogoSaved]   = useState(false);
  const [logoError,   setLogoError]   = useState('');

  // AI state
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
  }, [company]);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }

  function toggle(key) {
    if (!isAdmin) return;
    setSettings(s => ({ ...s, [key]: !s[key] }));
    setSaved(false);
  }

  async function save() {
    setSaving(true); setError(''); setSaved(false);
    try {
      const res  = await api('/notifications/settings', { method:'PATCH', body:JSON.stringify(settings) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to save'); return; }
      setSettings(data); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  function onLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoError('');
    setLogoSaved(false);
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
      const res  = await api(`/companies/${company.id}/logo`, { method: 'PATCH', body: form });
      const data = await res.json();
      if (!res.ok) { setLogoError(data.error ?? 'Upload failed'); return; }
      setLogoSaved(true);
      setLogoFile(null);
      setTimeout(() => setLogoSaved(false), 3000);
    } catch (err) {
      setLogoError(err.message ?? 'Upload failed');
    } finally { setLogoSaving(false); }
  }

  async function saveAiSettings() {
    setAiSaving(true); setAiError(''); setAiSaved(false);
    try {
      const res  = await api('/companies/ai-settings', { method:'PATCH', body: JSON.stringify({ ...ai, customQA }) });
      const data = await res.json();
      if (!res.ok) { setAiError(data.error ?? 'Failed to save AI settings'); return; }
      setAiSaved(true);
      setTimeout(() => setAiSaved(false), 4000);
    } catch (err) {
      setAiError(err.message ?? 'Failed to save AI settings');
    } finally { setAiSaving(false); }
  }

  const selectedVehicles  = (ai.ai_vehicle_types || '').split(',').map(v => v.trim()).filter(Boolean);
  const selectedLanguages = (ai.ai_languages     || '').split(',').map(l => l.trim()).filter(Boolean);
  const selectedDays      = (ai.ai_hours_days    || '').split(',').map(v => v.trim()).filter(Boolean);

  const inp  = { padding:'8px 12px', fontSize:13, width:'100%', borderRadius:'var(--radius)', border:'0.5px solid var(--border)', background:'var(--bg)', color:'var(--text)' };
  const txta = { ...inp, resize:'vertical', minHeight:80 };

  const chipStyle = (selected) => ({
    fontSize:13, padding:'4px 10px', borderRadius:'var(--radius)', cursor:'pointer',
    border:'0.5px solid var(--border)',
    background: selected ? 'var(--accent-bg)' : 'var(--bg)',
    color:      selected ? 'var(--accent)'    : 'var(--muted)',
  });

  return (
    <div style={{ width:'100%', maxWidth:680, margin:'0 auto' }}>
      <h1 style={{ fontSize:20, fontWeight:500, marginBottom:24 }}>Settings</h1>

      {/* Company profile */}
      <Section title="Company profile">
        <FullRow label="Company logo" desc="Shown in the sidebar. Max 5 MB — JPEG, PNG, WebP, or SVG." last>
          <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            {/* Current / preview */}
            {(logoPreview || company?.logo || company?.logo_url) && (
              <img
                src={logoPreview ?? (company?.logo
                  ? `${process.env.NEXT_PUBLIC_PB_URL}/api/files/pbc_3866053794/${company.id}/${company.logo}`
                  : company.logo_url)}
                alt="Logo"
                style={{ width:56, height:56, objectFit:'contain', borderRadius:8, border:'0.5px solid var(--border)', background:'var(--bg)', padding:4, flexShrink:0 }}
              />
            )}
            <div style={{ flex:1, minWidth:200 }}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                onChange={onLogoChange}
                style={{ fontSize:13, width:'100%', marginBottom:8 }}
              />
              {logoFile && (
                <button
                  className="primary"
                  onClick={saveLogo}
                  disabled={logoSaving}
                  style={{ fontSize:13, padding:'6px 16px' }}
                >
                  {logoSaving ? 'Uploading...' : 'Upload logo'}
                </button>
              )}
              {logoSaved  && <p style={{ fontSize:12, color:'var(--green)', marginTop:4 }}>Logo updated — refresh to see it in the sidebar</p>}
              {logoError  && <p style={{ fontSize:12, color:'var(--red)',   marginTop:4 }}>{logoError}</p>}
            </div>
          </div>
        </FullRow>
      </Section>

      {/* Appearance */}
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

      {/* AI Agent & Calling */}
      <div style={{ marginBottom:28 }}>
        <p style={{ fontSize:12, fontWeight:500, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>AI Agent &amp; Calling</p>

        {!isPro ? (
          <div style={{ position:'relative', borderRadius:'var(--radius-lg)', overflow:'hidden', background:'var(--surface)', border:'0.5px solid var(--border)' }}>
            <div style={{ padding:'40px 24px', filter:'blur(2px)', pointerEvents:'none', userSelect:'none', color:'var(--muted)', fontSize:13 }}>
              AI agent settings preview...
            </div>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(var(--bg-rgb, 255,255,255),0.85)', backdropFilter:'blur(4px)' }}>
              <span className="material-symbols-outlined" style={{ fontSize:32, color:'var(--muted)', marginBottom:8 }}>lock</span>
              <p style={{ fontSize:14, fontWeight:500, marginBottom:6 }}>Professional plan required</p>
              <p style={{ fontSize:13, color:'var(--muted)', marginBottom:16 }}>Upgrade to customise your AI agent</p>
              <a href="/plans" style={{ fontSize:13, padding:'8px 20px', background:'var(--accent)', color:'#fff', borderRadius:'var(--radius)', textDecoration:'none' }}>View plans →</a>
            </div>
          </div>
        ) : (
          <>
            <CallingStatusCard company={company} phoneNumber={phoneNumber} />

            {/* Agent Identity */}
            <Section title="Agent Identity">
              <Row label="Agent name" desc="The name your AI uses when answering calls">
                <input value={ai.ai_agent_name} onChange={e => setAi(a => ({...a, ai_agent_name: e.target.value}))} placeholder="Aria" style={{ ...inp, width:200 }} />
              </Row>
              <FullRow label="Custom greeting" desc="Leave blank to use the default greeting (max 200 chars)" last>
                <textarea value={ai.ai_greeting} onChange={e => setAi(a => ({...a, ai_greeting: e.target.value.slice(0,200)}))} placeholder={`Welcome to ${company?.name || 'us'}, I'm Aria, how can I help you today?`} style={txta} />
                <p style={{ fontSize:11, color:'var(--muted)', marginTop:4, textAlign:'right' }}>{(ai.ai_greeting||'').length}/200</p>
              </FullRow>
            </Section>

            {/* Business Hours */}
            <Section title="Business Hours">
              <FullRow label="Call handling">
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[['24/7','Answer all calls anytime'],['business_hours','Only answer during set hours'],['custom','Set specific days and hours']].map(([val,lbl]) => (
                    <label key={val} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}>
                      <input type="radio" name="ai_bh" value={val} checked={ai.ai_business_hours === val} onChange={() => setAi(a => ({...a, ai_business_hours: val}))} />
                      <strong>{val === '24/7' ? '24/7' : val.replace('_',' ')}</strong> — {lbl}
                    </label>
                  ))}
                </div>
              </FullRow>
              {ai.ai_business_hours !== '24/7' && (
                <FullRow label="Hours">
                  <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                    <span style={{ fontSize:13, color:'var(--muted)' }}>From</span>
                    <input type="time" value={ai.ai_hours_start} onChange={e => setAi(a => ({...a, ai_hours_start: e.target.value}))} style={{ padding:'6px 10px', fontSize:13 }} />
                    <span style={{ fontSize:13, color:'var(--muted)' }}>To</span>
                    <input type="time" value={ai.ai_hours_end} onChange={e => setAi(a => ({...a, ai_hours_end: e.target.value}))} style={{ padding:'6px 10px', fontSize:13 }} />
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
                          setAi(a => ({...a, ai_hours_days: next.sort().join(',')}));
                        }} style={{ display:'none' }} />
                        {lbl}
                      </label>
                    ))}
                  </div>
                </FullRow>
              )}
              <FullRow label="After-hours message" desc="Played when someone calls outside operating hours" last>
                <textarea value={ai.ai_after_hours_msg} onChange={e => setAi(a => ({...a, ai_after_hours_msg: e.target.value}))} placeholder="We are currently closed. Our hours are 8AM to 10PM Monday to Friday." style={txta} />
              </FullRow>
            </Section>

            {/* Booking Rules */}
            <Section title="Booking Rules">
              <FullRow label="Service area" desc="Aria mentions this when asked about coverage">
                <input value={ai.ai_service_area} onChange={e => setAi(a => ({...a, ai_service_area: e.target.value}))} placeholder="Lagos and surrounding areas" style={inp} />
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
                        setAi(a => ({...a, ai_vehicle_types: next.join(',')}));
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
                        setAi(a => ({...a, ai_languages: next.join(',')}));
                      }} style={{ display:'none' }} />
                      {lang}
                    </label>
                  ))}
                </div>
              </FullRow>
            </Section>

            {/* Call Behaviour */}
            <Section title="Call Behaviour">
              {[
                { key:'ai_ask_flight',     label:'Ask for flight number',    desc:'Aria will ask for flight number on airport pickups' },
                { key:'ai_ask_email',      label:'Ask for customer email',   desc:'Aria will request an email for booking confirmation' },
                { key:'ai_quote_prices',   label:'Quote prices on the call', desc:'Aria will quote prices from your pricing rules' },
                { key:'ai_ask_special_req',label:'Ask for special requests', desc:'Aria will ask if the customer has any special requirements' },
              ].map(({ key, label, desc }, i, arr) => (
                <Row key={key} label={label} desc={desc} last={i===arr.length-1}>
                  <Toggle checked={!!ai[key]} onChange={() => setAi(a => ({...a, [key]: !a[key]}))} />
                </Row>
              ))}
            </Section>

            {/* Custom Q&A */}
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

            {/* Reviews */}
            <Section title="Reviews">
              <FullRow label="Google review link" desc="Aria can share this with satisfied customers" last>
                <input value={ai.google_review_url} onChange={e => setAi(a => ({...a, google_review_url: e.target.value}))} placeholder="https://g.page/r/your-review-link" style={inp} />
              </FullRow>
            </Section>

            {/* Save AI */}
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
      </div>

      {/* SMS Notification settings */}
      {settings && (
        <>
          {SETTINGS_CONFIG.map(({ group, items }) => (
            <Section key={group} title={group}>
              {items.map(({ key, label, desc }, i) => (
                <Row key={key} label={label} desc={desc} last={i===items.length-1}>
                  <Toggle checked={!!settings[key]} onChange={() => toggle(key)} disabled={!isAdmin} />
                </Row>
              ))}
            </Section>
          ))}

          <Section title="Admin contact">
            <Row label="Admin alert number" desc="Override the default admin phone for SMS alerts." last>
              <input
                value={settings.admin_phone_override ?? ''}
                onChange={e => { if (isAdmin) { setSettings(s => ({...s, admin_phone_override: e.target.value})); setSaved(false); } }}
                placeholder={isAdmin ? '+234...' : 'Set by admin'}
                disabled={!isAdmin}
                style={{ width:160, padding:'6px 10px', fontSize:13 }}
              />
            </Row>
          </Section>

          {isAdmin && (
            <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:4 }}>
              <button className="primary" onClick={save} disabled={saving} style={{ padding:'9px 24px' }}>
                {saving ? 'Saving...' : 'Save settings'}
              </button>
              {saved && <span style={{ fontSize:13, color:'var(--green)', display:'flex', alignItems:'center', gap:4 }}><span className="material-symbols-outlined" style={{ fontSize:16 }}>check_circle</span> Saved</span>}
              {error && <span style={{ fontSize:13, color:'var(--red)' }}>{error}</span>}
            </div>
          )}
          {!isAdmin && <p style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>Contact an admin to change notification settings.</p>}
        </>
      )}
    </div>
  );
}
