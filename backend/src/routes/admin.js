import express from 'express';
import { getClient } from '../services/pbService.js';
import { authorOnly } from '../middleware/authorOnly.js';
import { sendSms } from '../services/smsService.js';

const router = express.Router();
router.use(authorOnly);

/**
 * GET /admin/stats
 * Platform-wide aggregated stats
 */
router.get('/stats', async (req, res) => {
  try {
    const pb = await getClient();
    const [companies, bookings, leads, calls, payments] = await Promise.all([
      pb.collection('companies').getFullList({ requestKey: null }),
      pb.collection('bookings').getFullList({ requestKey: null }),
      pb.collection('leads').getFullList({ requestKey: null }),
      pb.collection('calls').getFullList({ requestKey: null }),
      pb.collection('payments').getFullList({ filter: 'status = "paid"', requestKey: null }).catch(() => []),
    ]);

    const now        = new Date();
    const thisMonth  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonth  = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

    const byPlan = { starter: 0, professional: 0, enterprise: 0 };
    companies.forEach(c => { if (byPlan[c.plan] !== undefined) byPlan[c.plan]++; });

    const mrr        = byPlan.professional * 49;
    const newThisMonth = companies.filter(c => c.created >= thisMonth).length;
    const activeBookings = bookings.filter(b => ['confirmed','on_trip'].includes(b.status)).length;
    const convertedLeads = leads.filter(l => l.status === 'converted').length;

    const revenueThisMonth = payments.filter(p => p.paid_at >= thisMonth).reduce((s, p) => s + (p.amount || 0), 0);
    const revenueLastMonth = payments.filter(p => p.paid_at >= lastMonth && p.paid_at <= lastMonthEnd).reduce((s, p) => s + (p.amount || 0), 0);

    res.json({
      totalCompanies: companies.length,
      activeCompanies: companies.filter(c => c.active).length,
      companiesByPlan: byPlan,
      newThisMonth,
      mrr,
      totalBookings: bookings.length,
      activeBookings,
      totalLeads: leads.length,
      convertedLeads,
      totalCalls: calls.length,
      revenueThisMonth,
      revenueLastMonth,
      totalRevenue: payments.reduce((s, p) => s + (p.amount || 0), 0),
    });
  } catch (err) {
    console.error('[admin] stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /admin/companies
 * All companies with aggregated stats
 */
router.get('/companies', async (req, res) => {
  try {
    const pb = await getClient();
    const [companies, bookings, users] = await Promise.all([
      pb.collection('companies').getFullList({ sort: '-created', requestKey: null }),
      pb.collection('bookings').getFullList({ requestKey: null }),
      pb.collection('users').getFullList({ requestKey: null }),
    ]);

    const result = companies.map(c => {
      const cBookings = bookings.filter(b => b.company_id === c.id);
      const cUsers    = users.filter(u => u.company_id === c.id);
      const revenue   = cBookings.reduce((s, b) => s + (Number(b.price) || 0), 0);
      const lastBooking = cBookings.sort((a, b) => b.created > a.created ? 1 : -1)[0];

      return {
        ...c,
        bookingCount:    cBookings.length,
        revenue,
        userCount:       cUsers.length,
        lastBookingDate: lastBooking?.created ?? null,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('[admin] companies error:', err.message);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

/**
 * GET /admin/companies/:id/details
 * Full detail for one company
 */
router.get('/companies/:id/details', async (req, res) => {
  try {
    const pb = await getClient();
    const id = req.params.id;
    const [company, bookings, leads, calls, users, drivers, payments, activity] = await Promise.all([
      pb.collection('companies').getOne(id, { requestKey: null }),
      pb.collection('bookings').getFullList({ filter: `company_id = "${id}"`, sort: '-created', requestKey: null }),
      pb.collection('leads').getFullList({ filter: `company_id = "${id}"`, sort: '-created', requestKey: null }),
      pb.collection('calls').getFullList({ filter: `company_id = "${id}"`, sort: '-created', requestKey: null }),
      pb.collection('users').getFullList({ filter: `company_id = "${id}"`, sort: '-created', requestKey: null }),
      pb.collection('drivers').getFullList({ filter: `company_id = "${id}"`, sort: '-created', requestKey: null }),
      pb.collection('payments').getFullList({ filter: `company_id = "${id}"`, sort: '-created', requestKey: null }).catch(() => []),
      pb.collection('activity_logs').getFullList({ filter: `company_id = "${id}"`, sort: '-created', requestKey: null }).catch(() => []),
    ]);
    res.json({ company, bookings, leads, calls, users, drivers, payments, activity });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'Company not found' });
    console.error('[admin] company details error:', err.message);
    res.status(500).json({ error: 'Failed to fetch company details' });
  }
});

/**
 * PATCH /admin/companies/:id/plan
 */
router.patch('/companies/:id/plan', async (req, res) => {
  const { plan } = req.body;
  if (!['starter','professional','enterprise'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }
  try {
    const pb      = await getClient();
    const updated = await pb.collection('companies').update(req.params.id, { plan }, { requestKey: null });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

/**
 * PATCH /admin/companies/:id/suspend
 */
router.patch('/companies/:id/suspend', async (req, res) => {
  const { active } = req.body;
  try {
    const pb      = await getClient();
    const updated = await pb.collection('companies').update(req.params.id, { active }, { requestKey: null });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update company status' });
  }
});

/**
 * GET /admin/bookings
 */
router.get('/bookings', async (req, res) => {
  try {
    const pb = await getClient();
    const { companyId, status, from, to } = req.query;
    const filters = [];
    if (companyId) filters.push(`company_id = "${companyId}"`);
    if (status)    filters.push(`status = "${status}"`);
    if (from)      filters.push(`created >= "${from}"`);
    if (to)        filters.push(`created <= "${to}"`);
    const filter = filters.join(' && ');

    const [bookings, companies] = await Promise.all([
      pb.collection('bookings').getFullList({ filter, sort: '-created', requestKey: null }),
      pb.collection('companies').getFullList({ requestKey: null }),
    ]);

    const companyMap = Object.fromEntries(companies.map(c => [c.id, c]));
    const result = bookings.map(b => ({ ...b, company: companyMap[b.company_id] ?? null }));
    res.json(result);
  } catch (err) {
    console.error('[admin] bookings error:', err.message);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

/**
 * GET /admin/revenue
 */
router.get('/revenue', async (req, res) => {
  try {
    const pb = await getClient();
    const [payments, bookings, companies] = await Promise.all([
      pb.collection('payments').getFullList({ filter: 'status = "paid"', sort: '-paid_at', requestKey: null }).catch(() => []),
      pb.collection('bookings').getFullList({ requestKey: null }),
      pb.collection('companies').getFullList({ requestKey: null }),
    ]);

    const companyMap = Object.fromEntries(companies.map(c => [c.id, c]));
    const gmvByCompany = companies.map(c => {
      const cBookings = bookings.filter(b => b.company_id === c.id);
      return {
        id:       c.id,
        name:     c.name,
        plan:     c.plan,
        bookings: cBookings.length,
        gmv:      cBookings.reduce((s, b) => s + (Number(b.price) || 0), 0),
      };
    }).sort((a, b) => b.gmv - a.gmv);

    res.json({
      platformPayments: payments.map(p => ({ ...p, company: companyMap[p.company_id] ?? null })),
      platformRevenue:  payments.reduce((s, p) => s + (p.amount || 0), 0),
      gmvByCompany,
      totalGmv: bookings.reduce((s, b) => s + (Number(b.price) || 0), 0),
    });
  } catch (err) {
    console.error('[admin] revenue error:', err.message);
    res.status(500).json({ error: 'Failed to fetch revenue' });
  }
});

/**
 * POST /admin/announce
 * Send SMS/email announcement to companies
 */
router.post('/announce', async (req, res) => {
  const { title, message, target, channel, companyIds } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const pb        = await getClient();
    let companies   = await pb.collection('companies').getFullList({ filter: 'active = true', requestKey: null });

    if (target !== 'all' && ['starter','professional','enterprise'].includes(target)) {
      companies = companies.filter(c => c.plan === target);
    } else if (target === 'specific' && Array.isArray(companyIds)) {
      companies = companies.filter(c => companyIds.includes(c.id));
    }

    if (channel === 'sms' || channel === 'both') {
      const phones = companies.map(c => c.phone).filter(Boolean);
      await Promise.allSettled(phones.map(phone => sendSms(phone, `[Ariva] ${title ? title + ': ' : ''}${message}`)));
    }

    res.json({ sent: companies.length, channel });
  } catch (err) {
    console.error('[admin] announce error:', err.message);
    res.status(500).json({ error: 'Failed to send announcement' });
  }
});

/**
 * GET /admin/system/health
 */
router.get('/system/health', async (req, res) => {
  const PB_URL = process.env.POCKETBASE_URL ?? 'http://127.0.0.1:8090';

  const pbStatus = await fetch(`${PB_URL}/api/health`, { signal: AbortSignal.timeout(3000) })
    .then(r => r.ok ? 'operational' : 'degraded')
    .catch(() => 'down');

  res.json({
    backend:    'operational',
    pocketbase: pbStatus,
    timestamp:  new Date().toISOString(),
  });
});

export default router;
