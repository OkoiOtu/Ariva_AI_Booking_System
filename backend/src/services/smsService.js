import twilio from 'twilio';
import { getClient } from './pbService.js';

const client   = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const FROM     = process.env.TWILIO_PHONE_NUMBER;
const DASH_URL = process.env.DASHBOARD_URL ?? 'https://ariva-dashboard.up.railway.app';

const SETTINGS_KEY = 'notification_settings';
const DEFAULTS = {
  sms_booking_confirmed: true,
  sms_booking_cancelled: true,
  sms_reminder_1hr:      true,
  sms_admin_new_booking: true,
  sms_admin_new_lead:    true,
};

async function getSettings() {
  try {
    const pb     = await getClient();
    const record = await pb.collection('app_settings').getFirstListItem(
      `key = "${SETTINGS_KEY}"`, { requestKey: null }
    );
    return { ...DEFAULTS, ...JSON.parse(record.value) };
  } catch {
    return DEFAULTS;
  }
}

/**
 * Returns phone numbers of all active super_admin and admin users for a company.
 * Used to fan-out booking/lead alert SMS to every team member who has a phone set.
 */
async function getCompanyAdminPhones(companyId) {
  if (!companyId) return [];
  try {
    const pb    = await getClient();
    const users = await pb.collection('users').getFullList({
      filter:     `company_id = "${companyId}" && suspended = false`,
      requestKey: null,
    });
    return users
      .filter(u => ['super_admin', 'admin'].includes(u.role) && u.phone?.trim())
      .map(u => u.phone.trim());
  } catch (err) {
    console.error('[smsService] getCompanyAdminPhones error:', err.message);
    return [];
  }
}

async function blast(phones, body) {
  if (!phones.length || !FROM) return;
  await Promise.all(
    phones.map(to =>
      client.messages.create({ body, from: FROM, to }).catch(err =>
        console.error('[smsService] blast failed to', to, ':', err.message)
      )
    )
  );
}

export async function smsPlain(to, body) {
  if (!to || !body || !FROM) return;
  return client.messages.create({ body, from: FROM, to }).catch(err =>
    console.error('[smsService] smsPlain failed:', err.message)
  );
}

export async function sendCustomerConfirmation(booking) {
  if (!FROM) return;
  const settings = await getSettings();
  if (!settings.sms_booking_confirmed) return;

  const cancelLink = `${DASH_URL}/cancel/${booking.reference}?token=${booking.cancelToken}`;
  const symbols    = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' };
  const priceStr   = booking.quotedPrice
    ? `Price: ${symbols[booking.quotedCurrency] ?? ''}${Number(booking.quotedPrice).toLocaleString()}`
    : 'Price: To be confirmed';

  const body = [
    `Hi ${booking.caller_name}, your booking is confirmed!`,
    `Ref: ${booking.reference}`,
    `Pickup: ${formatDatetime(booking.pickup_datetime)}`,
    `From: ${booking.pickup_address}`,
    booking.dropoff_address ? `To: ${booking.dropoff_address}` : null,
    `Duration: ${booking.duration_hours}h`,
    priceStr,
    `Need to cancel? ${cancelLink}`,
    `Questions? Call us: ${FROM}`,
  ].filter(Boolean).join('\n');

  return client.messages.create({ body, from: FROM, to: booking.callerPhone });
}

export async function sendCancellationSMS(booking) {
  if (!FROM) return;
  const settings = await getSettings();
  if (!settings.sms_booking_cancelled) return;

  const body = [
    `Hi ${booking.caller_name}, your booking ${booking.reference} has been cancelled.`,
    `If this was a mistake or you need to rebook, please call us: ${FROM}`,
  ].join('\n');

  try {
    return await client.messages.create({ body, from: FROM, to: booking.caller_phone });
  } catch (err) {
    console.error('[smsService] cancellation SMS failed:', err.message);
  }
}

export async function sendAdminAlert(payload, companyId) {
  const settings = await getSettings();
  if (payload.isLead && !settings.sms_admin_new_lead)    return;
  if (!payload.isLead && !settings.sms_admin_new_booking) return;

  const phones = await getCompanyAdminPhones(companyId);
  const body   = payload.isLead ? buildLeadAlert(payload) : buildBookingAlert(payload);
  await blast(phones, body);
}

export async function sendAdminCancellationAlert(booking, companyId) {
  const phones = await getCompanyAdminPhones(companyId);
  if (!phones.length) return;

  const body = [
    `Booking cancelled — ${booking.reference}`,
    `Customer: ${booking.caller_name} (${booking.caller_phone})`,
    `Was: ${formatDatetime(booking.pickup_datetime)}`,
    `${DASH_URL}/bookings`,
  ].join('\n');

  await blast(phones, body);
}

function buildBookingAlert(booking) {
  return [
    `New booking — ${booking.reference}`,
    `Name: ${booking.caller_name}`,
    `Phone: ${booking.callerPhone}`,
    `Pickup: ${formatDatetime(booking.pickup_datetime)}`,
    `From: ${booking.pickup_address}`,
    `Duration: ${booking.duration_hours}h`,
    `${DASH_URL}/bookings`,
  ].join('\n');
}

function buildLeadAlert({ callerPhone, summary }) {
  return [
    `New lead — needs review`,
    `Phone: ${callerPhone}`,
    summary,
    `${DASH_URL}/leads`,
  ].join('\n');
}

function formatDatetime(iso) {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleString('en-NG', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}
