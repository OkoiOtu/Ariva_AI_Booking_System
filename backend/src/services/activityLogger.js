import { getClient } from './pbService.js';

/**
 * logActivity — write an entry to the activity_logs collection.
 * Never throws — logging failures should not break the main flow.
 *
 * @param {string} action  — e.g. 'booking_confirmed', 'lead_created', 'user_created'
 * @param {string} actor   — email or phone of whoever/whatever triggered it
 * @param {string} detail  — short human-readable description
 */
export async function logActivity(action, actor, detail, companyId = null) {
  try {
    const pb     = await getClient();
    const record = { action, actor, detail };
    if (companyId) record.company_id = companyId;
    await pb.collection('activity_logs').create(record);
  } catch (err) {
    console.error('[activityLogger] Failed to log:', err.message);
  }
}
