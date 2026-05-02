import express from 'express';
import multer  from 'multer';
import { getClient }        from '../services/pbService.js';
import { logActivity }      from '../services/activityLogger.js';
import { updateAssistant }  from '../services/vapiService.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = express.Router();
const esc    = v => String(v ?? '').replace(/"/g, '');

const AI_FIELDS = [
  'ai_agent_name', 'ai_greeting', 'ai_business_hours',
  'ai_hours_start', 'ai_hours_end', 'ai_hours_days', 'ai_after_hours_msg',
  'ai_service_area', 'ai_min_hours', 'ai_max_hours', 'ai_advance_notice_hrs',
  'ai_ask_flight', 'ai_ask_email', 'ai_quote_prices', 'ai_ask_special_req',
  'ai_languages', 'ai_vehicle_types', 'google_review_url',
];

/**
 * GET /companies
 */
router.get('/', async (req, res) => {
  try {
    const pb = await getClient();
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
 */
router.get('/:id', async (req, res) => {
  try {
    const pb = await getClient();
    const c  = await pb.collection('companies').getOne(req.params.id, { requestKey: null });
    // Return all fields — AI settings are needed on the settings page
    res.json(c);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'Company not found' });
    console.error('[companies] GET /:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

/**
 * POST /companies
 */
router.post('/', async (req, res) => {
  try {
    const pb = await getClient();
    const { name, slug, phone, email, city, plan = 'starter', active = true } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' });

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
 * General company fields — does NOT allow AI settings (use /ai-settings).
 */
router.patch('/:id', async (req, res) => {
  const ALLOWED = [
    'name', 'phone', 'email', 'city', 'plan', 'active', 'logo_url',
    'vapi_assistant_id', 'twilio_number', 'twilio_sid', 'twilio_token',
  ];
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
 * PATCH /companies/ai-settings
 * Save all AI agent settings for the requesting company,
 * update custom Q&A, and refresh the Vapi assistant in one call.
 */
router.patch('/ai-settings', async (req, res) => {
  const companyId = req.headers['x-company-id'];
  if (!companyId) return res.status(400).json({ error: 'x-company-id header required' });

  try {
    const pb = await getClient();
    const { customQA = [], ...body } = req.body;

    // 1. Update AI fields on company
    const updates = Object.fromEntries(Object.entries(body).filter(([k]) => AI_FIELDS.includes(k)));
    const company = await pb.collection('companies').update(companyId, updates, { requestKey: null });

    // 2. Sync custom Q&A (delete all, recreate)
    const existingQA = await pb.collection('ai_custom_qa').getFullList({
      filter: `company_id = "${esc(companyId)}"`, requestKey: null,
    }).catch(() => []);

    await Promise.all(existingQA.map(q =>
      pb.collection('ai_custom_qa').delete(q.id, { requestKey: null }).catch(() => {})
    ));

    for (const [i, qa] of (customQA ?? []).entries()) {
      if (!qa.question?.trim() || !qa.answer?.trim()) continue;
      await pb.collection('ai_custom_qa').create({
        company_id: companyId,
        question:   qa.question.trim(),
        answer:     qa.answer.trim(),
        active:     qa.active !== false,
        sort_order: i,
      }, { requestKey: null });
    }

    // 3. Refresh Vapi assistant (non-fatal)
    if (company.vapi_assistant_id) {
      const [rules, qaItems] = await Promise.all([
        pb.collection('pricing_rules').getFullList({ filter: `company_id = "${esc(companyId)}"`, requestKey: null }).catch(() => []),
        pb.collection('ai_custom_qa').getFullList({ filter: `company_id = "${esc(companyId)}" && active = true`, sort: 'sort_order', requestKey: null }).catch(() => []),
      ]);
      await updateAssistant(company.vapi_assistant_id, company, rules, qaItems).catch(err =>
        console.warn('[companies] updateAssistant non-fatal:', err.message)
      );
    }

    await logActivity('ai_settings_updated', 'company', 'AI agent settings updated', companyId);
    res.json({ success: true, message: 'AI agent settings updated. Changes apply to the next incoming call.' });
  } catch (err) {
    console.error('[companies] ai-settings error:', err.message);
    res.status(500).json({ error: err.message ?? 'Failed to save AI settings' });
  }
});

/**
 * GET /ai-custom-qa
 * Returns all active Q&A pairs for the requesting company.
 */
router.get('/ai-custom-qa', async (req, res) => {
  const companyId = req.headers['x-company-id'];
  if (!companyId) return res.json([]);
  try {
    const pb    = await getClient();
    const items = await pb.collection('ai_custom_qa').getFullList({
      filter: `company_id = "${esc(companyId)}"`, sort: 'sort_order', requestKey: null,
    }).catch(() => []);
    res.json(items);
  } catch (err) {
    console.error('[companies] ai-custom-qa error:', err.message);
    res.status(500).json({ error: 'Failed to fetch Q&A' });
  }
});

/**
 * PATCH /companies/:id/logo
 * Upload a company logo (multipart/form-data, field name "logo").
 * Stores the file in PocketBase and returns the public URL.
 */
router.patch('/:id/logo', upload.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { mimetype, originalname, buffer } = req.file;

  try {
    const pb   = await getClient();
    const blob = new Blob([buffer], { type: mimetype });
    const form = new FormData();
    form.append('logo', blob, originalname);
    const updated = await pb.collection('companies').update(req.params.id, form, { requestKey: null });

    // Build a public URL using the collection ID from the record response (most reliable)
    const pbPublicUrl = process.env.POCKETBASE_PUBLIC_URL ?? 'https://ariva-pocketbase.up.railway.app';
    const collectionId = updated.collectionId ?? updated.collectionName ?? 'companies';
    const logoUrl = updated.logo
      ? `${pbPublicUrl}/api/files/${collectionId}/${updated.id}/${updated.logo}`
      : null;

    console.log('[companies] logo upload — collectionId:', collectionId, 'logo field:', updated.logo, 'url:', logoUrl);

    if (logoUrl) {
      await pb.collection('companies').update(req.params.id, { logo_url: logoUrl }, { requestKey: null });
    }

    res.json({ logoUrl });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'Company not found' });
    console.error('[companies] logo upload error:', err.message);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

/**
 * DELETE /companies/:id
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
