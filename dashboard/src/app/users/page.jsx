'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import PlanGate from '@/components/PlanGate';

import { api } from '@/lib/api';

const MAX_USERS = 10;

const ROLE_META = {
  super_admin: { label:'Super admin', bg:'var(--purple-bg)', color:'var(--purple)' },
  admin:       { label:'Admin',       bg:'var(--accent-bg)', color:'var(--accent)' },
  user:        { label:'User',        bg:'var(--gray-bg)',   color:'var(--gray)'   },
};

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 16px' }}>
      <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'24px 28px', width:'100%', maxWidth:440 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <p style={{ fontSize:15, fontWeight:500 }}>{title}</p>
          <button onClick={onClose} style={{ border:'none', background:'none', fontSize:20, color:'var(--muted)', padding:0 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:80, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 16px' }}>
      <div style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'24px 28px', width:'100%', maxWidth:360 }}>
        <p style={{ fontSize:15, fontWeight:500, marginBottom:10 }}>{title}</p>
        <p style={{ fontSize:13, color:'var(--muted)', marginBottom:24, lineHeight:1.6 }}>{message}</p>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onCancel}>Cancel</button>
          <button onClick={onConfirm} className="danger">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function UserForm({ initial, onSave, onCancel, saving, error, isEdit, canSetSuperAdmin }) {
  const [form, setForm] = useState(initial);
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const s = { width:'100%', padding:'7px 10px', fontSize:13 };

  // Role options based on creator's role
  const roleOptions = canSetSuperAdmin
    ? [['super_admin','Super admin'],['admin','Admin'],['user','User']]
    : currentUser?.role === 'super_admin'
      ? [['admin','Admin'],['user','User']]
      : [['user','User']];

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div>
        <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>Full name</label>
        <input value={form.full_name} onChange={f('full_name')} style={s} />
      </div>
      <div>
        <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>Email</label>
        <input type="email" required value={form.email} onChange={f('email')} style={s} />
      </div>
      {!isEdit && (
        <div>
          <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>Password (min. 8 characters)</label>
          <input type="password" required minLength={8} value={form.password ?? ''} onChange={f('password')} style={s} />
        </div>
      )}
      <div>
        <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>Phone number (for booking alerts)</label>
        <input type="tel" value={form.phone ?? ''} onChange={f('phone')} placeholder="+234..." style={s} />
        <p style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>Receives SMS when a customer books or cancels.</p>
      </div>
      <div>
        <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>Role</label>
        <select value={form.role} onChange={f('role')} style={s}>
          {roleOptions.map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        {form.role === 'super_admin' && (
          <p style={{ fontSize:11, color:'var(--purple)', marginTop:4 }}>
            Super admin cannot be deleted by other admins. Only one super admin recommended.
          </p>
        )}
      </div>
      {error && <p style={{ fontSize:12, color:'var(--red)', background:'var(--red-bg)', padding:'8px 10px', borderRadius:'var(--radius)' }}>{error}</p>}
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create user'}</button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();

  const isSuperAdmin = ['super_admin','author'].includes(currentUser?.role);
  const isAdmin      = ['admin','super_admin','author'].includes(currentUser?.role);

  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [error, setError]           = useState('');
  const [saving, setSaving]         = useState(false);

  const emptyForm = { full_name:'', email:'', password:'', phone:'', role:'user' };

  async function load() {
    setLoading(true);
    try {
      const res  = await api(`/users`);
      const data = await res.json();
      setUsers(data.items ?? []);
    } catch (err) {
      console.error('[users page]', err.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function createUser(form) {
    setSaving(true); setError('');
    try {
      const res = await api(`/users`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create user.'); return; }
      setShowAdd(false); load();
    } finally { setSaving(false); }
  }

  async function updateUser(form) {
    setSaving(true); setError('');
    try {
      const payload = {};
      if (form.full_name !== undefined) payload.full_name = form.full_name;
      if (form.email)                   payload.email     = form.email;
      if (form.phone  !== undefined)    payload.phone     = form.phone;
      if (form.role)                    payload.role      = form.role;
      const res = await api(`/users/${editTarget.id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to update user.'); return; }
      setEditTarget(null); load();
    } catch (err) {
      setError(err.message ?? 'Network error.');
    } finally { setSaving(false); }
  }

  async function confirmSuspend(u) {
    await api(`/users/${u.id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ suspended: !u.suspended }),
    });
    setConfirmDialog(null); load();
  }

  async function confirmDelete(u) {
    await api(`/users/${u.id}`, { method:'DELETE' });
    setConfirmDialog(null); load();
  }

  // Can the current user act on target user?
  function canActOn(target) {
    if (!target) return false;
    if (target.id === currentUser?.id) return false;           // never act on yourself
    if (target.role === 'super_admin') return false;           // super_admin protected
    if (target.role === 'author') return false;                // author always protected
    if (currentUser?.role === 'super_admin') return true;      // super_admin can act on admin+user
    if (currentUser?.role === 'admin' && target.role === 'user') return true; // admin → user only
    return false;
  }

  return (
    <PlanGate feature="users">
    <div style={{ maxWidth:760, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:500 }}>Users</h1>
          <p style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>{users.length} / {MAX_USERS} users</p>
        </div>
        {isAdmin && users.length < MAX_USERS && (
          <button className="primary" onClick={() => { setShowAdd(true); setError(''); }}>+ Add user</button>
        )}
      </div>

      {/* Role legend */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {Object.entries(ROLE_META).map(([role, meta]) => (
          <span key={role} style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:500, background:meta.bg, color:meta.color }}>
            {meta.label}
          </span>
        ))}
        <span style={{ fontSize:11, color:'var(--muted)', alignSelf:'center' }}>
          · Super admin cannot be deleted
        </span>
      </div>

      {!isAdmin && (
        <div style={{ background:'var(--amber-bg)', color:'var(--amber)', padding:'10px 14px', borderRadius:'var(--radius)', fontSize:13, marginBottom:20 }}>
          View only. Contact an admin to make changes.
        </div>
      )}

      <div className="users-table-wrap" style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)' }}>
        {loading ? (
          <p style={{ padding:24, color:'var(--muted)' }}>Loading...</p>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:780 }}>
            <thead>
              <tr style={{ borderBottom:'0.5px solid var(--border)' }}>
                {['User','Email','Phone','Role','Status','Joined',...(isAdmin ? ['Actions'] : [])].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'8px 16px', fontSize:12, color:'var(--muted)', fontWeight:500, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const roleMeta = ROLE_META[u.role] ?? ROLE_META.user;
                const canAct   = canActOn(u);
                return (
                  <tr key={u.id} style={{ borderBottom:'0.5px solid var(--border)', opacity: u.suspended ? 0.55 : 1 }}>
                    <td style={{ padding:'10px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{
                          width:30, height:30, borderRadius:'50%',
                          background: u.role === 'super_admin' ? 'var(--purple-bg)' : u.suspended ? 'var(--gray-bg)' : 'var(--accent-bg)',
                          color:      u.role === 'super_admin' ? 'var(--purple)'    : u.suspended ? 'var(--gray)'    : 'var(--accent)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:12, fontWeight:500, flexShrink:0,
                        }}>
                          {(u.full_name||u.email)?.[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontSize:13 }}>{u.full_name||'—'}</span>
                        {u.id === currentUser?.id && (
                          <span style={{ fontSize:10, padding:'1px 6px', borderRadius:20, background:'var(--accent-bg)', color:'var(--accent)' }}>You</span>
                        )}
                        {u.role === 'super_admin' && (
                          <span className="material-symbols-outlined" style={{ fontSize:14, color:'var(--purple)' }} title="Super admin — protected">shield</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding:'10px 16px', color:'var(--muted)', fontSize:13 }}>{u.email}</td>
                    <td style={{ padding:'10px 16px', color:'var(--muted)', fontSize:13 }}>
                      {u.phone ? (
                        <span title="Receives booking SMS alerts">📱 {u.phone}</span>
                      ) : (
                        <span style={{ color:'var(--border)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding:'10px 16px' }}>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500, background:roleMeta.bg, color:roleMeta.color }}>
                        {roleMeta.label}
                      </span>
                    </td>
                    <td style={{ padding:'10px 16px' }}>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500,
                        background: u.suspended ? 'var(--red-bg)' : 'var(--green-bg)',
                        color:      u.suspended ? 'var(--red)'    : 'var(--green)',
                      }}>{u.suspended ? 'Suspended' : 'Active'}</span>
                    </td>
                    <td style={{ padding:'10px 16px', fontSize:12, color:'var(--muted)', whiteSpace:'nowrap' }}>
                      {new Date(u.created).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' })}
                    </td>
                    {isAdmin && (
                      <td style={{ padding:'10px 16px' }}>
                        {canAct ? (
                          <div style={{ display:'flex', gap:6 }}>
                            <button onClick={() => { setEditTarget(u); setError(''); }} style={{ fontSize:12, padding:'3px 10px' }}>Edit</button>
                            <button
                              onClick={() => setConfirmDialog({ type:'suspend', user:u })}
                              style={{ fontSize:12, padding:'3px 10px',
                                background: u.suspended ? 'var(--green-bg)' : 'var(--amber-bg)',
                                color:      u.suspended ? 'var(--green)'    : 'var(--amber)',
                                border:'none',
                              }}
                            >
                              {u.suspended ? 'Reinstate' : 'Suspend'}
                            </button>
                            <button onClick={() => setConfirmDialog({ type:'delete', user:u })} className="danger" style={{ fontSize:12, padding:'3px 10px' }}>Delete</button>
                          </div>
                        ) : (
                          <span style={{ fontSize:12, color:'var(--muted)' }}>
                            {u.role === 'super_admin' ? 'Protected' : u.id === currentUser?.id ? 'You' : '—'}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add user modal */}
      {showAdd && (
        <Modal title="Add new user" onClose={() => setShowAdd(false)}>
          <UserForm
            initial={emptyForm} onSave={createUser}
            onCancel={() => setShowAdd(false)}
            saving={saving} error={error} isEdit={false}
            canSetSuperAdmin={currentUser?.role === 'author'}
          />
        </Modal>
      )}

      {/* Edit user modal */}
      {editTarget && (
        <Modal title="Edit user" onClose={() => setEditTarget(null)}>
          <UserForm
            initial={{ full_name:editTarget.full_name??'', email:editTarget.email, phone:editTarget.phone??'', role:editTarget.role??'user', password:'' }}
            onSave={updateUser} onCancel={() => setEditTarget(null)}
            saving={saving} error={error} isEdit={true}
            canSetSuperAdmin={currentUser?.role === 'author'}
          />
        </Modal>
      )}

      {/* Confirm dialogs */}
      {confirmDialog?.type === 'suspend' && (
        <ConfirmDialog
          title={confirmDialog.user.suspended ? 'Reinstate user?' : 'Suspend user?'}
          message={confirmDialog.user.suspended
            ? `Reinstate ${confirmDialog.user.email}? They will regain access.`
            : `Suspend ${confirmDialog.user.email}? They will not be able to log in.`}
          confirmLabel={confirmDialog.user.suspended ? 'Yes, reinstate' : 'Yes, suspend'}
          onConfirm={() => confirmSuspend(confirmDialog.user)}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {confirmDialog?.type === 'delete' && (
        <ConfirmDialog
          title="Permanently delete user?"
          message={`Permanently delete ${confirmDialog.user.email}? This cannot be undone.`}
          confirmLabel="Yes, delete permanently"
          onConfirm={() => confirmDelete(confirmDialog.user)}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
    </PlanGate>
  );
}
