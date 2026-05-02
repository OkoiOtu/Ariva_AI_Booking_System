/**
 * phoneNumberService.js
 *
 * Core logic for phone number assignment and calling provisioning.
 * Called from: payment webhook, status scheduler, and phone-numbers route.
 */
import { getClient }          from './pbService.js';
import { logActivity }        from './activityLogger.js';
import { smsPlain }           from './smsService.js';
import {
  createAssistant,
  updateAssistant,
  enableAssistantOnPhone,
  disableAssistantOnPhone,
  importPhoneNumber,
} from './vapiService.js';

const DASHBOARD_URL = process.env.DASHBOARD_URL ?? 'https://ariva-dashboard.up.railway.app';

const esc = v => String(v ?? '').replace(/"/g, '');

/**
 * Provision calling for a company after a successful payment.
 * - Assigns or reactivates a phone number
 * - Creates or updates the Vapi assistant with latest settings
 * - Connects the assistant to the phone number
 * - Sends a welcome SMS to the company's super_admin
 */
export async function provisionCalling(companyId) {
  const pb = await getClient();

  const [company, rules, qaItems] = await Promise.all([
    pb.collection('companies').getOne(companyId, { requestKey: null }),
    pb.collection('pricing_rules').getFullList({ filter: `company_id = "${esc(companyId)}"`, requestKey: null }).catch(() => []),
    pb.collection('ai_custom_qa').getFullList({ filter: `company_id = "${esc(companyId)}" && active = true`, sort: 'sort_order', requestKey: null }).catch(() => []),
  ]);

  // 1. Assign / reactivate phone number
  const numberRecord = await assignOrReactivateNumber(pb, companyId);

  // 2. Create or update Vapi assistant
  let assistantId = company.vapi_assistant_id;
  if (assistantId) {
    await updateAssistant(assistantId, company, rules, qaItems).catch(err =>
      console.warn('[phoneNumberService] updateAssistant non-fatal:', err.message)
    );
  } else {
    assistantId = await createAssistant(company, rules, qaItems).catch(err => {
      console.error('[phoneNumberService] createAssistant failed:', err.message);
      return null;
    });
    if (assistantId) {
      await pb.collection('companies').update(companyId, { vapi_assistant_id: assistantId }, { requestKey: null });
    }
  }

  // 3. Connect assistant to phone number in Vapi
  if (assistantId && numberRecord?.vapi_phone_id) {
    await enableAssistantOnPhone(numberRecord.vapi_phone_id, assistantId).catch(err =>
      console.warn('[phoneNumberService] enableAssistant non-fatal:', err.message)
    );
  }

  // 4. Send welcome SMS to super_admin
  try {
    const admin = await pb.collection('users').getFirstListItem(
      `company_id = "${esc(companyId)}" && role = "super_admin"`, { requestKey: null }
    ).catch(() => null);
    if (admin?.phone) {
      const agentName = company.ai_agent_name || 'Aria';
      const number    = numberRecord?.number ?? company.twilio_number ?? 'your assigned number';
      await smsPlain(admin.phone, [
        `Your Ariva Professional plan is now active!`,
        `Your AI booking number: ${number}`,
        `${agentName} is now answering calls 24/7.`,
        `Log in to customise your AI agent: ${DASHBOARD_URL}/settings`,
      ].join('\n'));
    }
  } catch (err) {
    console.warn('[phoneNumberService] Welcome SMS non-fatal:', err.message);
  }

  await logActivity('plan_activated_calling_enabled', 'system',
    `Calling provisioned for company ${companyId}`, companyId);

  return { number: numberRecord?.number ?? null, assistantId };
}

/**
 * Disable calling when plan expires or cancels.
 */
export async function deprovisionCalling(companyId) {
  const pb = await getClient();

  const numbers = await pb.collection('phone_numbers').getFullList({
    filter: `company_id = "${esc(companyId)}" && status = "active"`, requestKey: null,
  }).catch(() => []);

  const now = new Date().toISOString();

  for (const n of numbers) {
    // Disconnect Vapi assistant
    if (n.vapi_phone_id) {
      await disableAssistantOnPhone(n.vapi_phone_id).catch(err =>
        console.warn('[phoneNumberService] disableAssistant non-fatal:', err.message)
      );
    }
    await pb.collection('phone_numbers').update(n.id, {
      status: 'disabled', disabled_at: now,
    }, { requestKey: null });
  }

  await pb.collection('companies').update(companyId, { calling_enabled: false }, { requestKey: null });

  // Notify super_admin
  try {
    const company = await pb.collection('companies').getOne(companyId, { requestKey: null });
    const admin   = await pb.collection('users').getFirstListItem(
      `company_id = "${esc(companyId)}" && role = "super_admin"`, { requestKey: null }
    ).catch(() => null);
    if (admin?.phone) {
      const number = numbers[0]?.number ?? company.twilio_number ?? 'your number';
      await smsPlain(admin.phone, [
        `Your Ariva Professional plan has expired.`,
        `AI call answering has been paused.`,
        `Renew at ${DASHBOARD_URL}/plans to reactivate instantly.`,
        `Your number ${number} is reserved for you.`,
      ].join('\n'));
    }
  } catch (err) {
    console.warn('[phoneNumberService] Expiry SMS non-fatal:', err.message);
  }

  await logActivity('plan_expired_calling_disabled', 'system',
    `Calling disabled for company ${companyId}`, companyId);
}

// ── Internal helpers ──────────────────────────────────────────────────────

async function assignOrReactivateNumber(pb, companyId) {
  // Check if company already has a number
  const existing = await pb.collection('phone_numbers').getFullList({
    filter: `company_id = "${esc(companyId)}"`, requestKey: null,
  }).catch(() => []);

  if (existing.length > 0) {
    const n = existing[0];
    if (n.status !== 'active') {
      await pb.collection('phone_numbers').update(n.id, { status: 'active' }, { requestKey: null });
    }
    await pb.collection('companies').update(companyId, {
      twilio_number:   n.number,
      calling_enabled: true,
    }, { requestKey: null });
    return n;
  }

  // Auto-assign next available number from pool
  const available = await pb.collection('phone_numbers').getFirstListItem(
    'status = "available"', { sort: 'created', requestKey: null }
  ).catch(() => null);

  if (!available) {
    console.warn(`[phoneNumberService] No available numbers for company ${companyId}`);
    return null;
  }

  await pb.collection('phone_numbers').update(available.id, {
    status:      'active',
    company_id:  companyId,
    assigned_at: new Date().toISOString(),
  }, { requestKey: null });

  await pb.collection('companies').update(companyId, {
    twilio_number:   available.number,
    calling_enabled: true,
  }, { requestKey: null });

  return available;
}
