import { getClient, createCall, createBooking, createLead, markSmsSent } from './pbService.js';
import { sendCustomerConfirmation, sendAdminAlert } from './smsService.js';
import { formatE164, isValidPhone } from '../utils/phoneUtils.js';
import { generateBookingRef } from '../utils/bookingUtils.js';
import { generateCancelToken } from '../utils/tokenUtils.js';
import { calculatePrice, formatPrice } from './pricingService.js';
import { logActivity } from './activityLogger.js';

const MIN_HOURS = 1;
const MAX_HOURS = 12;

const PLAN_LIMITS = { starter: 50, professional: Infinity, enterprise: Infinity };

async function isBookingLimitReached(companyId) {
  if (!companyId) return false;
  try {
    const pb      = await getClient();
    const company = await pb.collection('companies').getOne(companyId, { requestKey: null });
    const limit   = PLAN_LIMITS[company.plan] ?? Infinity;
    if (!isFinite(limit)) return false;

    const now      = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const count    = await pb.collection('bookings').getList(1, 1, {
      filter: `company_id = "${companyId}" && created >= "${firstDay} 00:00:00"`,
      requestKey: null,
    });
    return count.totalItems >= limit;
  } catch (err) {
    console.error('[bookingService] isBookingLimitReached error:', err.message);
    return false;
  }
}

function qualifyBooking(data) {
  const { callerName, pickupDatetime, pickupAddress, durationHours } = data;
  if (!callerName?.trim())    return { valid: false, reason: 'missing_caller_name' };
  if (!pickupAddress?.trim()) return { valid: false, reason: 'missing_pickup_address' };
  if (!pickupDatetime)        return { valid: false, reason: 'missing_pickup_datetime' };
  const pickup = new Date(pickupDatetime);
  if (isNaN(pickup.getTime())) return { valid: false, reason: 'invalid_pickup_datetime' };
  if (pickup < new Date())     return { valid: false, reason: 'pickup_in_the_past' };
  const hours = Number(durationHours);
  if (!hours || hours < MIN_HOURS || hours > MAX_HOURS) {
    return { valid: false, reason: `duration_out_of_range (${hours}h — must be ${MIN_HOURS}-${MAX_HOURS}h)` };
  }
  return { valid: true };
}

export async function processCall(message, companyId = null) {
  const { call, artifact, analysis } = message;
  const rawPhone   = call?.customer?.number ?? '';
  const callerPhone = formatE164(rawPhone);

  if (!isValidPhone(callerPhone)) {
    console.warn('[bookingService] Invalid or missing caller phone:', rawPhone);
  }

  const callDuration = call?.endedAt && call?.startedAt
    ? Math.round((new Date(call.endedAt) - new Date(call.startedAt)) / 1000)
    : 0;

  const vapiCallId = call?.id ?? '';

  // Idempotency: if Vapi retries the webhook, skip the duplicate delivery.
  if (vapiCallId) {
    try {
      const pb = await getClient();
      await pb.collection('calls').getFirstListItem(
        `vapi_call_id = "${vapiCallId}"`, { requestKey: null }
      );
      console.info(`[bookingService] Duplicate webhook for call ${vapiCallId} — skipping`);
      return;
    } catch { /* not found = first delivery, continue */ }
  }

  const callData = {
    vapi_call_id:  vapiCallId,
    caller_phone:  callerPhone,
    transcript:    artifact?.transcript ?? '',
    recording_url: artifact?.recordingUrl ?? '',
    duration_secs: callDuration,
    outcome:       'incomplete',
  };
  if (companyId) callData.company_id = companyId;

  const callRecord = await createCall(callData);

  const structured = analysis?.structuredData ?? {};
  console.info('[bookingService] Structured data received:', structured);

  // Extract vehicle type from structured data (optional field)
  const vehicleType = structured.vehicleType ?? 'any';

  const qualification = qualifyBooking(structured);
  if (qualification.valid) {
    await handleConfirmedBooking(callRecord, structured, callerPhone, vehicleType, companyId);
  } else {
    await handleLead(callRecord, structured, callerPhone, qualification.reason, companyId);
  }
}

async function handleConfirmedBooking(callRecord, data, callerPhone, vehicleType = 'any', companyId = null) {
  if (await isBookingLimitReached(companyId)) {
    console.warn(`[bookingService] Booking limit reached for company ${companyId} — logging as lead`);
    await handleLead(callRecord, data, callerPhone, 'plan_limit_reached');
    return;
  }
  const reference   = generateBookingRef();
  const cancelToken = generateCancelToken();

  // Calculate price from pricing rules
  const pricing = await calculatePrice({
    pickupAddress:  data.pickupAddress,
    dropoffAddress: data.dropoffAddress ?? '',
    durationHours:  Number(data.durationHours),
    vehicleType,
  });

  const quotedPrice    = pricing?.price    ?? null;
  const quotedCurrency = pricing?.currency ?? 'NGN';
  const pricingRule    = pricing?.ruleName ?? null;

  console.info(`[bookingService] Price calculated: ${quotedPrice ? formatPrice(quotedPrice, quotedCurrency) : 'No rule matched'}`);

  const bookingData = {
    reference,
    caller_name:     data.callerName,
    caller_phone:    callerPhone,
    pickup_datetime: data.pickupDatetime,
    pickup_address:  data.pickupAddress,
    dropoff_address: data.dropoffAddress ?? '',
    duration_hours:  Number(data.durationHours),
    status:          'confirmed',
    cancel_token:    cancelToken,
    quoted_price:    quotedPrice,
    quoted_currency: quotedCurrency,
    pricing_rule:    pricingRule,
    vehicle_type:    vehicleType !== 'any' ? vehicleType : '',
    sms_sent:        false,
    call:            callRecord.id,
  };
  if (companyId) bookingData.company_id = companyId;

  const booking = await createBooking(bookingData);

  await callRecord.$update({ outcome: 'confirmed' });
  await logActivity('booking_confirmed', callerPhone, `Booking ${reference} confirmed for ${data.callerName}`);
  console.info(`[bookingService] Booking confirmed: ${reference}`);

  try {
    await Promise.all([
      sendCustomerConfirmation({ ...booking, callerPhone, cancelToken, quotedPrice, quotedCurrency }),
      sendAdminAlert({ ...booking, callerPhone }),
    ]);
    await markSmsSent(booking.id);
  } catch (err) {
    console.error('[bookingService] SMS send failed:', err.message);
  }
}

async function handleLead(callRecord, data, callerPhone, reason, companyId = null) {
  const summary    = buildLeadSummary(data, reason);
  const leadData   = { caller_phone: callerPhone, summary, status: 'new', call: callRecord.id };
  if (companyId) leadData.company_id = companyId;
  await createLead(leadData);
  await callRecord.$update({ outcome: 'lead' });
  await logActivity('lead_created', callerPhone, `Lead created. Reason: ${reason}`);
  console.info(`[bookingService] Call logged as lead. Reason: ${reason}`);

  try {
    await sendAdminAlert({ isLead: true, callerPhone, summary, callId: callRecord.id });
  } catch (err) {
    console.error('[bookingService] Admin lead alert failed:', err.message);
  }
}

function buildLeadSummary(data, reason) {
  const lines = [`Disqualification reason: ${reason}`];
  if (data.callerName)     lines.push(`Name: ${data.callerName}`);
  if (data.pickupAddress)  lines.push(`Pickup: ${data.pickupAddress}`);
  if (data.pickupDatetime) lines.push(`Requested time: ${data.pickupDatetime}`);
  if (data.durationHours)  lines.push(`Duration: ${data.durationHours}h`);
  return lines.join('\n');
}
