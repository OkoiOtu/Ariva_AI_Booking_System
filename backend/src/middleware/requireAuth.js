import PocketBase from 'pocketbase';

// In-memory token cache — avoids a PocketBase round-trip on every API call.
// Each entry expires after 5 minutes; revoked tokens fall through on the next miss.
const _cache = new Map(); // token → { user, exp }

async function validateToken(token) {
  const hit = _cache.get(token);
  if (hit && hit.exp > Date.now()) return hit.user;

  const pb = new PocketBase(process.env.POCKETBASE_URL);
  pb.authStore.save(token, null);
  const auth = await pb.collection('users').authRefresh();
  const user = auth?.record ?? null;

  if (user) {
    _cache.set(token, { user, exp: Date.now() + 5 * 60 * 1000 });
    // Prune stale entries when cache grows large
    if (_cache.size > 500) {
      const now = Date.now();
      for (const [k, v] of _cache) if (v.exp < now) _cache.delete(k);
    }
  }

  return user;
}

// Public routes that skip auth — customer-facing endpoints that use their own token scheme
const PUBLIC = new Set(['POST:/cancel']);

/**
 * requireAuth middleware
 *
 * Validates the PocketBase Bearer token from the Authorization header and
 * confirms the user belongs to the company in x-company-id (unless author).
 * Must run after companyScope so req.companyId is already set.
 */
export async function requireAuth(req, res, next) {
  if (PUBLIC.has(`${req.method}:${req.path}`)) return next();
  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Authorization required' });

  try {
    const user = await validateToken(token);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' });
    if (user.suspended) return res.status(403).json({ error: 'Account suspended' });

    // Authors have platform-wide access; everyone else must match req.companyId
    if (user.role !== 'author' && req.companyId && user.company_id !== req.companyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
