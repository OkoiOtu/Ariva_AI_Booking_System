'use client';
import { useAuth } from '@/lib/auth';

export default function SettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Syne, sans-serif', marginBottom: 24 }}>Settings</h1>

      <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Account info */}
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Account</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[['Name', user?.full_name || '—'], ['Email', user?.email || '—'], ['Role', user?.role || '—']].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</p>
                <p style={{ fontSize: 13, fontWeight: 500 }}>{val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Platform info */}
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Platform URLs</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['Dashboard', 'https://ariva-dashboard.up.railway.app'],
              ['Backend API', process.env.NEXT_PUBLIC_API_URL],
              ['PocketBase', process.env.NEXT_PUBLIC_PB_URL],
            ].map(([label, url]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</p>
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'monospace' }}>{url}</a>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div style={{ background: 'var(--red-bg)', border: '0.5px solid var(--red)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--red)', marginBottom: 12 }}>Session</p>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Signing out clears your session. You will need to log in again.</p>
          <button onClick={logout} className="danger" style={{ fontSize: 13 }}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
