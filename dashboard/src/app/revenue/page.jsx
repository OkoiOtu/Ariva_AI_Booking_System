'use client';
import { useEffect, useState } from 'react';
import PlanGate, { BookingLimitBanner } from '@/components/PlanGate';
import { api } from '@/lib/api';
import { useCurrency } from '@/lib/currencyContext';

export default function RevenuePage() {
  const { fmt } = useCurrency();
  const today    = new Date().toISOString().slice(0,10);
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);

  const [all,     setAll]     = useState([]);
  const [period,  setPeriod]  = useState('monthly');
  const [from,    setFrom]    = useState(firstDay);
  const [to,      setTo]      = useState(today);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res  = await api(`/revenue?period=${period}`);
      const json = await res.json();
      setAll(json.data ?? []);
    } catch (err) {
      console.error('[revenue]', err.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [period]);

  // Apply date range filter client-side
  const data = all.filter(d => {
    if (!from && !to) return true;
    if (from && d.period < from.slice(0, d.period.length)) return false;
    if (to   && d.period > to.slice(0, d.period.length))   return false;
    return true;
  });

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalTrips   = data.reduce((s, d) => s + d.trips,   0);
  const maxRevenue   = Math.max(...data.map(d => d.revenue), 1);

  function periodLabel(key) {
    if (period === 'monthly') {
      const [y, m] = key.split('-');
      return new Date(+y, +m-1, 1).toLocaleDateString('en-NG', { month:'short', year:'numeric' });
    }
    if (period === 'weekly') return `Wk ${key}`;
    return key;
  }

  async function downloadCSV() {
    const res  = await api('/export/bookings');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'bookings.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PlanGate feature="revenue">
    <div style={{ width:'100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:500 }}>Revenue</h1>
          <p style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>Based on completed bookings with a quoted price</p>
        </div>
        <button onClick={downloadCSV} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
          <span className="material-symbols-outlined" style={{ fontSize:16 }}>download</span>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', gap:4, background:'var(--bg)', padding:4, borderRadius:'var(--radius)' }}>
          {[['daily','Daily'],['weekly','Weekly'],['monthly','Monthly']].map(([val,label]) => (
            <button key={val} onClick={() => setPeriod(val)} style={{
              border:'none', borderRadius:6, padding:'5px 14px', fontSize:12, cursor:'pointer',
              fontWeight: period===val ? 500 : 400,
              background: period===val ? 'var(--surface)' : 'transparent',
              color:      period===val ? 'var(--text)' : 'var(--muted)',
            }}>{label}</button>
          ))}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ fontSize:13, color:'var(--muted)' }}>From</span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ padding:'5px 10px', fontSize:13 }} />
          <span style={{ fontSize:13, color:'var(--muted)' }}>To</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ padding:'5px 10px', fontSize:13 }} />
          <button onClick={() => { setFrom(firstDay); setTo(today); }} style={{ fontSize:12, padding:'5px 12px' }}>Reset</button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:24 }}>
        {[
          { label:'Total revenue',   value: fmt(totalRevenue), color:'var(--green)'  },
          { label:'Total trips',     value: totalTrips,                   color:'var(--accent)' },
          { label:'Avg per trip',    value: totalTrips ? fmt(Math.round(totalRevenue/totalTrips)) : '—', color:'var(--blue)' },
          { label:'Periods',         value: data.length,                  color:'var(--amber)'  },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'16px 20px' }}>
            <p style={{ fontSize:12, color:'var(--muted)', marginBottom:6 }}>{label}</p>
            <p style={{ fontSize:22, fontWeight:500, color }}>{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'20px 24px', marginBottom:16 }}>
        <p style={{ fontSize:14, fontWeight:500, marginBottom:16 }}>Revenue by period</p>
        {loading ? (
          <p style={{ color:'var(--muted)', padding:'24px 0' }}>Loading...</p>
        ) : data.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 0' }}>
            <span className="material-symbols-outlined" style={{ fontSize:36, color:'var(--muted)', display:'block', marginBottom:10 }}>payments</span>
            <p style={{ color:'var(--muted)', fontSize:14 }}>No revenue data for this period.</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <div style={{ minWidth: Math.max(data.length * 56, 300), paddingBottom:8 }}>
              <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:160, marginBottom:6 }}>
                {data.map(d => (
                  <div key={d.period} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                    <span style={{ fontSize:9, color:'var(--muted)', whiteSpace:'nowrap' }}>{fmt(d.revenue)}</span>
                    <div title={`${periodLabel(d.period)}: ${fmt(d.revenue)} (${d.trips} trips)`} style={{
                      width:'100%', minWidth:24,
                      height: `${Math.max((d.revenue/maxRevenue)*100, 3)}%`,
                      background:'var(--accent)', borderRadius:'3px 3px 0 0', opacity:0.85,
                    }} />
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:4 }}>
                {data.map(d => (
                  <div key={d.period} style={{ flex:1, textAlign:'center', fontSize:9, color:'var(--muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {periodLabel(d.period)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {data.length > 0 && (
        <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
          <div className="table-scroll">
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:380 }}>
              <thead>
                <tr style={{ borderBottom:'0.5px solid var(--border)' }}>
                  {['Period','Revenue','Trips','Avg per trip'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'8px 16px', fontSize:12, color:'var(--muted)', fontWeight:500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map(d => (
                  <tr key={d.period} style={{ borderBottom:'0.5px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'10px 16px', fontSize:13 }}>{periodLabel(d.period)}</td>
                    <td style={{ padding:'10px 16px', fontSize:13, fontWeight:500, color:'var(--green)' }}>{fmt(d.revenue)}</td>
                    <td style={{ padding:'10px 16px', fontSize:13 }}>{d.trips}</td>
                    <td style={{ padding:'10px 16px', fontSize:13, color:'var(--muted)' }}>{fmt(Math.round(d.revenue/d.trips))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </PlanGate>
  );
}
