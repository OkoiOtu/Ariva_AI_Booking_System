import twilio from 'twilio';
import { getClient } from './pbService.js';
import { logActivity } from './activityLogger.js';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const FROM   = process.env.TWILIO_PHONE_NUMBER;

/**
 * sendReminders
 *
 * Finds confirmed/assigned bookings whose pickup time is within
 * the next 60 minutes and sends an SMS reminder if not already sent.
 *
 * Called by the status scheduler every 60 seconds.
 */
export async function sendReminders() {
  if (!FROM || !process.env.TWILIO_ACCOUNT_SID) return; // skip if Twilio not configured

  try {
    const pb  = await getClient();
    const now = new Date();

    // Window: pickup is between now+50min and now+70min (centred on 1 hour)
    const windowStart = new Date(now.getTime() + 50 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + 70 * 60 * 1000);

    const wsStr = windowStart.toISOString().replace('T', ' ').slice(0, 19);
    const weStr = windowEnd.toISOString().replace('T', ' ').slice(0, 19);

    const upcoming = await pb.collection('bookings').getFullList({
      filter: `(status = "confirmed" || status = "assigned") && pickup_datetime >= "${wsStr}" && pickup_datetime <= "${weStr}" && reminder_sent = false`,
      requestKey: null,
    });

    for (const booking of upcoming) {
      try {
        // Mark before sending so a concurrent tick cannot pick up the same booking.
        // If the SMS then fails, we skip this reminder rather than risk a duplicate.
        const marked = await pb.collection('bookings').update(
          booking.id,
          { reminder_sent: true },
          { filter: 'reminder_sent = false', requestKey: null }
        ).catch(() => null);

        if (!marked) continue; // another tick already claimed this booking

        const pickupTime = new Date(booking.pickup_datetime).toLocaleTimeString('en-NG', {
          hour: '2-digit', minute: '2-digit',
        });

        const body = [
          `Hi ${booking.caller_name}, this is a reminder for your booking today.`,
          `Pickup: ${pickupTime} from ${booking.pickup_address}`,
          `Ref: ${booking.reference}`,
          `Questions? Call us: ${FROM}`,
        ].join('\n');

        await client.messages.create({ body, from: FROM, to: booking.caller_phone });
        await logActivity('reminder_sent', booking.caller_phone, `1-hour reminder sent for booking ${booking.reference}`);
        console.info(`[reminders] Reminder sent for ${booking.reference}`);
      } catch (err) {
        console.error(`[reminders] Failed for ${booking.reference}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[reminders] sendReminders error:', err.status, err.message, JSON.stringify(err.data ?? {}));
  }
}
