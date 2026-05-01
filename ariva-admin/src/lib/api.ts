const API = () => process.env.NEXT_PUBLIC_API_URL || '';

function getToken(): string {
  try {
    const stored = sessionStorage.getItem('ariva_admin_auth');
    if (stored) return JSON.parse(stored).token || '';
  } catch {}
  return '';
}

async function apiFetch(path: string) {
  const res = await fetch(`${API()}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export const getAllCompanies   = () => apiFetch('/admin/companies');
export const getAllBookings     = (companyId?: string, status?: string) => {
  const params = new URLSearchParams();
  if (companyId) params.set('companyId', companyId);
  if (status)    params.set('status', status);
  const qs = params.toString();
  return apiFetch(`/admin/bookings${qs ? '?' + qs : ''}`);
};
export const getAllRevenue      = () => apiFetch('/admin/revenue');
export const getAdminStats     = () => apiFetch('/admin/stats');
export const getCompanyDetails = (id: string) => apiFetch(`/admin/companies/${id}/details`);

export const getAllLeads    = () => getAllBookings();
export const getAllCalls    = () => apiFetch('/admin/bookings');
export const getAllPayments = () => getAllRevenue().then(r => r.platformPayments || []);
export const getAllUsers    = () => getAllCompanies().then(() => []);

export function pingHealth(): Promise<boolean> {
  return fetch(`${API()}/health`, { cache: 'no-store' })
    .then(r => r.ok)
    .catch(() => false);
}

export function pingPocketBase(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_PB_URL || '';
  return fetch(`${url}/api/health`, { cache: 'no-store' })
    .then(r => r.ok)
    .catch(() => false);
}
