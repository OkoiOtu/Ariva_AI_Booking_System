import express from 'express';
import { getClient } from '../services/pbService.js';
import { buildFilter } from '../middleware/companyScope.js';
import { assignDriver, unassignDriver, checkDriverConflict } from '../services/driverService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const pb = await getClient();
    const { status='' } = req.query;
    const extra = ['active = true'];
    if (status) extra.push(`status = "${status}"`);
    const filter  = buildFilter(req.companyId, extra);
    const drivers = await pb.collection('drivers').getFullList({ filter, sort:'full_name', requestKey:null });
    const enriched = await Promise.all(drivers.map(async d => {
      try {
        const bfilter  = buildFilter(req.companyId, [`driver = "${d.id}"`, '(status = "on_trip" || status = "assigned" || status = "confirmed")']);
        const current  = await pb.collection('bookings').getList(1, 1, { filter: bfilter, sort:'pickup_datetime', requestKey:null });
        return { ...d, current_booking: current.items[0] ?? null };
      } catch (err) { console.error('[drivers] enrichment error:', err.message); return { ...d, current_booking: null }; }
    }));
    res.json(enriched);
  } catch (err) {
    console.error('[drivers] GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

const DRIVER_CREATE_ALLOWED = ['full_name','phone','email','vehicle_type','vehicle_make','vehicle_model','plate_number','available_from','available_until','notes'];

router.post('/', async (req, res) => {
  try {
    const pb     = await getClient();
    const fields = Object.fromEntries(Object.entries(req.body).filter(([k]) => DRIVER_CREATE_ALLOWED.includes(k)));
    const driver = await pb.collection('drivers').create({
      ...fields,
      company_id:  req.companyId || '',
      status:      'available',
      active:      true,
      total_trips: 0,
      total_hours: 0,
    });
    res.json(driver);
  } catch (err) {
    res.status(500).json({ error: err.message ?? 'Failed to create driver' });
  }
});

router.patch('/:id', async (req, res) => {
  const ALLOWED = ['full_name','phone','email','vehicle_type','vehicle_make','vehicle_model','plate_number','status','available_from','available_until','notes','active'];
  try {
    const pb     = await getClient();
    const driver = await pb.collection('drivers').getOne(req.params.id, { requestKey: null });
    if (req.companyId && driver.company_id !== req.companyId)
      return res.status(403).json({ error: 'Access denied' });
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => ALLOWED.includes(k)));
    const updated = await pb.collection('drivers').update(req.params.id, updates);
    res.json(updated);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'Driver not found' });
    res.status(500).json({ error: 'Failed to update driver' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const pb     = await getClient();
    const driver = await pb.collection('drivers').getOne(req.params.id, { requestKey: null });
    if (req.companyId && driver.company_id !== req.companyId)
      return res.status(403).json({ error: 'Access denied' });
    await pb.collection('drivers').update(req.params.id, { active: false });
    res.json({ deleted: true });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'Driver not found' });
    res.status(500).json({ error: 'Failed to delete driver' });
  }
});

router.post('/assign', async (req, res) => {
  const { bookingId, driverId, actorName } = req.body;
  if (!bookingId || !driverId) return res.status(400).json({ error: 'bookingId and driverId required' });
  try {
    const result = await assignDriver(bookingId, driverId, actorName);
    if (!result.success) return res.status(409).json({ error: 'Conflict', conflict: result.conflict });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign driver' });
  }
});

router.post('/unassign', async (req, res) => {
  const { bookingId, actorName } = req.body;
  if (!bookingId) return res.status(400).json({ error: 'bookingId required' });
  try {
    await unassignDriver(bookingId, actorName);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unassign driver' });
  }
});

router.get('/check-conflict', async (req, res) => {
  const { driverId, pickupDatetime, durationHours, excludeBookingId } = req.query;
  if (!driverId || !pickupDatetime || !durationHours) return res.status(400).json({ error: 'Missing params' });
  try {
    const conflict = await checkDriverConflict(driverId, pickupDatetime, Number(durationHours), excludeBookingId);
    res.json({ hasConflict: !!conflict, conflict: conflict ?? null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check conflict' });
  }
});

export default router;
