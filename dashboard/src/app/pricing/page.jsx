'use client';
import { useEffect, useState } from 'react';
import PlanGate from '@/components/PlanGate';
import { useAuth } from '@/lib/auth';

import { api } from '@/lib/api';
import { formatPrice } from '@/lib/formatters';

const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR'];
const VEHICLES   = ['any', 'sedan', 'suv', 'van', 'bus'];

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 16px' }}>
      <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'24px 28px', width:'100%', maxWidth:480 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <p style={{ fontSize:15, fontWeight:500 }}>{title}</p>
          <button onClick={onClose} style={{ border:'none', background:'none', fontSize:20, color:'var(--muted)', padding:0 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const emptyForm = {
  name: '', type: 'hourly', vehicle_type: 'any',
  price_per_hour: '', fixed_price: '',
  pickup_keyword: '', dropoff_keyword: '',
  currency: 'NGN', notes: '', active: true,
};

function RuleForm({ initial, onSave, onCancel, saving, error }) {
  const [form, setForm] = useState(initial);
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const s = { width:'100%', padding:'7px 10px', fontSize:13, marginTop:4 };

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} style={{ display:'flex', flexDirection:'column', gap:14 }}>

      <div>
        <label style={{ fontSize:12, color:'var(--muted)' }}>Rule name</label>
        <input required value={form.name} onChange={f('name')} placeholder="e.g. Standard hourly rate" style={s} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <label style={{ fontSize:12, color:'var(--muted)' }}>Type</label>
          <select value={form.type} onChange={f('type')} style={s}>
            <option value="hourly">Hourly rate</option>
            <option value="fixed_route">Fixed route</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize:12, color:'var(--muted)' }}>Currency</label>
          <select value={form.currency} onChange={f('currency')} style={s}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {form.type === 'hourly' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <label style={{ fontSize:12, color:'var(--muted)' }}>Price per hour</label>
            <input type="number" required value={form.price_per_hour} onChange={f('price_per_hour')}
              placeholder="e.g. 15000" style={s} />
          </div>
          <div>
            <label style={{ fontSize:12, color:'var(--muted)' }}>Vehicle type</label>
            <select value={form.vehicle_type} onChange={f('vehicle_type')} style={s}>
              {VEHICLES.map(v => <option key={v} value={v}>{v === 'any' ? 'Any vehicle' : v.charAt(0).toUpperCase()+v.slice(1)}</option>)}
            </select>
          </div>
        </div>
      )}

      {form.type === 'fixed_route' && (
        <>
          <div>
            <label style={{ fontSize:12, color:'var(--muted)' }}>Fixed price</label>
            <input type="number" required value={form.fixed_price} onChange={f('fixed_price')}
              placeholder="e.g. 25000" style={s} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:12, color:'var(--muted)' }}>Pickup keyword</label>
              <input value={form.pickup_keyword} onChange={f('pickup_keyword')}
                placeholder="e.g. airport" style={s} />
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--muted)' }}>Dropoff keyword</label>
              <input value={form.dropoff_keyword} onChange={f('dropoff_keyword')}
                placeholder="e.g. island" style={s} />
            </div>
          </div>
          <p style={{ fontSize:11, color:'var(--muted)', marginTop:-8 }}>
            Keywords are matched against the caller's address. Leave blank to match any address.
          </p>
        </>
      )}

      <div>
        <label style={{ fontSize:12, color:'var(--muted)' }}>Notes (optional)</label>
        <input value={form.notes} onChange={f('notes')} placeholder="Internal notes" style={s} />
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <input type="checkbox" id="active" checked={form.active}
          onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} />
        <label htmlFor="active" style={{ fontSize:13, cursor:'pointer' }}>Active — apply this rule to new bookings</label>
      </div>

      {error && (
        <p style={{ fontSize:12, color:'var(--red)', background:'var(--red-bg)', padding:'8px 10px', borderRadius:'var(--radius)' }}>{error}</p>
      )}

      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving...' : 'Save rule'}</button>
      </div>
    </form>
  );
}

export default function PricingPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [rules,   setRules]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [error,   setError]   = useState('');
  const [saving,  setSaving]  = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res  = await api(`/pricing`);
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createRule(form) {
    setSaving(true); setError('');
    try {
      const res = await api(`/pricing`, {
        method: 'POST', headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          ...form,
          price_per_hour: form.price_per_hour ? Number(form.price_per_hour) : null,
          fixed_price:    form.fixed_price    ? Number(form.fixed_price)    : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create rule'); return; }
      setShowAdd(false); load();
    } finally { setSaving(false); }
  }

  async function updateRule(form) {
    setSaving(true); setError('');
    try {
      const res = await api(`/pricing/${editTarget.id}`, {
        method: 'PATCH', headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          ...form,
          price_per_hour: form.price_per_hour ? Number(form.price_per_hour) : null,
          fixed_price:    form.fixed_price    ? Number(form.fixed_price)    : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to update rule'); return; }
      setEditTarget(null); load();
    } finally { setSaving(false); }
  }

  async function toggleActive(rule) {
    await api(`/pricing/${rule.id}`, {
      method: 'PATCH', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ active: !rule.active }),
    });
    load();
  }

  async function deleteRule(rule) {
    if (!confirm(`Delete "${rule.name}"? This cannot be undone.`)) return;
    await api(`/pricing/${rule.id}`, { method: 'DELETE' });
    load();
  }

  return (
  <PlanGate feature="pricing">
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, gap:12, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:500 }}>Pricing rules</h1>
          <p style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>
            {rules.filter(r => r.active).length} active rules — applied automatically to new bookings
          </p>
        </div>
        {isAdmin && (
          <button className="primary" onClick={() => { setShowAdd(true); setError(''); }}>
            + Add rule
          </button>
        )}
      </div>

      {/* How it works */}
      <div style={{ background:'var(--accent-bg)', border:'0.5px solid var(--accent)', borderRadius:'var(--radius-lg)', padding:'14px 18px', marginBottom:24 }}>
        <p style={{ fontSize:13, color:'var(--accent)', fontWeight:500, marginBottom:4 }}>How pricing works</p>
        <p style={{ fontSize:12, color:'var(--accent)', lineHeight:1.6 }}>
          When a booking comes in, the system checks rules in this order: (1) Fixed route match by keyword, (2) Vehicle-specific hourly rate, (3) Default hourly rate. The matched price is stored on the booking and included in the customer SMS. If no rule matches, price shows as "To be confirmed".
        </p>
      </div>

      {/* Rules list */}
      {loading ? (
        <p style={{ color:'var(--muted)' }}>Loading...</p>
      ) : rules.length === 0 ? (
        <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'48px 24px', textAlign:'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize:36, color:'var(--muted)', display:'block', marginBottom:10 }}>payments</span>
          <p style={{ color:'var(--muted)', fontSize:14, marginBottom:6 }}>No pricing rules yet.</p>
          <p style={{ color:'var(--muted)', fontSize:12 }}>Add a rule to start quoting prices on bookings.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {rules.map(rule => (
            <div key={rule.id} style={{
              background:'var(--surface)', border:'0.5px solid var(--border)',
              borderRadius:'var(--radius-lg)', padding:'16px 20px',
              opacity: rule.active ? 1 : 0.55,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                    <p style={{ fontSize:14, fontWeight:500 }}>{rule.name}</p>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500,
                      background: rule.type==='fixed_route' ? 'var(--purple-bg)' : 'var(--blue-bg)',
                      color:      rule.type==='fixed_route' ? 'var(--purple)'    : 'var(--blue)',
                    }}>{rule.type === 'fixed_route' ? 'Fixed route' : 'Hourly'}</span>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500,
                      background: rule.active ? 'var(--green-bg)' : 'var(--gray-bg)',
                      color:      rule.active ? 'var(--green)'    : 'var(--gray)',
                    }}>{rule.active ? 'Active' : 'Inactive'}</span>
                  </div>

                  <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
                    {rule.type === 'hourly' && (
                      <>
                        <p style={{ fontSize:13, color:'var(--muted)' }}>
                          <span style={{ color:'var(--text)', fontWeight:500 }}>{formatPrice(rule.price_per_hour, rule.currency)}</span> / hour
                        </p>
                        <p style={{ fontSize:13, color:'var(--muted)' }}>
                          Vehicle: <span style={{ color:'var(--text)' }}>{rule.vehicle_type === 'any' ? 'Any' : rule.vehicle_type}</span>
                        </p>
                      </>
                    )}
                    {rule.type === 'fixed_route' && (
                      <>
                        <p style={{ fontSize:13, color:'var(--muted)' }}>
                          Price: <span style={{ color:'var(--text)', fontWeight:500 }}>{formatPrice(rule.fixed_price, rule.currency)}</span>
                        </p>
                        {rule.pickup_keyword && (
                          <p style={{ fontSize:13, color:'var(--muted)' }}>
                            Pickup: <span style={{ color:'var(--text)' }}>{rule.pickup_keyword}</span>
                          </p>
                        )}
                        {rule.dropoff_keyword && (
                          <p style={{ fontSize:13, color:'var(--muted)' }}>
                            Dropoff: <span style={{ color:'var(--text)' }}>{rule.dropoff_keyword}</span>
                          </p>
                        )}
                      </>
                    )}
                    {rule.notes && (
                      <p style={{ fontSize:12, color:'var(--muted)', fontStyle:'italic' }}>{rule.notes}</p>
                    )}
                  </div>
                </div>

                {isAdmin && (
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    <button onClick={() => { setEditTarget(rule); setError(''); }} style={{ fontSize:12, padding:'4px 10px' }}>Edit</button>
                    <button
                      onClick={() => toggleActive(rule)}
                      style={{ fontSize:12, padding:'4px 10px',
                        background: rule.active ? 'var(--amber-bg)' : 'var(--green-bg)',
                        color:      rule.active ? 'var(--amber)'    : 'var(--green)',
                        border:'none',
                      }}
                    >
                      {rule.active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => deleteRule(rule)} className="danger" style={{ fontSize:12, padding:'4px 10px' }}>Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Add pricing rule" onClose={() => setShowAdd(false)}>
          <RuleForm initial={emptyForm} onSave={createRule} onCancel={() => setShowAdd(false)} saving={saving} error={error} />
        </Modal>
      )}

      {editTarget && (
        <Modal title="Edit pricing rule" onClose={() => setEditTarget(null)}>
          <RuleForm
            initial={{
              name:           editTarget.name,
              type:           editTarget.type,
              vehicle_type:   editTarget.vehicle_type || 'any',
              price_per_hour: editTarget.price_per_hour || '',
              fixed_price:    editTarget.fixed_price    || '',
              pickup_keyword: editTarget.pickup_keyword  || '',
              dropoff_keyword:editTarget.dropoff_keyword || '',
              currency:       editTarget.currency || 'NGN',
              notes:          editTarget.notes    || '',
              active:         editTarget.active   ?? true,
            }}
            onSave={updateRule} onCancel={() => setEditTarget(null)} saving={saving} error={error}
          />
        </Modal>
      )}
    </div>
  </PlanGate>
  );
}
