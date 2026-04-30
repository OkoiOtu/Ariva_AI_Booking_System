'use client';
import { useEffect, useState } from 'react';
import { pingHealth, pingPocketBase } from '@/lib/api';

type ServiceStatus = 'checking' | 'operational' | 'degraded' | 'down';

function StatusBadge({ status }: { status: ServiceStatus }) {
  const map: Record<ServiceStatus, [string, string]> = {
    operational: ['var(--green-bg)', 'var(--green)'],
    degraded:    ['var(--amber-bg)', 'var(--amber)'],
    down:        ['var(--red-bg)',   'var(--red)'],
    checking:    ['var(--surface-2)','var(--muted)'],
  };
  const [bg, color] = map[status];
  return (
    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500, background: bg, color }}>
      {status}
    </span>
  );
}

function ServiceCard({ name, status, icon, detail }: { name: string; status: ServiceStatus; icon: string; detail?: string }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px',
      borderLeft: `3px solid ${status === 'operational' ? 'var(--green)' : status === 'down' ? 'var(--red)' : status === 'degraded' ? 'var(--amber)' : 'var(--border)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--muted)' }}>{icon}</span>
          <p style={{ fontSize: 14, fontWeight: 500 }}>{name}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      {detail && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{detail}</p>}
    </div>
  );
}

export default function SystemPage() {
  const [backend,    setBackend]    = useState<ServiceStatus>('checking');
  const [pocketbase, setPocketbase] = useState<ServiceStatus>('checking');
  const [lastCheck,  setLastCheck]  = useState<string>('');

  async function checkAll() {
    setBackend('checking'); setPocketbase('checking');
    const [be, pb] = await Promise.all([pingHealth(), pingPocketBase()]);
    setBackend(be ? 'operational' : 'down');
    setPocketbase(pb ? 'operational' : 'down');
    setLastCheck(new Date().toLocaleTimeString());
  }

  useEffect(() => {
    checkAll();
    const t = setInterval(checkAll, 30000);
    return () => clearInterval(t);
  }, []);

  const allOk = backend === 'operational' && pocketbase === 'operational';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>System Health</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            Real-time service status · Last checked: {lastCheck || '—'}
          </p>
        </div>
        <button onClick={checkAll} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span> Refresh
        </button>
      </div>

      {/* Overall status banner */}
      <div style={{
        background: allOk ? 'var(--green-bg)' : 'var(--red-bg)',
        border: `0.5px solid ${allOk ? 'var(--green)' : 'var(--red)'}`,
        borderRadius: 'var(--radius-lg)', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
      }}>
        <span className="material-symbols-outlined" style={{ color: allOk ? 'var(--green)' : 'var(--red)', fontSize: 22 }}>
          {allOk ? 'check_circle' : 'warning'}
        </span>
        <p style={{ fontSize: 13, fontWeight: 500, color: allOk ? 'var(--green)' : 'var(--red)' }}>
          {allOk ? 'All systems operational' : 'One or more services may be degraded'}
        </p>
      </div>

      {/* Service cards */}
      <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Core Services</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))', gap: 12, marginBottom: 28 }}>
        <ServiceCard name="Backend API"  status={backend}    icon="api"           detail={process.env.NEXT_PUBLIC_API_URL} />
        <ServiceCard name="PocketBase"   status={pocketbase} icon="database"       detail={process.env.NEXT_PUBLIC_PB_URL} />
        <ServiceCard name="Vapi.ai"      status="checking"   icon="mic"            detail="Voice AI agent (requires manual check)" />
        <ServiceCard name="Twilio SMS"   status="checking"   icon="sms"            detail="SMS gateway (requires manual check)" />
        <ServiceCard name="Resend Email" status="checking"   icon="mail"           detail="Transactional email (requires manual check)" />
        <ServiceCard name="Paystack"     status="checking"   icon="credit_card"    detail="Payment gateway (requires manual check)" />
      </div>

      {/* Service URLs for manual checking */}
      <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Service Dashboards</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          ['PocketBase Admin',  `${process.env.NEXT_PUBLIC_PB_URL}/_/`,         'database'],
          ['Vapi Dashboard',    'https://dashboard.vapi.ai',                     'mic'],
          ['Twilio Console',    'https://console.twilio.com',                    'phone'],
          ['Resend Dashboard',  'https://resend.com/overview',                   'mail'],
          ['Paystack Dashboard','https://dashboard.paystack.com',                'credit_card'],
          ['Railway Projects',  'https://railway.app/dashboard',                 'cloud'],
        ].map(([label, url, icon]) => (
          <a key={label} href={url} target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
            background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--accent)' }}>{icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 500 }}>{label}</p>
              <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{url}</p>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--muted)' }}>open_in_new</span>
          </a>
        ))}
      </div>
    </div>
  );
}
