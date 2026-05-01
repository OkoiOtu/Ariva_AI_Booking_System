'use client';
import { useAuth } from '@/lib/auth';
import { useCurrency, CURRENCIES } from '@/lib/currencyContext';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{title}</p>
      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, desc, last, children }: { label: string; desc?: string; last?: boolean; children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: last ? 'none' : '0.5px solid var(--border)', gap: 16 }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{label}</p>
        {desc && <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { currency, setCurrency } = useCurrency();

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Syne, sans-serif', marginBottom: 24 }}>Settings</h1>

      <div style={{ maxWidth: 580, display: 'flex', flexDirection: 'column', gap: 4 }}>

        {/* Account */}
        <Section title="Account">
          {[['Name', user?.full_name || '—'], ['Email', user?.email || '—'], ['Role', user?.role || '—']].map(([label, val], i, arr) => (
            <Row key={label} label={label} last={i === arr.length - 1}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>{val}</p>
            </Row>
          ))}
        </Section>

        {/* Display */}
        <Section title="Display">
          <Row
            label="Display currency"
            desc="All revenue and payment amounts are converted from NGN using live exchange rates."
            last
          >
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              style={{ padding: '6px 10px', fontSize: 13, minWidth: 200 }}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code} — {c.name}
                </option>
              ))}
            </select>
          </Row>
        </Section>

        {/* Platform URLs */}
        <Section title="Platform URLs">
          {[
            ['Dashboard',   process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'https://ariva-dashboard.up.railway.app'],
            ['Backend API', process.env.NEXT_PUBLIC_API_URL ?? ''],
            ['PocketBase',  process.env.NEXT_PUBLIC_PB_URL  ?? ''],
          ].map(([label, url], i, arr) => (
            <Row key={label} label={label} last={i === arr.length - 1}>
              <a href={url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'right' }}>
                {url}
              </a>
            </Row>
          ))}
        </Section>

        {/* Session */}
        <Section title="Session">
          <Row label="Sign out" desc="Clears your session. You will need to log in again." last>
            <button onClick={logout} className="danger" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
              Sign out
            </button>
          </Row>
        </Section>

      </div>
    </div>
  );
}
