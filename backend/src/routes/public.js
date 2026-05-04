import express                from 'express';
import { getClient }          from '../services/pbService.js';
import { generateBookingRef } from '../utils/bookingUtils.js';
import { generateCancelToken } from '../utils/tokenUtils.js';

const router = express.Router();
const esc    = v => String(v ?? '').replace(/"/g, '');

// ── Per-phone rate limiter (5 widget submissions / 24 h) ─────────────────────
const _widgetHistory = new Map();

function checkWidgetRateLimit(phone) {
  const now   = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const hist  = (_widgetHistory.get(phone) || []).filter(t => now - t < dayMs);
  if (hist.length >= 5) return false;
  hist.push(now);
  _widgetHistory.set(phone, hist);
  return true;
}

/**
 * GET /public/companies/slug/:slug
 * Returns public company fields needed to render the widget.
 */
router.get('/companies/slug/:slug', async (req, res) => {
  try {
    const pb      = await getClient();
    const company = await pb.collection('companies').getFirstListItem(
      `slug = "${esc(req.params.slug)}" && active = true`, { requestKey: null }
    );
    res.json({
      id:                    company.id,
      name:                  company.name,
      city:                  company.city,
      slug:                  company.slug,
      logo_url:              company.logo_url  || null,
      logo_data:             company.logo_data || null,
      ai_vehicle_types:      company.ai_vehicle_types      || 'sedan,suv,van',
      ai_min_hours:          company.ai_min_hours          ?? 1,
      ai_max_hours:          company.ai_max_hours          ?? 12,
      ai_advance_notice_hrs: company.ai_advance_notice_hrs ?? 2,
    });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'Company not found' });
    console.error('[public] company slug lookup error:', err.message);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

/**
 * POST /public/bookings/widget
 * Creates a booking from the public widget.
 * Rate limited to 5 submissions per phone number per day.
 */
router.post('/bookings/widget', async (req, res) => {
  const {
    caller_name, caller_phone, pickup_datetime, pickup_address,
    dropoff_address, duration_hours, vehicle_type, notes, company_slug,
  } = req.body;

  if (!caller_name || !caller_phone || !pickup_datetime || !pickup_address || !duration_hours || !company_slug) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  if (!checkWidgetRateLimit(caller_phone)) {
    return res.status(429).json({ error: 'Too many requests from this phone number. Please try again tomorrow.' });
  }

  try {
    const pb      = await getClient();
    const company = await pb.collection('companies').getFirstListItem(
      `slug = "${esc(company_slug)}" && active = true`, { requestKey: null }
    ).catch(() => null);

    if (!company) return res.status(404).json({ error: 'Company not found.' });

    const reference   = generateBookingRef();
    const cancelToken = generateCancelToken();

    const booking = await pb.collection('bookings').create({
      reference,
      caller_name,
      caller_phone,
      pickup_datetime,
      pickup_address,
      dropoff_address: dropoff_address ?? '',
      duration_hours:  Number(duration_hours),
      vehicle_type:    vehicle_type ?? '',
      notes:           notes ?? '',
      status:          'confirmed',
      cancel_token:    cancelToken,
      sms_sent:        false,
      company_id:      company.id,
    }, { requestKey: null });

    // Non-fatal SMS
    try {
      const { sendCustomerConfirmation, sendAdminAlert } = await import('../services/smsService.js');
      await Promise.all([
        sendCustomerConfirmation({ ...booking, callerPhone: caller_phone, cancelToken }),
        sendAdminAlert({ ...booking, callerPhone: caller_phone }, company.id),
      ]);
      await pb.collection('bookings').update(booking.id, { sms_sent: true }, { requestKey: null });
    } catch (smsErr) {
      console.error('[public] widget SMS failed:', smsErr.message);
    }

    res.status(201).json({ reference: booking.reference });
  } catch (err) {
    console.error('[public] widget booking error:', err.message);
    res.status(500).json({ error: 'Failed to create booking. Please try again.' });
  }
});

export default router;
