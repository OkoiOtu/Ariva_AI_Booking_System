'use client';
import './globals.css';
import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { AuthProvider, useAuth, getInitials, getDisplayName } from '@/lib/auth';
import RightSidebar from '@/components/RightSidebar';
import { CompanyProvider, useCompany } from '@/lib/companyContext';
import { CurrencyProvider } from '@/lib/currencyContext';

const NAV = [
  { href:'/dashboard', label:'Overview',      icon:'grid_view'                     },
  { href:'/bookings',  label:'Bookings',      icon:'event_available'               },
  { href:'/leads',     label:'Leads',         icon:'contact_phone'                 },
  { href:'/calls',     label:'All calls',     icon:'call_log'                      },
  { href:'/calendar',  label:'Calendar',      icon:'calendar_month'                 },
  { href:'/customers', label:'Customers',     icon:'person_search'                  },
  { href:'/revenue',   label:'Revenue',      icon:'bar_chart' },
  { href:'/activity',  label:'Activity log', icon:'history'   },

  { href:'/drivers',   label:'Drivers',       icon:'airline_seat_recline_normal' },
  { href:'/pricing',   label:'Pricing',       icon:'payments'                    },
  { href:'/users',       label:'Users',         icon:'group',    adminOnly:true    },
];

const PUBLIC_PATHS = ['/login', '/signup', '/cancel', '/forgot-password', '/reset-password', '/verify-email', '/plans', '/checkout', '/widget', '/onboarding'];
const LANDING_PATH = '/';

function isAdmin(user) {
  return ['admin','super_admin','author'].includes(user?.role);
}

function Icon({ name, size=20 }) {
  return <span className="material-symbols-outlined" style={{ fontSize:size }}>{name}</span>;
}

/* ── Full-screen loading spinner ── */
function LoadingSpinner() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--bg)', gap:16 }}>
      <div style={{
        width:48, height:48,
        border:'3px solid var(--border)',
        borderTop:'3px solid var(--accent)',
        borderRadius:'50%',
        animation:'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function LogoutDialog({ onConfirm, onCancel }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 16px' }}>
      <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'28px 24px', width:'100%', maxWidth:340 }}>
        <p style={{ fontSize:15, fontWeight:500, marginBottom:8 }}>Confirm sign out</p>
        <p style={{ fontSize:13, color:'var(--muted)', marginBottom:24, lineHeight:1.6 }}>
          Are you sure you want to sign out?
        </p>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onCancel}>Cancel</button>
          <button className="danger" onClick={onConfirm}>Yes, sign out</button>
        </div>
      </div>
    </div>
  );
}

function NavItem({ href, label, icon, active, collapsed, onClick }) {
  return (
    <Link href={href} onClick={onClick} title={collapsed ? label : ''} style={{
      display:'flex', alignItems:'center',
      gap: collapsed ? 0 : 10,
      padding: collapsed ? '10px 0' : '9px 12px',
      justifyContent:'center',
      borderRadius:'var(--radius)',
      fontWeight: active ? 500 : 400,
      fontSize:13,
      color:      active ? 'var(--accent)' : 'var(--text)',
      background: active ? 'var(--accent-bg)' : 'transparent',
      textDecoration:'none',
      transition:'background 0.15s',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background='var(--bg)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = active ? 'var(--accent-bg)' : 'transparent'; }}
    >
      <Icon name={icon} size={20} />
      {!collapsed && <span style={{ flex:1 }}>{label}</span>}
    </Link>
  );
}

function SideBtn({ icon, label, collapsed, onClick, style={} }) {
  return (
    <button onClick={onClick} title={collapsed ? label : ''} style={{
      display:'flex', alignItems:'center',
      gap: collapsed ? 0 : 8,
      padding: collapsed ? '9px 0' : '9px 10px',
      justifyContent:'center',
      borderRadius:'var(--radius)',
      fontSize:13, width:'100%', minHeight:40,
      background:'transparent', border:'none',
      cursor:'pointer', transition:'background 0.15s',
      textAlign:'center',
      ...style,
    }}
    onMouseEnter={e => e.currentTarget.style.opacity='0.8'}
    onMouseLeave={e => e.currentTarget.style.opacity='1'}
    >
      <Icon name={icon} size={20} />
      {!collapsed && <span style={{ marginLeft:2 }}>{label}</span>}
    </button>
  );
}

function SidebarContent({ collapsed, theme, toggleTheme, user, company, onSignOut, onNavClick }) {
  const pathname = usePathname();
  const initials = getInitials(user);
  const display  = getDisplayName(user);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      {collapsed ? (
        <div style={{ height:52, borderBottom:'0.5px solid var(--border)', flexShrink:0 }} />
      ) : (
        <div style={{ padding:'12px 14px', borderBottom:'0.5px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {/* Company logo or Ariva brand mark — emoji is always rendered;
                img overlays it and hides itself on load error */}
            <div style={{ position:'relative', width:44, height:44, flexShrink:0 }}>
              <div style={{ width:44, height:44, borderRadius:8, background:'linear-gradient(135deg,#6c63ff,#a78bfa)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🚗</div>
              {(company?.logo_data || company?.logo_url) && (
                <img
                  src={company.logo_data ?? company.logo_url}
                  alt={company.name ?? 'Logo'}
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                  style={{ position:'absolute', inset:0, width:44, height:44, borderRadius:8, objectFit:'contain', background:'var(--bg)', border:'0.5px solid var(--border)', padding:3 }}
                />
              )}
            </div>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--accent)', letterSpacing:'-0.01em', lineHeight:1.2 }}>
              {company?.name ? company.name.split(' ')[0] : 'Ariva'}
            </p>
          </div>

          {company && (
            <div style={{ marginTop:3, overflow:'hidden', whiteSpace:'nowrap' }}>
              <div style={{ display:'inline-block', fontSize:12, fontWeight:500, animation:'companyMarqueeLeft 10s linear infinite' }}>
                {company.name}
              </div>
            </div>
          )}
          {company && (
            <p style={{ fontSize:10, color:'var(--muted)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.2 }}>
              {company.plan ?? 'starter'} plan
            </p>
          )}

          <style>{`
            @keyframes companyMarqueeLeft {
              0%   { transform: translateX(110%); }
              100% { transform: translateX(-110%); }
            }
          `}</style>
        </div>
      )}

      <nav style={{ flex:1, padding: collapsed ? '8px 6px' : '8px 8px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto' }}>
        {NAV.filter(n => {
          if (n.authorOnly) return user?.role === 'author';
          if (n.superAdminOnly) return user?.role === 'super_admin' || user?.role === 'author';
          if (n.adminOnly) return isAdmin(user);
          return true;
        }).map(({ href, label, icon }) => {
          const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
          return <NavItem key={href} href={href} label={label} icon={icon} active={active} collapsed={collapsed} onClick={onNavClick} />;
        })}
      </nav>

      <div style={{ borderTop:'0.5px solid var(--border)', padding: collapsed ? '10px 6px' : '10px 10px', flexShrink:0, display:'flex', flexDirection:'column', gap:4 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding: collapsed ? '6px 0' : '6px 4px', justifyContent:'center', marginBottom:2 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background:'var(--accent-bg)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600 }}>
            {initials}
          </div>
          {!collapsed && (
            <div style={{ overflow:'hidden', flex:1 }}>
              <p style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{display}</p>
              <p style={{ fontSize:11, color:'var(--muted)', textTransform:'capitalize' }}>
                {user?.role?.replace('_',' ')}
                {user?.role === 'author' && <span style={{ marginLeft:6, fontSize:10, background:'linear-gradient(135deg,#6c63ff,#a78bfa)', color:'#fff', padding:'1px 6px', borderRadius:20 }}>Dev</span>}
              </p>
            </div>
          )}
        </div>

        <Link
          href="/settings"
          title={collapsed ? 'Settings' : ''}
          style={{
            display:'flex', alignItems:'center',
            gap: collapsed ? 0 : 8,
            padding: collapsed ? '9px 0' : '9px 10px',
            justifyContent:'center',
            borderRadius:'var(--radius)',
            fontSize:13, width:'100%', minHeight:40,
            color:'var(--muted)', border:'0.5px solid var(--border)',
            textDecoration:'none', transition:'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity='0.8'}
          onMouseLeave={e => e.currentTarget.style.opacity='1'}
        >
          <Icon name="settings" size={20} />
          {!collapsed && <span style={{ marginLeft:2 }}>Settings</span>}
        </Link>

        <SideBtn
          icon="logout" label="Sign out"
          collapsed={collapsed} onClick={onSignOut}
          style={{ color:'var(--red)', background:'var(--red-bg)', borderRadius:'var(--radius)' }}
        />
      </div>
    </div>
  );
}

function Shell({ children }) {
  const { user, loading, logout } = useAuth();
  const { company } = useCompany();
  const router   = useRouter();
  const pathname = usePathname();
  const isPublic = pathname === LANDING_PATH || PUBLIC_PATHS.some(p => pathname.startsWith(p));

  const [theme,        setTheme]        = useState('light');
  const [collapsed,    setCollapsed]    = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [showLogout,   setShowLogout]   = useState(false);
  const [loggingOut,   setLoggingOut]   = useState(false);
  const [isMobile,     setIsMobile]     = useState(false);
  const [hideRightBar, setHideRightBar] = useState(false);
  const didRedirect = useRef(false);

  useEffect(() => {
    const savedTheme     = localStorage.getItem('theme') ?? 'light';
    const savedCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    setTheme(savedTheme);
    setCollapsed(savedCollapsed);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Reveal Material Symbols icons only after the font file has loaded.
    // Without this, icon ligature text (e.g. "event_available") flashes on first load.
    document.fonts.ready.then(() => document.body.classList.add('fonts-loaded'));

    const mqMobile = window.matchMedia('(max-width: 768px)');
    const mqNarrow = window.matchMedia('(max-width: 1050px)');
    setIsMobile(mqMobile.matches);
    setHideRightBar(mqNarrow.matches);
    const hM = e => setIsMobile(e.matches);
    const hN = e => setHideRightBar(e.matches);
    mqMobile.addEventListener('change', hM);
    mqNarrow.addEventListener('change', hN);
    return () => { mqMobile.removeEventListener('change', hM); mqNarrow.removeEventListener('change', hN); };
  }, []);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar_collapsed', String(next));
  }

  useEffect(() => {
    if (loading) return;

    // User is authenticated — clear any previous redirect lock.
    if (user) {
      didRedirect.current = false;
    }

    // Only redirect once per auth state change
    if (!user && !isPublic && !didRedirect.current) {
      didRedirect.current = true;
      router.replace('/login');
    }
    // Keep landing page accessible; only auto-redirect logged-in users away from signup.
    if (user && pathname.startsWith('/signup')) {
      router.replace('/dashboard');
    }
    // New users who authenticated (Google or email) but haven't set up a company yet.
    if (user && !user.company_id && !pathname.startsWith('/onboarding')) {
      router.replace('/onboarding');
    }
  }, [user, loading, isPublic, pathname, router]);

  // Reset transient UI state on navigation
  useEffect(() => {
    setShowLogout(false);
    setMobileOpen(false);
    setLoggingOut(false);
  }, [pathname]);

  // Show spinner while auth is loading or logout is in progress
  if (loading || loggingOut) return <LoadingSpinner />;

  if (isPublic || !user) return <>{children}</>;

  const initials    = getInitials(user);
  const displayName = getDisplayName(user);

  function handleLogout() {
    setShowLogout(false);
    setLoggingOut(true);
    didRedirect.current = false;
    logout();
    router.replace('/login');
  }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>

      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position:'fixed', inset:0, zIndex:40, background:'rgba(0,0,0,0.4)' }} />
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <aside style={{
          width: collapsed ? 64 : 220, flexShrink:0,
          background:'var(--surface)', borderRight:'0.5px solid var(--border)',
          height:'100vh', overflow:'hidden',
          transition:'width 0.2s ease', position:'relative', zIndex:10,
        }}>
          <button onClick={toggleCollapsed} title={collapsed ? 'Expand' : 'Collapse'} style={{
            position:'absolute', top:14, right: collapsed ? '50%' : 12,
            transform: collapsed ? 'translateX(50%)' : 'none',
            zIndex:1, padding:'4px', border:'0.5px solid var(--border)',
            borderRadius:'var(--radius)', background:'var(--surface)',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', transition:'right 0.2s',
          }}>
            <Icon name={collapsed ? 'menu' : 'chevron_left'} size={16} />
          </button>
          <SidebarContent collapsed={collapsed} theme={theme} toggleTheme={toggleTheme} user={user} company={company} onSignOut={() => setShowLogout(true)} />
        </aside>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <aside style={{
          position:'fixed', top:0, left:0, bottom:0, width:240, zIndex:50,
          background:'var(--surface)', borderRight:'0.5px solid var(--border)',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition:'transform 0.25s ease', overflowY:'auto',
        }}>
          <SidebarContent collapsed={false} theme={theme} toggleTheme={toggleTheme} user={user} company={company}
            onSignOut={() => setShowLogout(true)} onNavClick={() => setMobileOpen(false)} />
        </aside>
      )}

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* Mobile topbar */}
        {isMobile && (
          <div style={{ height:52, flexShrink:0, padding:'0 16px', background:'var(--surface)', borderBottom:'0.5px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <button onClick={() => setMobileOpen(true)} style={{ border:'none', background:'none', padding:'6px', display:'flex', alignItems:'center' }}>
              <Icon name="menu" size={22} />
            </button>
            <p style={{ fontSize:14, fontWeight:500 }}>AI Booking</p>
            <Link href="/settings" style={{ border:'none', background:'none', padding:'6px', display:'flex', alignItems:'center', color:'var(--muted)', textDecoration:'none' }}>
              <Icon name="settings" size={20} />
            </Link>
          </div>
        )}

        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
          <main style={{ flex:1, overflowY:'auto', padding: isMobile ? '20px 16px' : '0' }}>
            <div style={{ maxWidth: (hideRightBar && !isMobile) ? 1100 : 920, margin:'0 auto', padding: isMobile ? '0' : '32px 36px' }}>
              {children}
            </div>
          </main>
          {!isMobile && !hideRightBar && <RightSidebar />}
        </div>
      </div>

      {showLogout && (
        <LogoutDialog onConfirm={handleLogout} onCancel={() => setShowLogout(false)} />
      )}
    </div>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Preload Material Symbols font to avoid FOUT */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body>
        <AuthProvider>
          <CompanyProvider>
            <CurrencyProvider>
              <Shell>{children}</Shell>
            </CurrencyProvider>
          </CompanyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
