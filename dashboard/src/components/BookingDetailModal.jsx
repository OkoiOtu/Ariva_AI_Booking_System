'use client';
import { useState } from 'react';
import { formatDatetime, formatDuration, formatPhone, CURRENCY_SYMBOLS } from '@/lib/formatters';
import StatusBadge from './StatusBadge';
import { api } from '@/lib/api';

export default function BookingDetailModal({ booking, onClose, onCancelled }) {
  const [cancelling,        setCancelling]        = useState(false);
  const [cancelError,       setCancelError]       = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [downloading,       setDownloading]       = useState(false);
  const [invoiceError,      setInvoiceError]      = useState('');

  const priceDisplay = booking.quoted_price
    ? `${CURRENCY_SYMBOLS[booking.quoted_currency] ?? ''}${Number(booking.quoted_price).toLocaleString()} (${booking.pricing_rule ?? 'matched rule'})`
    : 'To be confirmed';

  async function downloadInvoice() {
    setDownloading(true); setInvoiceError('');
    try {
      const res = await api(`/bookings/${booking.id}/invoice`);
      if (!res.ok) throw new Error('Failed to generate invoice');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `invoice-${booking.reference}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setInvoiceError(err.message ?? 'Download failed');
    } finally { setDownloading(false); }
  }

  const fields = [
    { label:'Reference',      value: booking.reference },
    { label:'Caller name',    value: booking.caller_name },
    { label:'Phone',          value: formatPhone(booking.caller_phone) },
    { label:'Pickup time',    value: formatDatetime(booking.pickup_datetime) },
    { label:'Pickup address', value: booking.pickup_address },
    { label:'Drop-off',       value: booking.dropoff_address || '—' },
    { label:'Duration',       value: formatDuration(booking.duration_hours) },
    { label:'Vehicle type',   value: booking.vehicle_type   || '—' },
    { label:'Quoted price',   value: priceDisplay },
    { label:'SMS sent',       value: booking.sms_sent ? 'Yes' : 'No' },
    { label:'Created',        value: formatDatetime(booking.created) },
  ];

  async function cancelBooking() {
    setCancelling(true);
    setCancelError('');
    try {
      const res  = await api(`/bookings/${booking.id}/cancel`, {
        method: 'POST',
        body:   JSON.stringify({ actor: 'admin' }),
      });
      const data = await res.json();
      if (!res.ok) { setCancelError(data.error ?? 'Failed to cancel'); return; }
      setShowCancelConfirm(false);
      onCancelled?.();
      onClose();
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:60, background:'rgba(0,0,0,0.4)' }} />
      <div style={{
        position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        zIndex:70, width:480, maxWidth:'90vw',
        background:'var(--surface)', border:'0.5px solid var(--border)',
        borderRadius:'var(--radius-lg)', padding:'28px',
        maxHeight:'85vh', overflowY:'auto',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <p style={{ fontSize:15, fontWeight:500 }}>Booking details</p>
            <p style={{ fontSize:12, color:'var(--muted)', marginTop:2, fontFamily:'monospace' }}>{booking.reference}</p>
          </div>
          <button onClick={onClose} style={{ border:'none', background:'none', fontSize:20, color:'var(--muted)', padding:0 }}>✕</button>
        </div>

        <div style={{ marginBottom:18 }}>
          <StatusBadge status={booking.status || 'confirmed'} />
        </div>

        <div style={{ display:'flex', flexDirection:'column' }}>
          {fields.map(({ label, value }) => (
            <div key={label} style={{ display:'grid', gridTemplateColumns:'140px 1fr', padding:'10px 0', borderBottom:'0.5px solid var(--border)' }}>
              <p style={{ fontSize:12, color:'var(--muted)', paddingTop:1 }}>{label}</p>
              <p style={{ fontSize:13, color:'var(--text)', wordBreak:'break-word' }}>{value || '—'}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop:20, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div>
            {!['completed','cancelled'].includes(booking.status) && !showCancelConfirm && (
              <button onClick={() => setShowCancelConfirm(true)} className="danger" style={{ fontSize:12 }}>
                Cancel booking
              </button>
            )}
            {showCancelConfirm && (
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <span style={{ fontSize:13, color:'var(--red)' }}>Cancel {booking.reference}?</span>
                <button onClick={cancelBooking} className="danger" disabled={cancelling} style={{ fontSize:12 }}>
                  {cancelling ? 'Cancelling...' : 'Yes, cancel'}
                </button>
                <button onClick={() => setShowCancelConfirm(false)} style={{ fontSize:12 }}>No</button>
              </div>
            )}
            {cancelError && <p style={{ fontSize:12, color:'var(--red)', marginTop:4 }}>{cancelError}</p>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            {booking.status === 'completed' && (
              <button onClick={downloadInvoice} disabled={downloading} style={{ fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
                <span className="material-symbols-outlined" style={{ fontSize:15 }}>download</span>
                {downloading ? 'Generating...' : 'Download invoice'}
              </button>
            )}
            {invoiceError && <span style={{ fontSize:12, color:'var(--red)' }}>{invoiceError}</span>}
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </>
  );
}
