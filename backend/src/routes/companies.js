import express from 'express';
import { getClient } from '../services/pbService.js';
import { logActivity } from '../services/activityLogger.js';

const router = express.Router();

const esc = v => String(v ?? '').replace(/"/g, '');

/**
 * GET /companies
 * Returns all companies for the author (no x-company-id header),
 * or only the requesting company for normal dashboard users.
 */
router.get('/', async (req, res) => {
  try {
    const pb = await getClient();
    // Non-author requests must be scoped to their own company
    if (req.companyId) {
      const company = await pb.collection('companies').getOne(req.companyId, { requestKey: null });
      return res.json([company]);
    }
    const result = await pb.collection('companies').getFullList({ sort: 'name', requestKey: null });
    res.json(result);
  } catch (err) {
    console.error('[companies] GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

/**
 * GET /companies/:id
 * Returns a single company by id (safe subset for dashboard context).
 */
router.get('/:id', async (req, res) => {
  try {
    const pb = await getClient();
    const c  = await pb.collection('companies').getOne(req.params.id, { requestKey: null });
    res.json({
      id: c.id,
      name: c.name,
      slug: c.slug,
      phone: c.phone ?? '',
      email: c.email ?? '',
      city: c.city ?? '',
      plan: c.plan ?? 'starter',
      active: c.active ?? true,
      logo_url: c.logo_url ?? '',
      vapi_assistant_id: c.vapi_assistant_id ?? '',
      twilio_number: c.twilio_number ?? '',
      created: c.created,
      updated: c.updated,
    });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'Company not found' });
    console.error('[companies] GET /:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

/**
 * POST /companies
 * Create a new company (tenant).
 */
router.post('/', async (req, res) => {
  try {
    const pb = await getClient();
    const { name, slug, phone, email, city, plan = 'starter', active = true } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' });

    // Check slug uniqueness
    try {
      await pb.collection('companies').getFirstListItem(`slug = "${esc(slug)}"`, { requestKey: null });
      return res.status(409).json({ error: 'Slug already taken. Choose a different one.' });
    } catch { /* not found = good */ }

    const company = await pb.collection('companies').create({
      name, slug, phone: phone ?? '', email: email ?? '',
      city: city ?? '', plan, active,
    });
    await logActivity('company_created', 'system', `New company created: ${name} (${slug})`);
    res.json(company);
  } catch (err) {
    console.error('[companies] POST error:', err.message);
    res.status(500).json({ error: err.message ?? 'Failed to create company' });
  }
});

/**
 * PATCH /companies/:id
 */
router.patch('/:id', async (req, res) => {
  const ALLOWED = ['name', 'phone', 'email', 'city', 'plan', 'active', 'logo_url', 'vapi_assistant_id', 'twilio_number', 'twilio_sid', 'twilio_token'];
  try {
    const pb      = await getClient();
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => ALLOWED.includes(k)));
    const updated = await pb.collection('companies').update(req.params.id, updates);
    res.json(updated);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'Company not found' });
    res.status(500).json({ error: 'Failed to update company' });
  }
});

/**
 * DELETE /companies/:id
 * Soft delete — sets active = false.
 */
router.delete('/:id', async (req, res) => {
  try {
    const pb = await getClient();
    await pb.collection('companies').update(req.params.id, { active: false });
    res.json({ deleted: true });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'Company not found' });
    res.status(500).json({ error: 'Failed to deactivate company' });
  }
});

export default router;
