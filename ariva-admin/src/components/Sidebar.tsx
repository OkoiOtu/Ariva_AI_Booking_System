'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const NAV = [
  { label: 'Overview',       href: '/',              icon: 'dashboard' },
  { label: 'Companies',      href: '/companies',     icon: 'domain' },
  { label: 'All Bookings',   href: '/bookings',      icon: 'calendar_month' },
  { label: 'All Calls',      href: '/calls',         icon: 'call' },
  { label: 'Revenue',        href: '/revenue',       icon: 'payments' },
  { label: 'Payments',       href: '/payments',      icon: 'credit_card' },
  { label: 'All Users',      href: '/users',         icon: 'group' },
  { label: 'Number Pool',    href: '/phone-pool',    icon: 'phone'         },
  { label: 'System Health',  href: '/system',        icon: 'monitor_heart' },
  { label: 'Announcements',  href: '/announcements', icon: 'campaign' },
  { label: 'Settings',       href: '/settings',      icon: 'settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <aside style={{
      width: 'var(--sidebar-w)', flexShrink: 0,
      background: 'var(--surface)', borderRight: '0.5px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'var(--accent-bg)', border: '1px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--accent)' }}>shield</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <p style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>Ariva Admin</p>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 5px',
                background: 'var(--accent)', color: '#fff', borderRadius: 4,
                letterSpacing: '0.05em',
              }}>ADMIN</span>
            </div>
            <p style={{ fontSize: 10, color: 'var(--muted)' }}>Platform Console</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
        {NAV.map(item => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 'var(--radius)',
              marginBottom: 2,
              background: active ? 'var(--accent-bg)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--muted)',
              borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
              fontSize: 13, fontWeight: active ? 500 : 400,
              transition: 'all 0.15s',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: '12px 12px', borderTop: '0.5px solid var(--border)' }}>
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.full_name || 'Author'}
          </p>
          <p style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </p>
        </div>
        <button onClick={logout} style={{ width: '100%', fontSize: 12, padding: '6px', color: 'var(--red)', background: 'var(--red-bg)', border: 'none' }}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
