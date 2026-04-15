import { getClient } from './pbService.js';
import { logActivity } from './activityLogger.js';
import { syncDriverStatuses } from './driverService.js';
import { sendReminders } from './reminderService.js';

/**
 * Runs every 60 seconds and auto-advances booking statuses:
 *
 *   confirmed → on_trip   when now >= pickup_datetime
 *   on_trip   → completed when now >= pickup_datetime + duration_hours
 *
 * Uses pickup_datetime as the reference point for both transitions.
 * This means:
 *  - A trip starts at the scheduled pickup time
 *  - A trip completes at pickup_datetime + duration_hours
 *
 * For manually added test records with past pickup times, set
 * pickup_datetime to a future time to test the flow correctly.
 */

export function startStatusScheduler() {
  console.info('[scheduler] Status scheduler started (60s interval)');
  tick();
  setInterval(tick, 60 * 1000);
}

async function tick() {
  try {
    const pb  = await getClient();
    const now = new Date();

    // ── confirmed → on_trip ───────────────────────────────────────────────
    // Only advance bookings whose pickup time has arrived
    const allConfirmed = await pb.collection('bookings').getFullList({
      filter: 'status = "confirmed" || status = ""', requestKey: null,
    });

    for (const b of allConfirmed) {
      if (!b.pickup_datetime) continue;
      const pickupTime = new Date(b.pickup_datetime);
      if (now >= pickupTime) {
        await pb.collection('bookings').update(b.id, { status: 'on_trip' });
        await logActivity('on_trip', b.caller_phone, `Trip started for ${b.reference}`);
        console.info(`[scheduler] ${b.reference} → on_trip`);
      }
    }

    // ── on_trip → completed ───────────────────────────────────────────────
    // Complete only when now >= pickup_datetime + duration_hours
    const allOnTrip = await pb.collection('bookings').getFullList({
      filter: 'status = "on_trip"', requestKey: null,
    });

    for (const b of allOnTrip) {
      if (!b.pickup_datetime || !b.duration_hours) continue;
      const pickupTime  = new Date(b.pickup_datetime);
      const completedAt = new Date(pickupTime.getTime() + b.duration_hours * 3600 * 1000);

      if (now >= completedAt) {
        await pb.collection('bookings').update(b.id, { status: 'completed' });
        await logActivity('completed', b.caller_phone, `Trip completed for ${b.reference}`);
        console.info(`[scheduler] ${b.reference} → completed`);
      }
    }

    // Send 1-hour pickup reminders
    await sendReminders();

    // Sync driver statuses with booking statuses
    await syncDriverStatuses();

  } catch (err) {
    console.error('[scheduler] tick error:', err.message);
  }
}
