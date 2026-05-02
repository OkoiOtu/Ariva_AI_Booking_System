'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth';
import { api } from './api';

const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [company, setCompany]   = useState(null);
  const [loading, setLoading]   = useState(true);

  async function loadCompany(companyId) {
    try {
      const res = await api(`/companies/${companyId}`);
      if (!res.ok) throw new Error(`Failed to load company (${res.status})`);
      const record = await res.json();
      setCompany(record);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('ariva_company_id', record.id);
      }
      return record;
    } catch (err) {
      console.error('[company] failed to load company:', err.message);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setCompany(null); setLoading(false); if (typeof window !== 'undefined') sessionStorage.removeItem('ariva_company_id'); return; }

    const companyId = user.company_id;
    if (!companyId) { setLoading(false); return; }
    loadCompany(companyId).finally(() => setLoading(false));
  }, [user, authLoading]);

  function refreshCompany() {
    if (user?.company_id) loadCompany(user.company_id);
  }

  return (
    <CompanyContext.Provider value={{ company, loading, refreshCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be used inside CompanyProvider');
  return ctx;
}

/**
 * Returns fetch options with x-company-id header injected.
 * Usage: fetch(url, withCompany(companyId, { method: 'POST', ... }))
 */
export function withCompany(companyId, options = {}) {
  return {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
      ...(companyId ? { 'x-company-id': companyId } : {}),
    },
  };
}
