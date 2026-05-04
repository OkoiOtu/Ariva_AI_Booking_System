import { getClient } from './pbService.js';
import { smsPlain }  from './smsService.js';

const MIN_DELAY_MINS    = 15;  // only act on delays >= 15 minutes
const CHECK_COOLDOWN_MS = 30 * 60 * 1000; // re-check each booking at most every 30 min
const WINDOW_HOURS      = 6;   // only track flights within next 6 hours

function fmt(date) {
  return new Date(date).toLocaleString('en-NG', {
    weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit',
  });
}

/**
 * Checks AviationStack for delays on upcoming bookings that have a flight_number.
 * Only runs when AVIATIONSTACK_API_KEY is set in env.
 * Free tier: 100 req/month — keeps usage low via 30-min cooldown per booking.
 */
export async function checkFlightDelays() {
  const apiKey = process.env.AVIATIONSTACK_API_KEY;
  if (!apiKey) return;

  try {
    const pb  = await getClient();
    const now = new Date();
    const windowEnd = new Date(now.getTime() + WINDOW_HOURS * 60 * 60 * 1000);

    const bookings = await pb.collection('bookings').getFullList({
      filter: [
        'flight_number != ""',
        'status = "confirmed"',
        `pickup_datetime > "${now.toISOString()}"`,
        `pickup_datetime < "${windowEnd.toISOString()}"`,
        'flight_adjusted = false',
      ].join(' && '),
      requestKey: null,
    }).catch(() => []);

    for (const booking of bookings) {
      try {
        // Enforce per-booking cooldown
        if (booking.flight_last_checked) {
          if (now - new Date(booking.flight_last_checked) < CHECK_COOLDOWN_MS) continue;
        }

        // Stamp check time immediately to prevent double-checking on concurrent ticks
        await pb.collection('bookings').update(booking.id, {
          flight_last_checked: now.toISOString(),
        }, { requestKey: null });

        const url  = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${encodeURIComponent(booking.flight_number)}`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!resp.ok) continue;

        const json       = await resp.json();
        const flightData = json?.data?.[0];
        if (!flightData) continue;

        const delayMins = flightData.departure?.delay ?? 0;
        if (delayMins < MIN_DELAY_MINS) continue;

        const originalPickup = new Date(booking.pickup_datetime);
        const adjustedPickup = new Date(originalPickup.getTime() + delayMins * 60 * 1000);

        await pb.collection('bookings').update(booking.id, {
          pickup_datetime:   adjustedPickup.toISOString(),
          flight_delay_mins: delayMins,
          flight_adjusted:   true,
        }, { requestKey: null });

        console.info(`[flightService] ${booking.reference}: ${booking.flight_number} delayed ${delayMins} min — pickup adjusted to ${adjustedPickup.toISOString()}`);

        await notifyDelay(booking, delayMins, adjustedPickup);
      } catch (err) {
        console.error(`[flightService] error for booking ${booking.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[flightService] checkFlightDelays error:', err.message);
  }
}

async function notifyDelay(booking, delayMins, newPickup) {
  const timeStr = fmt(newPickup);

  if (booking.caller_phone) {
    await smsPlain(booking.caller_phone, [
      `Hi ${booking.caller_name}, your flight ${booking.flight_number} is delayed by ${delayMins} min.`,
      `We've updated your pickup to ${timeStr}.`,
      `Your driver has been notified. Ref: ${booking.reference}`,
    ].join('\n')).catch(() => {});
  }

  const adminPhone = process.env.ADMIN_PHONE_NUMBER;
  if (adminPhone) {
    await smsPlain(adminPhone, [
      `Flight delay: ${booking.reference}`,
      `${booking.flight_number} delayed ${delayMins} min`,
      `Customer: ${booking.caller_name} (${booking.caller_phone})`,
      `New pickup: ${timeStr}`,
    ].join('\n')).catch(() => {});
  }
}
