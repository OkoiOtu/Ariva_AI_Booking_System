const API = () => process.env.NEXT_PUBLIC_API_URL || '';

function getToken(): string {
  try {
    const stored = sessionStorage.getItem('ariva_admin_auth');
    if (stored) return JSON.parse(stored).token || '';
  } catch {}
  return '';
}

function headers() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

async function apiFetch(path: string) {
  const res = await fetch(`${API()}${path}`, { headers: headers(), cache: 'no-store' });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

async function apiPatch(path: string, body: object) {
  const res = await fetch(`${API()}${path}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

async function apiDelete(path: string) {
  const res = await fetch(`${API()}${path}`, { method: 'DELETE', headers: headers() });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

async function apiPost(path: string, body: object) {
  const res = await fetch(`${API()}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

// ── Read ──────────────────────────────────────────────────────────────────────
export const getAdminStats     = () => apiFetch('/admin/stats');
export const getAllCompanies   = () => apiFetch('/admin/companies');
export const getCompanyDetails = (id: string) => apiFetch(`/admin/companies/${id}/details`);
export const getAllBookings     = (companyId?: string, status?: string) => {
  const params = new URLSearchParams();
  if (companyId) params.set('companyId', companyId);
  if (status)    params.set('status', status);
  const qs = params.toString();
  return apiFetch(`/admin/bookings${qs ? '?' + qs : ''}`);
};
export const getAllLeads    = (companyId?: string) => apiFetch(`/admin/leads${companyId ? '?companyId=' + companyId : ''}`);
export const getAllCalls    = (companyId?: string) => apiFetch(`/admin/calls${companyId ? '?companyId=' + companyId : ''}`);
export const getAllUsers    = () => apiFetch('/admin/users');
export const getAllPayments = () => getAllRevenue().then((r: any) => r.platformPayments || []);
export const getAllRevenue  = () => apiFetch('/admin/revenue');

// ── Mutations ─────────────────────────────────────────────────────────────────
export const updateCompany    = (id: string, data: object) => apiPatch(`/admin/companies/${id}`, data);
export const updateCompanyPlan = (id: string, plan: string) => apiPatch(`/admin/companies/${id}/plan`, { plan });
export const suspendCompany   = (id: string, active: boolean) => apiPatch(`/admin/companies/${id}/suspend`, { active });
export const deleteCompany    = (id: string) => apiDelete(`/admin/companies/${id}`);
export const sendAnnouncement = (body: object) => apiPost('/admin/announce', body);

// ── Health ────────────────────────────────────────────────────────────────────
export function pingHealth(): Promise<boolean> {
  return fetch(`${API()}/health`, { cache: 'no-store' })
    .then(r => r.ok).catch(() => false);
}

export function pingPocketBase(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_PB_URL || '';
  return fetch(`${url}/api/health`, { cache: 'no-store' })
    .then(r => r.ok).catch(() => false);
}
