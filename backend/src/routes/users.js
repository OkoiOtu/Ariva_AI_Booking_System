import express from 'express';
import { getClient } from '../services/pbService.js';
import { buildFilter } from '../middleware/companyScope.js';

const router = express.Router();

/**
 * GET /users
 * Returns users scoped to the current company.
 * Authors see all users (no company filter).
 */
router.get('/', async (req, res) => {
  try {
    const pb     = await getClient();
    const filter = buildFilter(req.companyId);
    const result = await pb.collection('users').getList(1, 100, {
      sort: 'created', filter, requestKey: null,
    });
    const safe = result.items.map(u => ({
      id:         u.id,
      email:      u.email,
      full_name:  u.full_name ?? '',
      role:       u.role ?? 'user',
      suspended:  u.suspended ?? false,
      company_id: u.company_id ?? '',
      verified:   u.verified ?? false,
      created:    u.created,
    }));
    res.json({ ...result, items: safe });
  } catch (err) {
    console.error('[users] GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * POST /users
 * Create a new user under the current company.
 * company_id is automatically inherited from the request.
 */
router.post('/', async (req, res) => {
  try {
    const pb = await getClient();

    // Check plan limits (max users per company)
    if (req.companyId) {
      const count = await pb.collection('users').getList(1, 1, {
        filter: `company_id = "${req.companyId}"`, requestKey: null,
      });
      // Get company plan to check limits
      try {
        const company = await pb.collection('companies').getOne(req.companyId, { requestKey: null });
        const limits  = { starter: 1, professional: 10, enterprise: 999 };
        const maxUsers = limits[company.plan ?? 'starter'] ?? 1;
        if (count.totalItems >= maxUsers) {
          return res.status(400).json({
            error: `Your ${company.plan} plan allows a maximum of ${maxUsers} user${maxUsers===1?'':'s'}. Upgrade to add more.`,
            upgrade: true,
          });
        }
      } catch (err) { console.warn('[users] plan limit check failed:', err.message); }
    }

    const { full_name, email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    if (!full_name?.trim()) return res.status(400).json({ error: 'Full name is required.' });

    // Validate role — super_admin cannot be created via this route
    const validRoles = ['admin', 'user'];
    const userRole   = validRoles.includes(role) ? role : 'user';

    // Check email not already taken
    try {
      await pb.collection('users').getFirstListItem(`email = "${email}"`, { requestKey: null });
      return res.status(409).json({ error: 'This email address is already registered.' });
    } catch { /* not found = good */ }

    const user = await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      full_name:       full_name.trim(),
      role:            userRole,
      company_id:      req.companyId || '',  // ← inherit company from request
      suspended:       false,
      emailVisibility: true,
      verified:        true,  // Admin-created users don't need email verification
    }, { requestKey: null });

    res.json({
      id:        user.id,
      email:     user.email,
      full_name: user.full_name,
      role:      user.role,
      company_id: user.company_id,
    });
  } catch (err) {
    console.error('[users] POST error:', err.message);
    // Surface the actual PocketBase error
    const msg = err.data
      ? Object.values(err.data).map(v => v?.message ?? v).join(', ')
      : err.message ?? 'Failed to create user.';
    res.status(500).json({ error: msg });
  }
});

/**
 * PATCH /users/:id
 */
router.patch('/:id', async (req, res) => {
  const ALLOWED = ['full_name', 'email', 'role', 'suspended'];
  try {
    const pb = await getClient();

    // Prevent editing super_admin unless the request itself is from super_admin
    const target = await pb.collection('users').getOne(req.params.id, { requestKey: null });
    if (target.role === 'super_admin' && req.body.role && req.body.role !== 'super_admin') {
      return res.status(403).json({ error: 'Cannot change the role of a super admin.' });
    }

    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => ALLOWED.includes(k))
    );
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields provided.' });

    const updated = await pb.collection('users').update(req.params.id, updates, { requestKey: null });
    res.json({
      id:        updated.id,
      email:     updated.email,
      full_name: updated.full_name,
      role:      updated.role,
      suspended: updated.suspended,
    });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'User not found.' });
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

/**
 * DELETE /users/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const pb     = await getClient();
    const target = await pb.collection('users').getOne(req.params.id, { requestKey: null });
    if (target.role === 'super_admin') {
      return res.status(403).json({ error: 'Super admin accounts cannot be deleted.' });
    }
    await pb.collection('users').delete(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: 'User not found.' });
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

export default router;
