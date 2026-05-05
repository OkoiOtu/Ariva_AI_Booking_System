'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

const VEHICLE_LABELS = {
  sedan:'Sedan', suv:'SUV', van:'Van', bus:'Bus',
  limo:'Stretch Limo', sprinter:'Sprinter Van',
  party_bus:'Party Bus', wheelchair:'Wheelchair Accessible',
};

function field(label, children, required) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:500, marginBottom:6, color:'#374151' }}>
        {label}{required && <span style={{ color:'#ef4444', marginLeft:2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inp = {
  width:'100%', padding:'10px 12px', fontSize:14, borderRadius:8,
  border:'1px solid #d1d5db', background:'#fff', color:'#111827',
  boxSizing:'border-box',
};

export default function WidgetPage() {
  const params = useParams();
  const slug   = params?.slug ?? '';

  const [company,  setCompany]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState({
    caller_name:'', caller_phone:'', pickup_datetime:'',
    pickup_address:'', dropoff_address:'', duration_hours:'1',
    vehicle_type:'sedan', notes:'',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [reference,  setReference]  = useState('');
  const [error,      setError]      = useState('');

  useEffect(() => {
    if (!slug) return;
    fetch(`${API}/public/companies/slug/${slug}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then(data => { if (data) { setCompany(data); setLoading(false); } })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [slug]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const res  = await fetch(`${API}/public/bookings/widget`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, company_slug: slug }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create booking.'); return; }
      setReference(data.reference);
      setSubmitted(true);
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally { setSubmitting(false); }
  }

  const vehicles = (company?.ai_vehicle_types || 'sedan,suv,van').split(',').map(v => v.trim()).filter(Boolean);
  const minHours = company?.ai_min_hours ?? 1;
  const maxHours = company?.ai_max_hours ?? 12;

  // ── Shared wrapper ────────────────────────────────────────────────────────
  const wrap = (children) => (
    <div style={{ minHeight:'100vh', background:'#f9fafb', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'32px 16px', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
      <div style={{ width:'100%', maxWidth:520, background:'#fff', borderRadius:16, boxShadow:'0 4px 24px rgba(0,0,0,0.08)', overflow:'hidden' }}>
        {company && (
          <div style={{ padding:'20px 24px', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', gap:12 }}>
            {(company.logo_data || company.logo_url) && (
              <img src={company.logo_data ?? company.logo_url} alt="" style={{ width:40, height:40, objectFit:'contain', borderRadius:8, border:'1px solid #e5e7eb', padding:3 }} onError={e => { e.currentTarget.style.display='none'; }} />
            )}
            <div>
              <p style={{ fontSize:16, fontWeight:700, color:'#111827' }}>{company.name}</p>
              {company.city && <p style={{ fontSize:12, color:'#6b7280', marginTop:1 }}>{company.city}</p>}
            </div>
          </div>
        )}
        <div style={{ padding:'24px' }}>{children}</div>
      </div>
    </div>
  );

  if (loading) return wrap(<p style={{ textAlign:'center', color:'#6b7280', padding:'32px 0' }}>Loading…</p>);

  if (notFound) return wrap(
    <div style={{ textAlign:'center', padding:'32px 0' }}>
      <p style={{ fontSize:28, marginBottom:8 }}>🚫</p>
      <p style={{ fontSize:16, fontWeight:600, color:'#111827' }}>Company not found</p>
      <p style={{ fontSize:13, color:'#6b7280', marginTop:6 }}>This booking widget link may be incorrect or the company is no longer active.</p>
    </div>
  );

  if (submitted) return wrap(
    <div style={{ textAlign:'center', padding:'24px 0' }}>
      <p style={{ fontSize:40, marginBottom:12 }}>✅</p>
      <p style={{ fontSize:18, fontWeight:700, color:'#111827', marginBottom:8 }}>Booking confirmed!</p>
      <p style={{ fontSize:14, color:'#374151', marginBottom:4 }}>Your booking reference is:</p>
      <p style={{ fontSize:22, fontWeight:700, fontFamily:'monospace', color:'#2563eb', marginBottom:16 }}>{reference}</p>
      <p style={{ fontSize:13, color:'#6b7280', lineHeight:1.6 }}>
        You'll receive an SMS confirmation shortly. Keep your reference number safe.
      </p>
      <button
        onClick={() => { setSubmitted(false); setForm({ caller_name:'', caller_phone:'', pickup_datetime:'', pickup_address:'', dropoff_address:'', duration_hours:'1', vehicle_type:'sedan', notes:'' }); }}
        style={{ marginTop:20, padding:'10px 24px', fontSize:14, borderRadius:8, background:'#2563eb', color:'#fff', border:'none', cursor:'pointer', fontWeight:500 }}
      >
        Book another trip
      </button>
    </div>
  );

  return wrap(
    <form onSubmit={handleSubmit}>
      <p style={{ fontSize:18, fontWeight:700, color:'#111827', marginBottom:4 }}>Book a trip</p>
      <p style={{ fontSize:13, color:'#6b7280', marginBottom:20 }}>Fill in the details below and we'll confirm your booking.</p>

      {field('Your name', <input required value={form.caller_name} onChange={e => setForm(f => ({...f, caller_name:e.target.value}))} placeholder="John Doe" style={inp} />, true)}
      {field('Phone number', <input required value={form.caller_phone} onChange={e => setForm(f => ({...f, caller_phone:e.target.value}))} placeholder="+234..." style={inp} />, true)}
      {field('Pickup date & time', <input required type="datetime-local" value={form.pickup_datetime} onChange={e => setForm(f => ({...f, pickup_datetime:e.target.value}))} style={inp} />, true)}
      {field('Pickup address', <input required value={form.pickup_address} onChange={e => setForm(f => ({...f, pickup_address:e.target.value}))} placeholder="123 Main Street, Lagos" style={inp} />, true)}
      {field('Drop-off address (optional)', <input value={form.dropoff_address} onChange={e => setForm(f => ({...f, dropoff_address:e.target.value}))} placeholder="e.g. Murtala Muhammed Airport" style={inp} />)}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          {field('Duration (hours)', (
            <input
              required type="number" min={minHours} max={maxHours}
              value={form.duration_hours}
              onChange={e => setForm(f => ({...f, duration_hours:e.target.value}))}
              style={inp}
            />
          ), true)}
        </div>
        <div>
          {field('Vehicle type', (
            <select value={form.vehicle_type} onChange={e => setForm(f => ({...f, vehicle_type:e.target.value}))} style={inp}>
              {vehicles.map(v => <option key={v} value={v}>{VEHICLE_LABELS[v] ?? v}</option>)}
            </select>
          ))}
        </div>
      </div>

      {field('Notes (optional)', <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes:e.target.value}))} placeholder="Any special requirements, flight number, etc." style={{ ...inp, minHeight:80, resize:'vertical' }} />)}

      {error && <p style={{ fontSize:13, color:'#ef4444', marginBottom:12, padding:'10px 12px', background:'#fef2f2', borderRadius:8 }}>{error}</p>}

      <button
        type="submit" disabled={submitting}
        style={{ width:'100%', padding:'12px', fontSize:15, fontWeight:600, borderRadius:8, background:'#2563eb', color:'#fff', border:'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
      >
        {submitting ? 'Submitting…' : 'Confirm booking'}
      </button>

      <p style={{ fontSize:11, color:'#9ca3af', textAlign:'center', marginTop:12 }}>
        Powered by Arrival · By submitting you agree to be contacted via SMS.
      </p>
    </form>
  );
}
