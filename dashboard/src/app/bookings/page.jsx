'use client';
import { useEffect, useState, useRef } from 'react';
import { BookingLimitBanner } from '@/components/PlanGate';
import { useCompany } from '@/lib/companyContext';
import { canAccess } from '@/components/PlanGate';
import BookingTable from '@/components/BookingTable';
import BookingDetailModal from '@/components/BookingDetailModal';
import { api } from '@/lib/api';

export default function BookingsPage() {
  const today    = new Date().toISOString().slice(0,10);
  const [bookings,  setBookings]  = useState([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [search,    setSearch]    = useState('');
  const [query,     setQuery]     = useState('');
  const [fromDate,  setFromDate]  = useState('');
  const [toDate,    setToDate]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [detailing, setDetailing] = useState(null);
  const mounted = useRef(false);
  const PER_PAGE = 20;
  const { company } = useCompany();
  const plan = company?.plan ?? 'starter';
  const bookingsAllowed = canAccess(plan, 'bookings');
  const maxBookings = plan === 'starter' ? 50 : null;

  async function load() {
    if (!mounted.current) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, perPage: PER_PAGE });
      if (query)    params.set('search', query);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate)   params.set('toDate', toDate);
      const res  = await api(`/bookings?${params}`);
      const data = await res.json();
      setBookings(data.items ?? []);
      setTotal(data.totalItems ?? 0);
    } catch (err) {
      console.error('[bookings] fetch failed:', err.message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
    load();
    const interval = setInterval(load, 15000);
    return () => { mounted.current = false; clearInterval(interval); };
  }, [page, query, fromDate, toDate]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    setQuery(search);
  }

  async function downloadCSV() {
    const params = new URLSearchParams();
    if (query)    params.set('search', query);
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate)   params.set('toDate', toDate);
    const res  = await api(`/export/bookings?${params}`);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'bookings.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div style={{ width:'100%' }}>
      <div className="bookings-header">
        <div>
          <h1 style={{ fontSize:20, fontWeight:500 }}>Bookings</h1>
          <p style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>
            {total} records &nbsp;·&nbsp; double-click a row to view details
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <form onSubmit={handleSearch} style={{ display:'flex', gap:6 }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, phone, ref..."
              style={{ padding:'6px 12px', width:200, fontSize:13 }} />
            <button type="submit">Search</button>
          </form>
          <button onClick={downloadCSV} style={{ display:'flex', alignItems:'center', gap:5, fontSize:13 }}>
            <span className="material-symbols-outlined" style={{ fontSize:15 }}>download</span>CSV
          </button>
        </div>
      </div>

      {/* Date filter */}
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
        <span style={{ fontSize:13, color:'var(--muted)' }}>Filter by pickup date:</span>
        <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} style={{ padding:'5px 10px', fontSize:13 }} />
        <span style={{ fontSize:13, color:'var(--muted)' }}>to</span>
        <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} style={{ padding:'5px 10px', fontSize:13 }} />
        {(fromDate || toDate) && (
          <button onClick={() => { setFromDate(''); setToDate(''); setPage(1); }} style={{ fontSize:12, padding:'5px 10px' }}>Clear filter</button>
        )}
      </div>

      <BookingLimitBanner total={total} />

      <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
        <div className="table-scroll">
          {loading ? (
            <p style={{ padding:24, color:'var(--muted)' }}>Loading...</p>
          ) : (
            <BookingTable bookings={bookings} onDoubleClick={b => setDetailing(b)} />
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:16 }}>
          <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>Previous</button>
          <span style={{ padding:'6px 12px', fontSize:13, color:'var(--muted)' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}>Next</button>
        </div>
      )}

      {detailing && (
        <BookingDetailModal booking={detailing} onClose={() => setDetailing(null)} onCancelled={load} />
      )}
    </div>
  );
}
