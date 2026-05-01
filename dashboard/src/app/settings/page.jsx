'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useCurrency, CURRENCIES } from '@/lib/currencyContext';

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

function Toggle({ checked, onChange, disabled }) {
  return (
    <div onClick={disabled ? undefined : onChange} style={{
      width:40, height:22, borderRadius:11, flexShrink:0,
      cursor: disabled ? 'not-allowed' : 'pointer',
      background: checked ? 'var(--accent)' : 'var(--border)',
      position:'relative', transition:'background 0.2s',
      opacity: disabled ? 0.5 : 1,
    }}>
      <div style={{
        width:16, height:16, borderRadius:'50%', background:'#fff',
        position:'absolute', top:3,
        left: checked ? 21 : 3,
        transition:'left 0.2s',
      }} />
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

function SettingRow({ label, desc, children, last }) {
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

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin' || user?.role === 'super_admin';
  const { currency, setCurrency } = useCurrency();

  const [theme,    setTheme]    = useState('light');
  const [settings, setSettings] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('theme') ?? 'light';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  useEffect(() => {
    fetch(API() + '/notifications/settings')
      .then(r => r.json())
      .then(setSettings)
      .catch(console.error);
  }, []);

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
      const res  = await fetch(API() + '/notifications/settings', {
        method: 'PATCH', headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to save'); return; }
      setSettings(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  return (
    <div style={{ width:'100%', maxWidth:640, margin:'0 auto' }}>
      <h1 style={{ fontSize:20, fontWeight:500, marginBottom:24 }}>Settings</h1>

      {/* Appearance */}
      <Section title="Appearance">
        <SettingRow label="Theme" desc="Switch between light and dark mode">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:13, color:'var(--muted)' }}>{theme === 'light' ? 'Light' : 'Dark'}</span>
            <Toggle checked={theme === 'dark'} onChange={toggleTheme} />
          </div>
        </SettingRow>
        <SettingRow label="Display currency" desc="All money amounts across the dashboard will show in this currency, converted from NGN using live rates." last>
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            style={{ padding:'6px 10px', fontSize:13, minWidth:180 }}
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code} — {c.name}
              </option>
            ))}
          </select>
        </SettingRow>
      </Section>

      {/* Notification settings */}
      {settings && (
        <>
          {SETTINGS_CONFIG.map(({ group, items }) => (
            <Section key={group} title={group}>
              {items.map(({ key, label, desc }, i) => (
                <SettingRow key={key} label={label} desc={desc} last={i === items.length - 1}>
                  <Toggle checked={!!settings[key]} onChange={() => toggle(key)} disabled={!isAdmin} />
                </SettingRow>
              ))}
            </Section>
          ))}

          {/* Admin phone override */}
          <Section title="Admin contact">
            <SettingRow label="Admin alert number" desc="Override the default admin phone for SMS alerts. Leave blank to use the server default." last>
              <input
                value={settings.admin_phone_override ?? ''}
                onChange={e => { if (isAdmin) { setSettings(s => ({ ...s, admin_phone_override: e.target.value })); setSaved(false); } }}
                placeholder={isAdmin ? '+234...' : 'Set by admin'}
                disabled={!isAdmin}
                style={{ width:160, padding:'6px 10px', fontSize:13 }}
              />
            </SettingRow>
          </Section>

          {isAdmin && (
            <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:4 }}>
              <button className="primary" onClick={save} disabled={saving} style={{ padding:'9px 24px' }}>
                {saving ? 'Saving...' : 'Save settings'}
              </button>
              {saved && (
                <span style={{ fontSize:13, color:'var(--green)', display:'flex', alignItems:'center', gap:4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:16 }}>check_circle</span> Saved
                </span>
              )}
              {error && <span style={{ fontSize:13, color:'var(--red)' }}>{error}</span>}
            </div>
          )}

          {!isAdmin && (
            <p style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>
              Contact an admin to change notification settings.
            </p>
          )}
        </>
      )}
    </div>
  );
}
