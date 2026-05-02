'use client';
import { useEffect, useState } from 'react';
import { getPhoneNumbers, addPhoneNumber, assignPhoneNumber, provisionCalling, disableCalling, getAllCompanies } from '@/lib/api';

const COUNTRY_OPTIONS = ['US', 'NG', 'GB', 'CA', 'AU', 'GH', 'KE', 'ZA'];

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  available: { bg: 'var(--green-bg)',  color: 'var(--green)',  label: 'Available' },
  active:    { bg: 'var(--accent-bg)', color: 'var(--accent)', label: 'Active'    },
  disabled:  { bg: 'var(--red-bg)',    color: 'var(--red)',    label: 'Disabled'  },
  reserved:  { bg: 'var(--amber-bg)',  color: 'var(--amber)',  label: 'Reserved'  },
};

function StatusBadge({ status, companyName }: { status: string; companyName?: string }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.reserved;
  return (
    <span style={{ fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color }}>
      {s.label}{companyName ? ` — ${companyName}` : ''}
    </span>
  );
}

const blankForm = { number: '', friendly_name: '', twilio_sid: '', country: 'NG', area_code: '', monthly_cost: 1.15, notes: '' };

export default function PhonePoolPage() {
  const [numbers,       setNumbers]       = useState<any[]>([]);
  const [companies,     setCompanies]     = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showAdd,       setShowAdd]       = useState(false);
  const [assignModal,   setAssignModal]   = useState<any | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState('');
  const [form,          setForm]          = useState({ ...blankForm });
  const [assignCompanyId, setAssignCompanyId] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [nums, cos] = await Promise.all([getPhoneNumbers(), getAllCompanies()]);
      setNumbers(Array.isArray(nums) ? nums : []);
      setCompanies(Array.isArray(cos) ? cos : []);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAddNumber() {
    if (!form.number) { setError('Phone number is required'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      await addPhoneNumber(form);
      setSuccess(`Number ${form.number} added to pool`);
      setShowAdd(false);
      setForm({ ...blankForm });
      await load();
    } catch (err: any) {
      setError(err.message ?? 'Failed to add number');
    } finally { setSaving(false); }
  }

  async function handleAssign() {
    if (!assignCompanyId) { setError('Select a company first'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      await assignPhoneNumber(assignModal.id, assignCompanyId);
      setSuccess('Number assigned successfully');
      setAssignModal(null);
      setAssignCompanyId('');
      await load();
    } catch (err: any) {
      setError(err.message ?? 'Failed to assign number');
    } finally { setSaving(false); }
  }

  async function handleProvision(companyId: string) {
    setSaving(true); setError(''); setSuccess('');
    try {
      const data = await provisionCalling(companyId);
      setSuccess(`Calling provisioned — number: ${(data as any).number ?? 'assigned'}`);
      await load();
    } catch (err: any) {
      setError(err.message ?? 'Failed to provision');
    } finally { setSaving(false); }
  }

  async function handleDisable(companyId: string) {
    if (!confirm('Disable AI calling for this company?')) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await disableCalling(companyId);
      setSuccess('AI calling disabled');
      await load();
    } catch (err: any) {
      setError(err.message ?? 'Failed to disable');
    } finally { setSaving(false); }
  }

  const stats = {
    total:     numbers.length,
    active:    numbers.filter(n => n.status === 'active').length,
    available: numbers.filter(n => n.status === 'available').length,
    disabled:  numbers.filter(n => n.status === 'disabled').length,
  };

  const assignedCompanyIds = new Set(numbers.filter(n => n.company_id).map(n => n.company_id));
  const unassignedCompanies = companies.filter(c => !assignedCompanyIds.has(c.id));

  const inp: React.CSSProperties = {
    padding: '8px 12px', fontSize: 13, width: '100%',
    borderRadius: 'var(--radius)', border: '0.5px solid var(--border)',
    background: 'var(--bg)', color: 'var(--text)',
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500 }}>Number Pool</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Manage Twilio phone numbers for AI calling</p>
        </div>
        <button className="primary" onClick={() => setShowAdd(true)}>+ Add number</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 24 }}>
        {([['Total', stats.total, 'var(--text)'], ['Active', stats.active, 'var(--accent)'], ['Available', stats.available, 'var(--green)'], ['Disabled', stats.disabled, 'var(--red)']] as [string, number, string][]).map(([label, val, color]) => (
          <div key={label} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 18px' }}>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 600, color }}>{val}</p>
          </div>
        ))}
      </div>

      {(error || success) && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 13, background: error ? 'var(--red-bg)' : 'var(--green-bg)', color: error ? 'var(--red)' : 'var(--green)', border: `0.5px solid ${error ? 'var(--red)' : 'var(--green)'}` }}>
          {error || success}
          <button onClick={() => { setError(''); setSuccess(''); }} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'inherit' }}>×</button>
        </div>
      )}

      {/* Add number modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px 24px', width: '100%', maxWidth: 480 }}>
            <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 20 }}>Add number to pool</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Phone number *</label>
                <input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} placeholder="+2348001234567" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Friendly name</label>
                <input value={form.friendly_name} onChange={e => setForm(f => ({ ...f, friendly_name: e.target.value }))} placeholder="Lagos #1" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Twilio SID</label>
                <input value={form.twilio_sid} onChange={e => setForm(f => ({ ...f, twilio_sid: e.target.value }))} placeholder="PN..." style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Country</label>
                  <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} style={inp}>
                    {COUNTRY_OPTIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Area code</label>
                  <input value={form.area_code} onChange={e => setForm(f => ({ ...f, area_code: e.target.value }))} placeholder="0800" style={inp} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Monthly cost ($)</label>
                <input type="number" value={form.monthly_cost} onChange={e => setForm(f => ({ ...f, monthly_cost: +e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes..." style={inp} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => { setShowAdd(false); setForm({ ...blankForm }); }}>Cancel</button>
              <button className="primary" onClick={handleAddNumber} disabled={saving}>{saving ? 'Adding...' : 'Add to pool'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {assignModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '28px 24px', width: '100%', maxWidth: 400 }}>
            <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Assign {assignModal.number}</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
              Select the company to assign this number to. This is permanent — the number will always belong to this company.
            </p>
            {unassignedCompanies.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>All companies already have numbers assigned.</p>
            ) : (
              <select value={assignCompanyId} onChange={e => setAssignCompanyId(e.target.value)} style={{ ...inp, marginBottom: 20 }}>
                <option value="">— Select company —</option>
                {unassignedCompanies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.plan})</option>)}
              </select>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setAssignModal(null); setAssignCompanyId(''); }}>Cancel</button>
              <button className="primary" onClick={handleAssign} disabled={saving || !assignCompanyId}>{saving ? 'Assigning...' : 'Assign'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p style={{ color: 'var(--muted)', padding: '40px 0' }}>Loading...</p>
      ) : numbers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>phone_paused</span>
          <p style={{ fontSize: 14 }}>No numbers in the pool yet.</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Add a Twilio number to get started.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                  {['Number', 'Name', 'Status', 'Assigned to', 'Date assigned', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {numbers.map((n: any) => (
                  <tr key={n.id} style={{ borderBottom: '0.5px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '10px 16px', fontSize: 13, fontFamily: 'monospace' }}>{n.number}</td>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--muted)' }}>{n.friendly_name || '—'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <StatusBadge status={n.status} companyName={n.expand?.company_id?.name} />
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 13 }}>
                      {n.expand?.company_id?.name ?? (n.company_id ? <span style={{ color: 'var(--muted)', fontFamily: 'monospace', fontSize: 11 }}>{n.company_id}</span> : <span style={{ color: 'var(--muted)' }}>—</span>)}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--muted)' }}>
                      {n.assigned_at ? new Date(n.assigned_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {n.status === 'available' && (
                          <button onClick={() => { setAssignModal(n); setAssignCompanyId(''); }} style={{ fontSize: 12, padding: '4px 10px' }}>
                            Assign
                          </button>
                        )}
                        {n.status === 'active' && n.company_id && (
                          <>
                            <button onClick={() => handleProvision(n.company_id)} disabled={saving} style={{ fontSize: 12, padding: '4px 10px' }}>
                              Refresh Vapi
                            </button>
                            <button onClick={() => handleDisable(n.company_id)} disabled={saving} style={{ fontSize: 12, padding: '4px 10px', color: 'var(--red)', border: '0.5px solid var(--red)', background: 'var(--red-bg)' }}>
                              Disable
                            </button>
                          </>
                        )}
                        {n.status === 'disabled' && n.company_id && (
                          <button onClick={() => handleProvision(n.company_id)} disabled={saving} style={{ fontSize: 12, padding: '4px 10px', color: 'var(--green)', border: '0.5px solid var(--green)', background: 'var(--green-bg)' }}>
                            Reactivate
                          </button>
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
