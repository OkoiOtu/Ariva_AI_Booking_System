import { getClient } from './pbService.js';
import { smsPlain }  from './smsService.js';

const esc = v => String(v ?? '').replace(/"/g, '');

/**
 * Sends re-engagement SMS to lapsed customers (no booking in N+ days).
 * Runs once daily at 10 AM via the status scheduler.
 *
 * Per-company config stored on the companies record:
 *   reengagement_enabled  — master switch
 *   reengagement_days     — how many days of inactivity before contacting
 *   reengagement_message  — SMS body; supports {name} and {company} placeholders
 */
export async function runReengagementCampaign() {
  try {
    const pb = await getClient();

    const companies = await pb.collection('companies').getFullList({
      filter:     'reengagement_enabled = true && reengagement_message != ""',
      requestKey: null,
    }).catch(() => []);

    for (const company of companies) {
      try {
        await sendForCompany(pb, company);
      } catch (err) {
        console.error(`[reengagement] error for company ${company.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[reengagement] runReengagementCampaign error:', err.message);
  }
}

async function sendForCompany(pb, company) {
  const days   = company.reengagement_days ?? 30;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Bookings completed before the cutoff (lapsed customers)
  const oldBookings = await pb.collection('bookings').getFullList({
    filter:     `company_id = "${esc(company.id)}" && status = "completed" && pickup_datetime < "${cutoff.toISOString()}"`,
    requestKey: null,
  }).catch(() => []);

  // Most recent completed booking per phone number
  const latestByPhone = new Map();
  for (const b of oldBookings) {
    if (!b.caller_phone) continue;
    const existing = latestByPhone.get(b.caller_phone);
    if (!existing || new Date(b.pickup_datetime) > new Date(existing.pickup_datetime)) {
      latestByPhone.set(b.caller_phone, b);
    }
  }

  if (!latestByPhone.size) return;

  // Phones with a recent booking (within the window) — exclude them
  const recentBookings = await pb.collection('bookings').getFullList({
    filter:     `company_id = "${esc(company.id)}" && pickup_datetime >= "${cutoff.toISOString()}"`,
    requestKey: null,
  }).catch(() => []);
  const recentPhones = new Set(recentBookings.map(b => b.caller_phone).filter(Boolean));

  for (const [phone, booking] of latestByPhone) {
    if (recentPhones.has(phone)) continue;

    // Check opted out (global — no company scope for STOP replies)
    const isOptedOut = await pb.collection('opted_out_phones').getFirstListItem(
      `phone = "${esc(phone)}"`, { requestKey: null }
    ).then(() => true).catch(() => false);
    if (isOptedOut) continue;

    // Check already re-engaged within this window
    const alreadySent = await pb.collection('reengagement_log').getFirstListItem(
      `company_id = "${esc(company.id)}" && phone = "${esc(phone)}" && sent_at >= "${cutoff.toISOString()}"`,
      { requestKey: null }
    ).then(() => true).catch(() => false);
    if (alreadySent) continue;

    // Build and send message
    const body = (company.reengagement_message || '')
      .replace(/\{name\}/gi,    booking.caller_name || 'there')
      .replace(/\{company\}/gi, company.name        || 'us');

    await smsPlain(phone, `${body}\n\nReply STOP to opt out.`);

    await pb.collection('reengagement_log').create({
      company_id: company.id,
      phone,
      booking_id: booking.id,
      sent_at:    new Date().toISOString(),
    }, { requestKey: null });

    console.info(`[reengagement] SMS sent to ${phone} for company ${company.id}`);
  }
}
