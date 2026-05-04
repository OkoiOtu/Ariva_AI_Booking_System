import express from 'express';
import { getClient } from '../services/pbService.js';
import { buildFilter } from '../middleware/companyScope.js';
import { sendCancellationSMS } from '../services/smsService.js';
import { logActivity } from '../services/activityLogger.js';
import { generateBookingRef } from '../utils/bookingUtils.js';

const PLAN_LIMITS = { starter: 50, professional: Infinity, enterprise: Infinity };

const router = express.Router();

const esc = v => String(v ?? '').replace(/"/g, '');

router.get('/', async (req, res) => {
  try {
    const pb = await getClient();
    const { page = 1, perPage = 20, search = '', fromDate = '', toDate = '' } = req.query;

    const extra = [];
    if (search)   extra.push(`(reference ~ "${esc(search)}" || caller_name ~ "${esc(search)}" || caller_phone ~ "${esc(search)}")`);
    if (fromDate) extra.push(`pickup_datetime >= "${esc(fromDate)} 00:00:00"`);
    if (toDate)   extra.push(`pickup_datetime <= "${esc(toDate)} 23:59:59"`);

    const filter = buildFilter(req.companyId, extra);
    const result = await pb.collection('bookings').getList(Number(page), Number(perPage), {
      filter, sort: '-created', expand: 'call', requestKey: null,
    });
    res.json(result);
  } catch (err) {
    console.error('[bookings] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const pb      = await getClient();
    const booking = await pb.collection('bookings').getOne(req.params.id, { expand:'call', requestKey:null });
    if (req.companyId && booking.company_id !== req.companyId)
      return res.status(403).json({ error: 'Access denied' });
    res.json(booking);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'Booking not found' });
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

router.post('/', async (req, res) => {
  const { caller_name, caller_phone, pickup_datetime, pickup_address, dropoff_address, duration_hours, vehicle_type, notes } = req.body;
  if (!caller_name || !caller_phone || !pickup_datetime || !pickup_address || !duration_hours) {
    return res.status(400).json({ error: 'caller_name, caller_phone, pickup_datetime, pickup_address and duration_hours are required.' });
  }
  try {
    const pb = await getClient();

    // Plan limit check
    if (req.companyId) {
      const company = await pb.collection('companies').getOne(req.companyId, { requestKey: null });
      const limit   = PLAN_LIMITS[company.plan] ?? Infinity;
      if (isFinite(limit)) {
        const now      = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        const count    = await pb.collection('bookings').getList(1, 1, {
          filter: `company_id = "${req.companyId}" && created >= "${firstDay} 00:00:00"`,
          requestKey: null,
        });
        if (count.totalItems >= limit) {
          return res.status(403).json({
            error: `Your ${company.plan} plan allows ${limit} bookings per month. Upgrade to add more.`,
            upgrade: true,
          });
        }
      }
    }

    const reference = generateBookingRef();
    const booking   = await pb.collection('bookings').create({
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
      sms_sent:        false,
      company_id:      req.companyId ?? '',
    }, { requestKey: null });

    await logActivity('booking_created', req.body.actor ?? 'admin', `Manual booking ${reference} created`, req.companyId);
    res.status(201).json(booking);
  } catch (err) {
    console.error('[bookings] POST / error:', err.message);
    res.status(500).json({ error: 'Failed to create booking.' });
  }
});

const VALID_TRANSITIONS = {
  confirmed: ['on_trip', 'cancelled'],
  assigned:  ['on_trip', 'cancelled'],
  on_trip:   ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

router.patch('/:id', async (req, res) => {
  const ALLOWED = ['caller_name','caller_phone','pickup_datetime','pickup_address','dropoff_address','duration_hours','status','driver'];
  try {
    const pb      = await getClient();
    const booking = await pb.collection('bookings').getOne(req.params.id, { requestKey:null });
    if (req.companyId && booking.company_id !== req.companyId)
      return res.status(403).json({ error: 'Access denied' });
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => ALLOWED.includes(k)));
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' });
    if (updates.status) {
      const allowed = VALID_TRANSITIONS[booking.status] ?? [];
      if (!allowed.includes(updates.status))
        return res.status(400).json({ error: `Cannot transition from '${booking.status}' to '${updates.status}'` });
    }
    const updated = await pb.collection('bookings').update(req.params.id, updates);
    res.json(updated);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'Booking not found' });
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const pb      = await getClient();
    const booking = await pb.collection('bookings').getOne(req.params.id, { requestKey:null });
    if (req.companyId && booking.company_id !== req.companyId)
      return res.status(403).json({ error: 'Access denied' });
    if (['completed','cancelled'].includes(booking.status))
      return res.status(400).json({ error: `Booking is already ${booking.status}.` });
    await pb.collection('bookings').update(req.params.id, { status:'cancelled' }, { requestKey:null });
    await logActivity('booking_cancelled', req.body.actor ?? 'admin', `Booking ${booking.reference} cancelled from dashboard`, req.companyId);
    try { await sendCancellationSMS(booking); } catch (err) { console.error('[bookings] cancellation SMS failed:', err.message); }
    res.json({ success: true });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'Booking not found.' });
    res.status(500).json({ error: 'Failed to cancel booking.' });
  }
});

router.post('/cancel', async (req, res) => {
  const { reference, token } = req.body;
  if (!reference || !token) return res.status(400).json({ error: 'Reference and token required.' });
  try {
    const pb      = await getClient();
    const results = await pb.collection('bookings').getList(1, 1, {
      filter: `reference = "${esc(reference)}"`, requestKey: null,
    });
    if (!results.items.length) return res.status(404).json({ error: 'Booking not found.' });
    const booking = results.items[0];
    if (booking.cancel_token !== token) return res.status(403).json({ error: 'Invalid token.' });
    if (['completed','cancelled'].includes(booking.status))
      return res.status(400).json({ error: `Already ${booking.status}.` });
    await pb.collection('bookings').update(booking.id, { status:'cancelled' });
    res.json({ success: true, reference });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel booking.' });
  }
});

export default router;
