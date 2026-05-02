/**
 * api.js — central fetch helper
 *
 * Automatically injects x-company-id and Authorization headers on every request.
 * Import this instead of using fetch directly in all dashboard pages.
 *
 * Usage:
 *   import { api, apiUrl } from '@/lib/api';
 *   const data = await api('/bookings?perPage=20').then(r => r.json());
 */

function getCompanyId() {
  if (typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem('ariva_company_id') ?? '';
  } catch { return ''; }
}

function getPbToken() {
  if (typeof window === 'undefined') return '';
  try {
    const raw = sessionStorage.getItem('pb_auth');
    return raw ? (JSON.parse(raw).token ?? '') : '';
  } catch { return ''; }
}

export function apiUrl(path) {
  const base = process.env.NEXT_PUBLIC_API_URL ?? '';
  return `${base}${path}`;
}

export function api(path, options = {}) {
  const companyId = getCompanyId();
  const token     = getPbToken();
  const headers   = {
    ...(options.headers ?? {}),
    ...(companyId ? { 'x-company-id': companyId } : {}),
    ...(token     ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  // Only set Content-Type for JSON bodies (not FormData)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(apiUrl(path), { ...options, headers });
}
