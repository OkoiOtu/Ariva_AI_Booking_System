/**
 * formatters.js — display helpers used across all dashboard pages
 */

export const CURRENCY_SYMBOLS = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' };

export function formatPrice(amount, currency = 'NGN') {
  if (!amount && amount !== 0) return '—';
  return `${CURRENCY_SYMBOLS[currency] ?? ''}${Number(amount).toLocaleString()}`;
}

export function formatDatetime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatPhone(phone) {
  if (!phone) return '—';
  return phone;
}

export function formatDuration(hours) {
  if (!hours && hours !== 0) return '—';
  return `${hours}h`;
}

export function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}