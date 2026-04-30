import { getPB } from './pb';

export async function getAllCompanies() {
  return getPB().collection('companies').getFullList({ sort: '-created', requestKey: null });
}

export async function getAllBookings(filter = '') {
  return getPB().collection('bookings').getFullList({ sort: '-created', filter, requestKey: null });
}

export async function getAllLeads(filter = '') {
  return getPB().collection('leads').getFullList({ sort: '-created', filter, requestKey: null });
}

export async function getAllCalls(filter = '') {
  return getPB().collection('calls').getFullList({ sort: '-created', filter, requestKey: null });
}

export async function getAllPayments() {
  return getPB().collection('payments').getFullList({ sort: '-created', requestKey: null });
}

export async function getAllUsers() {
  return getPB().collection('users').getFullList({ sort: '-created', requestKey: null });
}

export async function getAllDrivers() {
  return getPB().collection('drivers').getFullList({ sort: '-created', requestKey: null });
}

export async function getActivityLogs(filter = '') {
  return getPB().collection('activity_logs').getFullList({
    sort: '-created', filter, requestKey: null,
  });
}

export async function getCompanyBookings(companyId: string) {
  return getPB().collection('bookings').getFullList({
    filter: `company_id = "${companyId}"`, sort: '-created', requestKey: null,
  });
}

export async function getCompanyCalls(companyId: string) {
  return getPB().collection('calls').getFullList({
    filter: `company_id = "${companyId}"`, sort: '-created', requestKey: null,
  });
}

export async function getCompanyLeads(companyId: string) {
  return getPB().collection('leads').getFullList({
    filter: `company_id = "${companyId}"`, sort: '-created', requestKey: null,
  });
}

export async function getCompanyUsers(companyId: string) {
  return getPB().collection('users').getFullList({
    filter: `company_id = "${companyId}"`, sort: '-created', requestKey: null,
  });
}

export async function getCompanyDrivers(companyId: string) {
  return getPB().collection('drivers').getFullList({
    filter: `company_id = "${companyId}"`, sort: '-created', requestKey: null,
  });
}

export async function getCompanyPayments(companyId: string) {
  return getPB().collection('payments').getFullList({
    filter: `company_id = "${companyId}"`, sort: '-created', requestKey: null,
  });
}

export async function getCompanyActivity(companyId: string) {
  return getPB().collection('activity_logs').getFullList({
    filter: `company_id = "${companyId}"`, sort: '-created', requestKey: null,
  });
}

export function pingHealth(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_API_URL || '';
  return fetch(`${url}/health`, { cache: 'no-store' })
    .then(r => r.ok)
    .catch(() => false);
}

export function pingPocketBase(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_PB_URL || '';
  return fetch(`${url}/api/health`, { cache: 'no-store' })
    .then(r => r.ok)
    .catch(() => false);
}
