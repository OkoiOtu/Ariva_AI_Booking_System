'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import pb from './pb';
import { logEvent } from './activityLog';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(pb.authStore.model);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = pb.authStore.onChange((_token, model) => {
      setUser(model);
    });

    // No stored session — don't force a refresh request.
    if (!pb.authStore.token) {
      setLoading(false);
      return unsub;
    }

    pb.collection('users').authRefresh()
      .then(auth => {
        if (auth.record?.role === 'author' || auth.record?.suspended) {
          pb.authStore.clear();
          setUser(null);
        } else {
          setUser(auth.record);
        }
      })
      .catch(err => {
        console.warn('[auth] authRefresh failed:', err?.message ?? err);
        if (!pb.authStore.isValid) {
          pb.authStore.clear();
          setUser(null);
        } else {
          // Keep the restored auth model on transient refresh failures.
          setUser(pb.authStore.model);
        }
      })
      .finally(() => setLoading(false));

    return unsub;
  }, []);

  async function login(email, password) {
    const auth = await pb.collection('users').authWithPassword(email, password);

    if (auth.record?.role === 'author') {
      pb.authStore.clear();
      throw new Error('AUTHOR');
    }

    if (auth.record?.suspended) {
      pb.authStore.clear();
      const name = auth.record.full_name || auth.record.email;
      await logEvent('login_suspended', name, `Suspended account attempted login: ${auth.record.email}`);
      throw new Error('SUSPENDED');
    }

    if (!auth.record?.verified) {
      pb.authStore.clear();
      throw new Error('UNVERIFIED');
    }

    const name = auth.record.full_name || auth.record.email;
    await logEvent('login_success', name, `${auth.record.email} signed in`);
    setUser(auth.record);
    return auth.record;
  }

  async function loginWithGoogle() {
    const authData = await pb.collection('users').authWithOAuth2({ provider: 'google' });
    const record   = authData.record;

    // Backfill full_name from Google if not already stored
    if (!record.full_name && authData.meta?.name) {
      try {
        await pb.collection('users').update(record.id, { full_name: authData.meta.name });
      } catch {}
    }

    const fresh = pb.authStore.model;
    setUser(fresh);
    return fresh;
  }

  async function sendVerificationEmail(email) {
    await pb.collection('users').requestVerification(email);
  }

  async function requestPasswordReset(email) {
    await pb.collection('users').requestPasswordReset(email);
  }

  async function confirmPasswordReset(token, password) {
    await pb.collection('users').confirmPasswordReset(token, password, password);
  }

  function logout() {
    pb.authStore.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout, sendVerificationEmail, requestPasswordReset, confirmPasswordReset }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function getInitials(user) {
  if (!user) return '?';
  if (user.full_name) return user.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return user.email?.[0]?.toUpperCase() ?? '?';
}

export function getDisplayName(user) {
  if (!user) return '';
  return user.full_name || user.email || '';
}

/**
 * Role hierarchy: author > super_admin > admin > user
 */
export function isAuthor(user)      { return user?.role === 'author'; }
export function isSuperAdmin(user)  { return user?.role === 'super_admin' || isAuthor(user); }
export function isAdminUser(user)   { return ['author','super_admin','admin'].includes(user?.role); }
export function canManageUsers(user){ return ['author','super_admin','admin'].includes(user?.role); }
export function canManageCompany(user){ return ['author','super_admin'].includes(user?.role); }

/**
 * What roles a user can create based on their own role:
 * super_admin → can create admin and user
 * admin       → can only create user
 */
export function creatableRoles(user) {
  if (isAuthor(user) || isSuperAdmin(user)) return ['admin','user'];
  if (user?.role === 'admin')               return ['user'];
  return [];
}

/**
 * Password strength checker
 * Returns { score: 0-4, label, color, tips }
 */
export function checkPasswordStrength(password) {
  if (!password) return { score:0, label:'', color:'transparent', tips:[] };

  const tips = [];
  let score  = 0;

  if (password.length >= 8)  score++;
  else tips.push('At least 8 characters');

  if (password.length >= 12) score++;
  else if (password.length >= 8) tips.push('12+ characters is stronger');

  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  else tips.push('Mix uppercase and lowercase letters');

  if (/[0-9]/.test(password)) score++;
  else tips.push('Add at least one number');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else tips.push('Add a special character (!@#$...)');

  const weak = ['password','12345678','qwerty','letmein','welcome','admin123','pass1234'];
  if (weak.some(w => password.toLowerCase().includes(w))) {
    score = Math.min(score, 1);
    tips.unshift('Avoid common passwords');
  }

  const capped = Math.min(score, 4);
  const labels = ['','Weak','Fair','Good','Strong'];
  const colors = ['transparent','#ef4444','#f97316','#eab308','#22c55e'];
  return { score:capped, label:labels[capped], color:colors[capped], tips:tips.slice(0,3) };
}
