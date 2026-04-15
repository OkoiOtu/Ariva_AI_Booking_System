'use client';
import { useEffect, useState } from 'react';
import StatusBadge from '@/components/StatusBadge';
import BookingDetailModal from '@/components/BookingDetailModal';

const API = () => process.env.NEXT_PUBLIC_API_URL;

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_COLORS = {
  confirmed:  '#4f46e5',
  on_trip:    '#2563eb',
  completed:  '#16a34a',
  cancelled:  '#dc2626',
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const today   = new Date();
  const [year,  setYear]    = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth());
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [view,     setView]     = useState('month'); // month | week

  async function load(y, m) {
    setLoading(true);
    try {
      // Fetch all bookings (we'll filter by month client-side)
      const res  = await fetch(`${API()}/bookings?perPage=200`);
      const data = await res.json();
      setBookings(data.items ?? []);
    } catch (err) {
      console.error('[calendar] fetch failed:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(year, month); }, [year, month]);

  function prevMonth() {
    if (month === 0) { setYear(y => y-1); setMonth(11); }
    else setMonth(m => m-1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y+1); setMonth(0); }
    else setMonth(m => m+1);
  }

  // Get bookings for a specific date
  function bookingsForDate(day) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return bookings.filter(b => {
      if (!b.pickup_datetime) return false;
      return b.pickup_datetime.startsWith(dateStr);
    });
  }

  const daysInMonth  = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  const totalCells   = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;

  // Stats for this month
  const monthBookings = bookings.filter(b => {
    if (!b.pickup_datetime) return false;
    const d = new Date(b.pickup_datetime);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  return (
    <div style={{ width:'100%' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:500 }}>Booking calendar</h1>
          <p style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>
            {monthBookings.length} bookings in {MONTHS[month]} {year}
          </p>
        </div>

        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          {/* Month stats pills */}
          {Object.entries(STATUS_COLORS).map(([status, color]) => {
            const count = monthBookings.filter(b => (b.status||'confirmed') === status).length;
            if (!count) return null;
            return (
              <span key={status} style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:500,
                background: `${color}18`, color,
              }}>
                {count} {status.replace('_',' ')}
              </span>
            );
          })}

          {/* Nav controls */}
          <div style={{ display:'flex', alignItems:'center', gap:6, marginLeft:8 }}>
            <button onClick={prevMonth} style={{ padding:'6px 10px', fontSize:16 }}>‹</button>
            <span style={{ fontSize:14, fontWeight:500, minWidth:140, textAlign:'center' }}>
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth} style={{ padding:'6px 10px', fontSize:16 }}>›</button>
            <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
              style={{ padding:'5px 12px', fontSize:12, marginLeft:4 }}>Today</button>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>

        {/* Day headers */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'0.5px solid var(--border)' }}>
          {DAYS.map(d => (
            <div key={d} style={{ padding:'10px 4px', textAlign:'center', fontSize:12, fontWeight:500, color:'var(--muted)' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        {loading ? (
          <p style={{ padding:24, color:'var(--muted)' }}>Loading...</p>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
            {Array.from({ length: totalCells }, (_, i) => {
              const day     = i - firstDayOfMonth + 1;
              const isValid = day >= 1 && day <= daysInMonth;
              const isToday = isValid && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const dayBookings = isValid ? bookingsForDate(day) : [];

              return (
                <div key={i} style={{
                  minHeight:100,
                  padding:'6px 4px',
                  borderRight: (i+1) % 7 !== 0 ? '0.5px solid var(--border)' : 'none',
                  borderBottom: i < totalCells - 7 ? '0.5px solid var(--border)' : 'none',
                  background: isToday ? 'var(--accent-bg)' : 'transparent',
                }}>
                  {isValid && (
                    <>
                      <p style={{
                        fontSize:12, fontWeight: isToday ? 600 : 400,
                        color: isToday ? 'var(--accent)' : 'var(--text)',
                        marginBottom:4, textAlign:'center',
                        width:22, height:22, lineHeight:'22px', borderRadius:'50%',
                        background: isToday ? 'var(--accent)' : 'transparent',
                        color: isToday ? '#fff' : 'var(--text)',
                        margin:'0 auto 4px',
                      }}>{day}</p>

                      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                        {dayBookings.slice(0,3).map(b => (
                          <div
                            key={b.id}
                            onClick={() => setSelected(b)}
                            title={`${b.caller_name} — ${b.pickup_address}`}
                            style={{
                              fontSize:10, padding:'2px 5px', borderRadius:4,
                              background: `${STATUS_COLORS[b.status||'confirmed']}20`,
                              color:       STATUS_COLORS[b.status||'confirmed'],
                              cursor:'pointer', overflow:'hidden',
                              textOverflow:'ellipsis', whiteSpace:'nowrap',
                              borderLeft:`2px solid ${STATUS_COLORS[b.status||'confirmed']}`,
                            }}
                          >
                            {b.pickup_datetime?.slice(11,16)} {b.caller_name || b.reference}
                          </div>
                        ))}
                        {dayBookings.length > 3 && (
                          <p style={{ fontSize:10, color:'var(--muted)', textAlign:'center' }}>
                            +{dayBookings.length - 3} more
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:16, marginTop:14, flexWrap:'wrap' }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:color }} />
            <span style={{ fontSize:11, color:'var(--muted)', textTransform:'capitalize' }}>{status.replace('_',' ')}</span>
          </div>
        ))}
      </div>

      {selected && <BookingDetailModal booking={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
