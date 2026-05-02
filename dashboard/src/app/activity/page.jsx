'use client';
import { useEffect, useState, useRef } from 'react';
import { timeAgo } from '@/lib/formatters';
import { api } from '@/lib/api';

const ACTION_LABELS = {
  booking_confirmed: { label: 'Booking confirmed',   color: 'var(--accent)',  bg: 'var(--accent-bg)',  icon: 'event_available'  },
  on_trip:           { label: 'Trip started',        color: 'var(--blue)',    bg: 'var(--blue-bg)',    icon: 'directions_car'   },
  completed:         { label: 'Trip completed',      color: 'var(--green)',   bg: 'var(--green-bg)',   icon: 'task_alt'         },
  cancelled:         { label: 'Booking cancelled',   color: 'var(--red)',     bg: 'var(--red-bg)',     icon: 'cancel'           },
  lead_created:      { label: 'Lead created',        color: 'var(--amber)',   bg: 'var(--amber-bg)',   icon: 'contact_phone'    },
  login_success:     { label: 'Login',               color: 'var(--green)',   bg: 'var(--green-bg)',   icon: 'login'            },
  login_failed:      { label: 'Failed login',        color: 'var(--red)',     bg: 'var(--red-bg)',     icon: 'warning'          },
  login_locked:      { label: 'Account locked',      color: 'var(--red)',     bg: 'var(--red-bg)',     icon: 'lock'             },
  login_suspended:   { label: 'Suspended attempted', color: 'var(--amber)',   bg: 'var(--amber-bg)',   icon: 'block'            },
  logout:            { label: 'Logout',              color: 'var(--gray)',    bg: 'var(--gray-bg)',    icon: 'logout'           },
  driver_assigned:   { label: 'Driver assigned',    color: 'var(--blue)',    bg: 'var(--blue-bg)',    icon: 'assignment_ind'   },
  driver_unassigned: { label: 'Driver unassigned',  color: 'var(--gray)',    bg: 'var(--gray-bg)',    icon: 'person_remove'    },
  reminder_sent:     { label: 'Reminder sent',      color: 'var(--blue)',    bg: 'var(--blue-bg)',    icon: 'notifications'    },
};

const FILTERS = [
  { value: '',                  label: 'All'       },
  { value: 'booking_confirmed', label: 'Bookings'  },
  { value: 'lead_created',      label: 'Leads'     },
  { value: 'on_trip',           label: 'On trip'   },
  { value: 'completed',         label: 'Completed' },
  { value: 'cancelled',         label: 'Cancelled' },
  { value: 'login_success',     label: 'Logins'    },
  { value: 'login_failed',      label: 'Failed'    },
  { value: 'login_locked',      label: 'Locked'    },
];

function ActionBadge({ action }) {
  const meta = ACTION_LABELS[action] ?? {
    label: action, color: 'var(--gray)', bg: 'var(--gray-bg)', icon: 'info',
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
      background: meta.bg, color: meta.color, whiteSpace: 'nowrap',
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

export default function ActivityPage() {
  const [logs,    setLogs]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [filter,  setFilter]  = useState('');
  const [loading, setLoading] = useState(true);
  const mounted = useRef(false);
  const PER_PAGE = 30;

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, perPage: PER_PAGE });
      if (filter) params.set('action', filter);
      const res  = await api(`/activity?${params}`);
      const data = await res.json();
      setLogs(data.items ?? []);
      setTotal(data.totalItems ?? 0);
    } catch (err) {
      console.error('[activity] fetch failed:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
    load();
    const interval = setInterval(load, 15000);
    return () => { mounted.current = false; clearInterval(interval); };
  }, [page, filter]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div style={{ width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>Activity log</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            {total} total entries — updates in real time
          </p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', padding: 4, borderRadius: 'var(--radius)', flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(1); }}
              style={{
                border: 'none', borderRadius: 6, padding: '5px 12px',
                fontSize: 12, cursor: 'pointer',
                fontWeight: filter === f.value ? 500 : 400,
                background: filter === f.value ? 'var(--surface)' : 'transparent',
                color: filter === f.value ? 'var(--text)' : 'var(--muted)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log table */}
      <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div className="table-scroll">
          {loading ? (
            <p style={{ padding: 24, color: 'var(--muted)' }}>Loading...</p>
          ) : logs.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--muted)', display: 'block', marginBottom: 10 }}>history</span>
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>No activity yet.</p>
              <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
                Activity is logged automatically when bookings, leads, and trips are processed.
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                  {['Event', 'Actor', 'Detail', 'When'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '10px 16px',
                      fontSize: 12, color: 'var(--muted)', fontWeight: 500, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: i < logs.length - 1 ? '0.5px solid var(--border)' : 'none',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <ActionBadge action={log.action} />
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {log.actor || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.detail || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {timeAgo(log.created)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
          <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--muted)' }}>
            Page {page} of {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
        </div>
      )}

    </div>
  );
}
