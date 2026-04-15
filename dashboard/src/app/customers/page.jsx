'use client';
import { useState } from 'react';
import { formatDatetime, formatDuration } from '@/lib/formatters';
import StatusBadge from '@/components/StatusBadge';
import BookingDetailModal from '@/components/BookingDetailModal';

const API = () => process.env.NEXT_PUBLIC_API_URL;

const CURRENCY_SYMBOLS = { NGN:'₦', USD:'$', GBP:'£', EUR:'€' };

export default function CustomersPage() {
  const [phone,    setPhone]    = useState('');
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState(null); // null = not searched yet
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState(null);

  async function search(e) {
    e.preventDefault();
    const q = phone.trim();
    if (!q) return;
    setQuery(q);
    setLoading(true);
    setResults(null);
    try {
      const res  = await fetch(`${API()}/bookings?perPage=200&search=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.items ?? []);
    } catch (err) {
      console.error('[customers] search failed:', err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  // Summary stats
  const stats = results ? {
    total:     results.length,
    completed: results.filter(b => b.status === 'completed').length,
    cancelled: results.filter(b => b.status === 'cancelled').length,
    totalHours: results.reduce((sum, b) => sum + (Number(b.duration_hours) || 0), 0),
    totalSpent: results.filter(b => b.quoted_price).reduce((sum, b) => sum + Number(b.quoted_price), 0),
    currency:   results.find(b => b.quoted_currency)?.quoted_currency ?? 'NGN',
  } : null;

  const callerName = results?.[0]?.caller_name ?? '';

  return (
    <div style={{ width:'100%' }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:20, fontWeight:500 }}>Customer history</h1>
        <p style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>
          Look up a phone number to see all bookings for that customer.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={search} style={{ display:'flex', gap:8, marginBottom:24, maxWidth:480 }}>
        <input
          value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="Enter phone number or name..."
          style={{ flex:1, padding:'9px 14px', fontSize:14, borderRadius:'var(--radius)' }}
        />
        <button type="submit" className="primary" style={{ padding:'9px 20px', fontSize:14 }}>
          Search
        </button>
        {results && (
          <button type="button" onClick={() => { setResults(null); setPhone(''); setQuery(''); }} style={{ padding:'9px 12px' }}>
            Clear
          </button>
        )}
      </form>

      {loading && <p style={{ color:'var(--muted)' }}>Searching...</p>}

      {results !== null && !loading && (
        <>
          {results.length === 0 ? (
            <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'48px 24px', textAlign:'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize:36, color:'var(--muted)', display:'block', marginBottom:10 }}>search_off</span>
              <p style={{ color:'var(--muted)', fontSize:14 }}>No bookings found for "{query}"</p>
            </div>
          ) : (
            <>
              {/* Customer summary card */}
              <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'20px 24px', marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:'var(--accent-bg)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:600, flexShrink:0 }}>
                    {(callerName || query)[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize:15, fontWeight:500 }}>{callerName || 'Unknown name'}</p>
                    <p style={{ fontSize:13, color:'var(--muted)' }}>{query}</p>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:12 }}>
                  {[
                    { label:'Total bookings', value: stats.total,            color:'var(--accent)'  },
                    { label:'Completed trips', value: stats.completed,        color:'var(--green)'   },
                    { label:'Cancellations',   value: stats.cancelled,        color:'var(--red)'     },
                    { label:'Total hours',     value: `${stats.totalHours}h`, color:'var(--blue)'    },
                    ...(stats.totalSpent > 0 ? [{
                      label:'Total spent',
                      value: `${CURRENCY_SYMBOLS[stats.currency]??''}${stats.totalSpent.toLocaleString()}`,
                      color:'var(--amber)',
                    }] : []),
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background:'var(--bg)', borderRadius:'var(--radius)', padding:'12px 14px' }}>
                      <p style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>{label}</p>
                      <p style={{ fontSize:20, fontWeight:500, color }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Booking history table */}
              <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
                <div style={{ padding:'14px 20px', borderBottom:'0.5px solid var(--border)' }}>
                  <p style={{ fontWeight:500 }}>Booking history</p>
                </div>
                <div className="table-scroll">
                  <table style={{ width:'100%', borderCollapse:'collapse', minWidth:560 }}>
                    <thead>
                      <tr style={{ borderBottom:'0.5px solid var(--border)' }}>
                        {['Reference','Pickup time','Address','Duration','Price','Status'].map(h => (
                          <th key={h} style={{ textAlign:'left', padding:'8px 16px', fontSize:12, color:'var(--muted)', fontWeight:500, whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.sort((a,b) => new Date(b.created)-new Date(a.created)).map(b => (
                        <tr
                          key={b.id}
                          onDoubleClick={() => setSelected(b)}
                          title="Double-click to view full details"
                          style={{ borderBottom:'0.5px solid var(--border)', cursor:'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background='var(--bg)'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}
                        >
                          <td style={{ padding:'10px 16px', fontFamily:'monospace', fontSize:12, color:'var(--accent)', whiteSpace:'nowrap' }}>{b.reference}</td>
                          <td style={{ padding:'10px 16px', fontSize:13, whiteSpace:'nowrap' }}>{formatDatetime(b.pickup_datetime)}</td>
                          <td style={{ padding:'10px 16px', fontSize:13, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.pickup_address}</td>
                          <td style={{ padding:'10px 16px', fontSize:13, whiteSpace:'nowrap' }}>{formatDuration(b.duration_hours)}</td>
                          <td style={{ padding:'10px 16px', fontSize:13, whiteSpace:'nowrap' }}>
                            {b.quoted_price
                              ? `${CURRENCY_SYMBOLS[b.quoted_currency]??''}${Number(b.quoted_price).toLocaleString()}`
                              : '—'}
                          </td>
                          <td style={{ padding:'10px 16px' }}>
                            <StatusBadge status={b.status || 'confirmed'} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {selected && <BookingDetailModal booking={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
