import { getClient }           from './pbService.js';
import { logActivity }         from './activityLogger.js';
import { syncDriverStatuses }  from './driverService.js';
import { sendReminders }       from './reminderService.js';
import { sendReviewRequests }  from './reviewService.js';
import { checkFlightDelays }        from './flightService.js';
import { runReengagementCampaign }  from './reengagementService.js';
import { deprovisionCalling }       from './phoneNumberService.js';

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

let _lastExpiryCheck      = 0;
let _tickCount             = 0;
let _lastReengagementDate  = '';

export function startStatusScheduler() {
  console.info('[scheduler] Status scheduler started (60s interval)');
  tick();
  setInterval(tick, 60 * 1000);
}

async function tick() {
  _tickCount++;
  try {
    const pb  = await getClient();
    const now = new Date();

    // ── confirmed → on_trip ───────────────────────────────────────────────
    let allConfirmed = [];
    try {
      allConfirmed = await pb.collection('bookings').getFullList({
        filter: 'status = "confirmed"', requestKey: null,
      });
    } catch (err) {
      console.error('[scheduler] confirmed query error:', err.status, err.message, JSON.stringify(err.data ?? {}));
    }

    for (const b of allConfirmed) {
      if (!b.pickup_datetime) continue;
      const pickupTime = new Date(b.pickup_datetime);
      if (now >= pickupTime) {
        try {
          await pb.collection('bookings').update(b.id, { status: 'on_trip' });
          await logActivity('on_trip', b.caller_phone, `Trip started for ${b.reference}`);
          console.info(`[scheduler] ${b.reference} → on_trip`);
        } catch (err) {
          console.error(`[scheduler] on_trip update error for ${b.id}:`, err.message);
        }
      }
    }

    // ── on_trip → completed ───────────────────────────────────────────────
    let allOnTrip = [];
    try {
      allOnTrip = await pb.collection('bookings').getFullList({
        filter: 'status = "on_trip"', requestKey: null,
      });
    } catch (err) {
      console.error('[scheduler] on_trip query error:', err.status, err.message, JSON.stringify(err.data ?? {}));
    }

    for (const b of allOnTrip) {
      if (!b.pickup_datetime || !b.duration_hours) continue;
      const pickupTime  = new Date(b.pickup_datetime);
      const completedAt = new Date(pickupTime.getTime() + b.duration_hours * 3600 * 1000);

      if (now >= completedAt) {
        try {
          await pb.collection('bookings').update(b.id, { status: 'completed', completed_at: now.toISOString() });
          await logActivity('completed', b.caller_phone, `Trip completed for ${b.reference}`);
          console.info(`[scheduler] ${b.reference} → completed`);
        } catch (err) {
          console.error(`[scheduler] completed update error for ${b.id}:`, err.message);
        }
      }
    }

    // Send 1-hour pickup reminders
    await sendReminders();

    // Send post-trip review request SMS
    await sendReviewRequests();

    // Check for flight delays every 10 minutes (AviationStack free tier: 100 req/month)
    if (_tickCount % 10 === 0) {
      await checkFlightDelays();
    }

    // Re-engagement campaign — runs once daily at 10 AM
    const today = now.toISOString().slice(0, 10);
    if (now.getHours() === 10 && _lastReengagementDate !== today) {
      _lastReengagementDate = today;
      await runReengagementCampaign();
    }

    // Sync driver statuses with booking statuses
    await syncDriverStatuses();

    // Check for expired plans — runs at most once per hour
    const hourMs = 60 * 60 * 1000;
    if (Date.now() - _lastExpiryCheck > hourMs) {
      _lastExpiryCheck = Date.now();
      await checkExpiredPlans();
    }

  } catch (err) {
    console.error('[scheduler] tick error:', err.message, err.status ?? '');
  }
}

async function checkExpiredPlans() {
  try {
    const pb  = await getClient();
    const now = new Date().toISOString();

    // Find companies where plan has expired and calling is still enabled
    const expired = await pb.collection('companies').getFullList({
      filter: `plan_expires_at != "" && plan_expires_at < "${now}" && calling_enabled = true`,
      requestKey: null,
    }).catch(() => []);

    for (const c of expired) {
      console.info(`[scheduler] Plan expired for company ${c.id} — disabling calling`);
      await deprovisionCalling(c.id).catch(err =>
        console.error(`[scheduler] deprovisionCalling failed for ${c.id}:`, err.message)
      );
    }

    // 7-day advance warning — only for companies NOT yet expired
    const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const expiringSoon = await pb.collection('companies').getFullList({
      filter: `plan_expires_at != "" && plan_expires_at > "${now}" && plan_expires_at < "${sevenDays}" && calling_enabled = true`,
      requestKey: null,
    }).catch(() => []);

    const DASHBOARD_URL = process.env.DASHBOARD_URL ?? 'https://ariva-dashboard.up.railway.app';
    for (const c of expiringSoon) {
      const expiryDate = new Date(c.plan_expires_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
      // Only send once — check activity log for recent warning
      const recentWarn = await pb.collection('activity_logs').getFullList({
        filter: `company_id = "${c.id}" && action = "plan_expiry_warning_sent" && created > "${new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()}"`,
        requestKey: null,
      }).catch(() => []);

      if (recentWarn.length > 0) continue;

      try {
        const admin = await pb.collection('users').getFirstListItem(
          `company_id = "${c.id}" && role = "super_admin"`, { requestKey: null }
        ).catch(() => null);
        if (admin?.phone) {
          const { smsPlain } = await import('./smsService.js');
          await smsPlain(admin.phone, [
            `Your Ariva Professional plan expires on ${expiryDate}.`,
            `AI call answering will pause when it expires.`,
            `Renew now at ${DASHBOARD_URL}/plans to stay active.`,
          ].join('\n'));
        }
        await logActivity('plan_expiry_warning_sent', 'system',
          `7-day expiry warning sent for company ${c.id}`, c.id);
      } catch (err) {
        console.warn('[scheduler] expiry warning SMS non-fatal:', err.message);
      }
    }
  } catch (err) {
    console.error('[scheduler] checkExpiredPlans error:', err.message);
  }
}
