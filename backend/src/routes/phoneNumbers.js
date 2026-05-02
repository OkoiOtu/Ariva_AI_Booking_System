import express from 'express';
import { getClient }             from '../services/pbService.js';
import { logActivity }           from '../services/activityLogger.js';
import { authorOnly }            from '../middleware/authorOnly.js';
import { importPhoneNumber }     from '../services/vapiService.js';
import { provisionCalling, deprovisionCalling } from '../services/phoneNumberService.js';

const router = express.Router();
const esc    = v => String(v ?? '').replace(/"/g, '');

/**
 * GET /phone-numbers
 * [Author only] All numbers with their company details.
 */
router.get('/', authorOnly, async (req, res) => {
  try {
    const pb     = await getClient();
    const filter = req.query.status ? `status = "${esc(req.query.status)}"` : '';
    const [numbers, companies] = await Promise.all([
      pb.collection('phone_numbers').getFullList({ filter, sort: '-created', requestKey: null }),
      pb.collection('companies').getFullList({ requestKey: null }),
    ]);
    const companyMap = Object.fromEntries(companies.map(c => [c.id, c]));
    res.json(numbers.map(n => ({ ...n, company: n.company_id ? companyMap[n.company_id] ?? null : null })));
  } catch (err) {
    console.error('[phoneNumbers] GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch phone numbers' });
  }
});

/**
 * POST /phone-numbers
 * [Author only] Add a number to the pool.
 */
router.post('/', authorOnly, async (req, res) => {
  const { number, friendly_name, twilio_sid, country, area_code, monthly_cost, notes } = req.body;
  if (!number) return res.status(400).json({ error: 'number is required' });

  try {
    const pb = await getClient();

    // Duplicate check
    try {
      await pb.collection('phone_numbers').getFirstListItem(`number = "${esc(number)}"`, { requestKey: null });
      return res.status(409).json({ error: 'This number is already in the pool' });
    } catch { /* not found — good */ }

    // Import into Vapi (non-fatal)
    let vapi_phone_id = '';
    try {
      vapi_phone_id = await importPhoneNumber(number, friendly_name || number);
    } catch (err) {
      console.warn('[phoneNumbers] Vapi import non-fatal:', err.message);
    }

    const record = await pb.collection('phone_numbers').create({
      number,
      friendly_name: friendly_name ?? '',
      twilio_sid:    twilio_sid    ?? '',
      vapi_phone_id,
      country:       country       ?? 'US',
      area_code:     area_code     ?? '',
      monthly_cost:  Number(monthly_cost) || 1.15,
      status:        'available',
      notes:         notes         ?? '',
    }, { requestKey: null });

    res.status(201).json(record);
  } catch (err) {
    console.error('[phoneNumbers] POST error:', err.message);
    res.status(500).json({ error: err.message ?? 'Failed to add phone number' });
  }
});

/**
 * GET /phone-numbers/my-number
 * [Company] Returns the number assigned to the requesting company.
 */
router.get('/my-number', async (req, res) => {
  const companyId = req.headers['x-company-id'];
  if (!companyId) return res.status(400).json({ error: 'x-company-id header required' });

  try {
    const pb      = await getClient();
    const numbers = await pb.collection('phone_numbers').getFullList({
      filter: `company_id = "${esc(companyId)}"`, requestKey: null,
    });

    if (numbers.length === 0) return res.json(null);

    const n = numbers[0];
    res.json({
      id:            n.id,
      number:        n.number,
      friendly_name: n.friendly_name,
      status:        n.status,
      assigned_at:   n.assigned_at,
    });
  } catch (err) {
    console.error('[phoneNumbers] my-number error:', err.message);
    res.status(500).json({ error: 'Failed to fetch phone number' });
  }
});

/**
 * PATCH /phone-numbers/:id
 * [Author only] Update friendly_name, notes, monthly_cost only.
 */
router.patch('/:id', authorOnly, async (req, res) => {
  try {
    const pb      = await getClient();
    const ALLOWED = ['friendly_name', 'notes', 'monthly_cost'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => ALLOWED.includes(k)));
    const updated = await pb.collection('phone_numbers').update(req.params.id, updates, { requestKey: null });
    res.json(updated);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'Phone number not found' });
    res.status(500).json({ error: 'Failed to update phone number' });
  }
});

/**
 * POST /phone-numbers/assign
 * [Author only] Manually assign an available number to a company.
 */
router.post('/assign', authorOnly, async (req, res) => {
  const { numberId, companyId } = req.body;
  if (!numberId || !companyId) return res.status(400).json({ error: 'numberId and companyId are required' });

  try {
    const pb     = await getClient();
    const number = await pb.collection('phone_numbers').getOne(numberId, { requestKey: null });

    if (number.company_id && number.company_id !== companyId) {
      return res.status(409).json({ error: 'This number is permanently assigned to another company' });
    }
    if (number.status !== 'available') {
      return res.status(400).json({ error: `Number status is "${number.status}" — only available numbers can be assigned` });
    }

    await pb.collection('phone_numbers').update(numberId, {
      status:      'active',
      company_id:  companyId,
      assigned_at: new Date().toISOString(),
    }, { requestKey: null });

    await pb.collection('companies').update(companyId, {
      twilio_number:   number.number,
      calling_enabled: true,
    }, { requestKey: null });

    await logActivity('phone_number_assigned', 'system',
      `Phone number ${number.number} assigned to company ${companyId}`, companyId);

    res.json({ success: true, number: number.number });
  } catch (err) {
    console.error('[phoneNumbers] assign error:', err.message);
    res.status(500).json({ error: err.message ?? 'Failed to assign phone number' });
  }
});

/**
 * POST /phone-numbers/provision/:companyId
 * [Author only] Full provision: assign number + create Vapi assistant + enable.
 */
router.post('/provision/:companyId', authorOnly, async (req, res) => {
  try {
    const result = await provisionCalling(req.params.companyId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[phoneNumbers] provision error:', err.message);
    res.status(500).json({ error: err.message ?? 'Failed to provision calling' });
  }
});

/**
 * POST /phone-numbers/disable/:companyId
 * [Author only] Disable calling for a company.
 */
router.post('/disable/:companyId', authorOnly, async (req, res) => {
  try {
    await deprovisionCalling(req.params.companyId);
    res.json({ success: true });
  } catch (err) {
    console.error('[phoneNumbers] disable error:', err.message);
    res.status(500).json({ error: err.message ?? 'Failed to disable calling' });
  }
});

/**
 * POST /phone-numbers/reactivate/:companyId
 * [Author only] Reactivate calling after plan renewal.
 */
router.post('/reactivate/:companyId', authorOnly, async (req, res) => {
  try {
    const result = await provisionCalling(req.params.companyId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[phoneNumbers] reactivate error:', err.message);
    res.status(500).json({ error: err.message ?? 'Failed to reactivate calling' });
  }
});

export default router;
