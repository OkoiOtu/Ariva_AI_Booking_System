import { getClient } from './pbService.js';
import { smsPlain }  from './smsService.js';

/**
 * Sends a Google review request SMS to customers after their trip completes.
 *
 * Runs every scheduler tick. Only sends when:
 *   - booking status = completed
 *   - review_request_sent is false
 *   - completed_at is set
 *   - company has review_request_enabled = true
 *   - company has a google_review_url set
 *   - enough time has elapsed (review_request_delay_mins)
 */
export async function sendReviewRequests() {
  try {
    const pb = await getClient();

    const bookings = await pb.collection('bookings').getFullList({
      filter:     'status = "completed" && review_request_sent = false && completed_at != ""',
      requestKey: null,
    }).catch(() => []);

    for (const booking of bookings) {
      try {
        if (!booking.company_id || !booking.caller_phone) continue;

        const company = await pb.collection('companies').getOne(booking.company_id, { requestKey: null });

        if (!company.review_request_enabled) continue;
        if (!company.google_review_url)      continue;

        const delayMins  = company.review_request_delay_mins ?? 30;
        const sendAfter  = new Date(new Date(booking.completed_at).getTime() + delayMins * 60 * 1000);

        if (new Date() < sendAfter) continue;

        // Mark sent before sending to prevent duplicate sends on overlap
        await pb.collection('bookings').update(booking.id, { review_request_sent: true }, { requestKey: null });

        const body = [
          `Hi ${booking.caller_name}, thank you for travelling with us today!`,
          `If you enjoyed the experience, a quick Google review would mean a lot:`,
          company.google_review_url,
        ].join('\n');

        await smsPlain(booking.caller_phone, body);
        console.info(`[reviewService] Review request sent for ${booking.reference}`);
      } catch (err) {
        console.error(`[reviewService] error for booking ${booking.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[reviewService] sendReviewRequests error:', err.message);
  }
}
