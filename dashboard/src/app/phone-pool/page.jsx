'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

const COUNTRY_OPTIONS = ['US','NG','GB','CA','AU','GH','KE','ZA'];

function StatusBadge({ status, company }) {
  const map = {
    available: { bg:'var(--green-bg)',  color:'var(--green)',  label:'Available'  },
    active:    { bg:'var(--accent-bg)', color:'var(--accent)', label:'Active'     },
    disabled:  { bg:'var(--red-bg)',    color:'var(--red)',    label:'Disabled'   },
    reserved:  { bg:'var(--amber-bg)',  color:'var(--amber)',  label:'Reserved'   },
  };
  const s = map[status] ?? map.reserved;
  return (
    <span style={{ fontSize:12, fontWeight:500, padding:'2px 8px', borderRadius:20, background:s.bg, color:s.color }}>
      {s.label}{company ? ` — ${company.name}` : ''}
    </span>
  );
}

export default function PhonePoolPage() {
  const { user }       = useAuth();
  const [numbers,    setNumbers]    = useState([]);
  const [companies,  setCompanies]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showAdd,    setShowAdd]    = useState(false);
  const [assignModal, setAssignModal] = useState(null); // number record to assign
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  const [form, setForm] = useState({ number:'', friendly_name:'', twilio_sid:'', country:'US', area_code:'', monthly_cost:1.15, notes:'' });
  const [assignCompanyId, setAssignCompanyId] = useState('');

  if (user?.role !== 'author') {
    return <p style={{ color:'var(--muted)', padding:40, textAlign:'center' }}>Author access required.</p>;
  }

  async function load() {
    setLoading(true);
    try {
      const [numRes, coRes] = await Promise.all([
        api('/phone-numbers').then(r => r.json()),
        api('/companies').then(r => r.json()),
      ]);
      setNumbers(Array.isArray(numRes) ? numRes : []);
      setCompanies(Array.isArray(coRes) ? coRes : []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function addNumber() {
    if (!form.number) { setError('Phone number is required'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const res  = await api('/phone-numbers', { method:'POST', body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to add number'); return; }
      setSuccess(`Number ${form.number} added to pool`);
      setShowAdd(false);
      setForm({ number:'', friendly_name:'', twilio_sid:'', country:'US', area_code:'', monthly_cost:1.15, notes:'' });
      await load();
    } catch (err) {
      setError(err.message ?? 'Failed to add number');
    } finally { setSaving(false); }
  }

  async function assignNumber() {
    if (!assignCompanyId) { setError('Select a company first'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const res  = await api('/phone-numbers/assign', { method:'POST', body: JSON.stringify({ numberId: assignModal.id, companyId: assignCompanyId }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to assign number'); return; }
      setSuccess(`Number assigned successfully`);
      setAssignModal(null);
      setAssignCompanyId('');
      await load();
    } catch (err) {
      setError(err.message ?? 'Failed to assign number');
    } finally { setSaving(false); }
  }

  async function provisionFull(companyId) {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res  = await api(`/phone-numbers/provision/${companyId}`, { method:'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to provision'); return; }
      setSuccess(`Calling provisioned — number: ${data.number ?? 'assigned'}`);
      await load();
    } catch (err) {
      setError(err.message ?? 'Failed to provision');
    } finally { setSaving(false); }
  }

  async function disableCalling(companyId) {
    if (!confirm('Disable AI calling for this company?')) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const res  = await api(`/phone-numbers/disable/${companyId}`, { method:'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to disable'); return; }
      setSuccess('AI calling disabled');
      await load();
    } catch (err) {
      setError(err.message ?? 'Failed to disable');
    } finally { setSaving(false); }
  }

  const stats = {
    total:    numbers.length,
    active:   numbers.filter(n => n.status === 'active').length,
    available:numbers.filter(n => n.status === 'available').length,
    disabled: numbers.filter(n => n.status === 'disabled').length,
  };

  // Companies without a number (for assign dropdown)
  const assignedCompanyIds = new Set(numbers.filter(n => n.company_id).map(n => n.company_id));
  const unassignedCompanies = companies.filter(c => !assignedCompanyIds.has(c.id));

  const inp = { padding:'8px 12px', fontSize:13, width:'100%', borderRadius:'var(--radius)', border:'0.5px solid var(--border)', background:'var(--bg)', color:'var(--text)' };

  return (
    <div style={{ width:'100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:500 }}>Number Pool</h1>
          <p style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>Manage Twilio phone numbers for AI calling</p>
        </div>
        <button className="primary" onClick={() => setShowAdd(true)}>+ Add number</button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:24 }}>
        {[['Total',stats.total,'var(--text)'],['Active',stats.active,'var(--accent)'],['Available',stats.available,'var(--green)'],['Disabled',stats.disabled,'var(--red)']].map(([label,val,color]) => (
          <div key={label} style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'14px 18px' }}>
            <p style={{ fontSize:11, color:'var(--muted)', marginBottom:4 }}>{label}</p>
            <p style={{ fontSize:22, fontWeight:600, color }}>{val}</p>
          </div>
        ))}
      </div>

      {(error || success) && (
        <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:'var(--radius)', fontSize:13, background: error ? 'var(--red-bg)' : 'var(--green-bg)', color: error ? 'var(--red)' : 'var(--green)', border:`0.5px solid ${error ? 'var(--red)' : 'var(--green)'}` }}>
          {error || success}
          <button onClick={() => { setError(''); setSuccess(''); }} style={{ float:'right', background:'none', border:'none', cursor:'pointer', fontSize:14, color:'inherit' }}>×</button>
        </div>
      )}

      {/* Add number modal */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 16px' }}>
          <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'28px 24px', width:'100%', maxWidth:480 }}>
            <p style={{ fontSize:16, fontWeight:500, marginBottom:20 }}>Add number to pool</p>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>Phone number *</label>
                <input value={form.number} onChange={e => setForm(f => ({...f, number:e.target.value}))} placeholder="+14045550123" style={inp} />
              </div>
              <div>
                <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>Friendly name</label>
                <input value={form.friendly_name} onChange={e => setForm(f => ({...f, friendly_name:e.target.value}))} placeholder="Atlanta #1" style={inp} />
              </div>
              <div>
                <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>Twilio SID</label>
                <input value={form.twilio_sid} onChange={e => setForm(f => ({...f, twilio_sid:e.target.value}))} placeholder="PN..." style={inp} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>Country</label>
                  <select value={form.country} onChange={e => setForm(f => ({...f, country:e.target.value}))} style={{ ...inp }}>
                    {COUNTRY_OPTIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>Area code</label>
                  <input value={form.area_code} onChange={e => setForm(f => ({...f, area_code:e.target.value}))} placeholder="404" style={inp} />
                </div>
              </div>
              <div>
                <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>Monthly cost ($)</label>
                <input type="number" value={form.monthly_cost} onChange={e => setForm(f => ({...f, monthly_cost:+e.target.value}))} style={{ ...inp }} />
              </div>
              <div>
                <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({...f, notes:e.target.value}))} placeholder="Any notes..." style={inp} />
              </div>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
              <button onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="primary" onClick={addNumber} disabled={saving}>{saving ? 'Adding...' : 'Add to pool'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {assignModal && (
        <div style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 16px' }}>
          <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'28px 24px', width:'100%', maxWidth:400 }}>
            <p style={{ fontSize:16, fontWeight:500, marginBottom:8 }}>Assign {assignModal.number}</p>
            <p style={{ fontSize:13, color:'var(--muted)', marginBottom:20 }}>Select the company to assign this number to. This is permanent — the number will always belong to this company.</p>
            {unassignedCompanies.length === 0 ? (
              <p style={{ fontSize:13, color:'var(--muted)' }}>All companies already have numbers assigned.</p>
            ) : (
              <select value={assignCompanyId} onChange={e => setAssignCompanyId(e.target.value)} style={{ ...inp, marginBottom:20 }}>
                <option value="">— Select company —</option>
                {unassignedCompanies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.plan})</option>)}
              </select>
            )}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => { setAssignModal(null); setAssignCompanyId(''); }}>Cancel</button>
              <button className="primary" onClick={assignNumber} disabled={saving || !assignCompanyId}>{saving ? 'Assigning...' : 'Assign'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Numbers table */}
      {loading ? (
        <p style={{ color:'var(--muted)', padding:'40px 0' }}>Loading...</p>
      ) : numbers.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--muted)' }}>
          <span className="material-symbols-outlined" style={{ fontSize:40, display:'block', marginBottom:12 }}>phone_paused</span>
          <p style={{ fontSize:14 }}>No numbers in the pool yet.</p>
          <p style={{ fontSize:13, marginTop:4 }}>Add a Twilio number to get started.</p>
        </div>
      ) : (
        <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
          <div className="table-scroll">
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
              <thead>
                <tr style={{ borderBottom:'0.5px solid var(--border)' }}>
                  {['Number','Name','Status','Assigned to','Date assigned','Actions'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'10px 16px', fontSize:12, color:'var(--muted)', fontWeight:500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {numbers.map(n => (
                  <tr key={n.id} style={{ borderBottom:'0.5px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'10px 16px', fontSize:13, fontFamily:'monospace' }}>{n.number}</td>
                    <td style={{ padding:'10px 16px', fontSize:13, color:'var(--muted)' }}>{n.friendly_name || '—'}</td>
                    <td style={{ padding:'10px 16px' }}><StatusBadge status={n.status} company={n.company} /></td>
                    <td style={{ padding:'10px 16px', fontSize:13 }}>{n.company ? n.company.name : <span style={{ color:'var(--muted)' }}>—</span>}</td>
                    <td style={{ padding:'10px 16px', fontSize:12, color:'var(--muted)' }}>{n.assigned_at ? new Date(n.assigned_at).toLocaleDateString() : '—'}</td>
                    <td style={{ padding:'10px 16px' }}>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {n.status === 'available' && (
                          <button onClick={() => { setAssignModal(n); setAssignCompanyId(''); }} style={{ fontSize:12, padding:'4px 10px' }}>Assign</button>
                        )}
                        {n.status === 'active' && n.company_id && (
                          <>
                            <button onClick={() => provisionFull(n.company_id)} disabled={saving} style={{ fontSize:12, padding:'4px 10px' }}>Refresh Vapi</button>
                            <button onClick={() => disableCalling(n.company_id)} disabled={saving} style={{ fontSize:12, padding:'4px 10px', color:'var(--red)', border:'0.5px solid var(--red)', background:'var(--red-bg)' }}>Disable</button>
                          </>
                        )}
                        {n.status === 'disabled' && n.company_id && (
                          <button onClick={() => provisionFull(n.company_id)} disabled={saving} style={{ fontSize:12, padding:'4px 10px', color:'var(--green)', border:'0.5px solid var(--green)', background:'var(--green-bg)' }}>Reactivate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
