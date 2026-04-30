import { getClient } from '../services/pbService.js';

export async function authorOnly(req, res, next) {
  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Authorization required' });

  try {
    const pb   = await getClient();
    const user = await pb.collection('users').authRefresh({ headers: { Authorization: `Bearer ${token}` } });

    if (!user?.record || user.record.role !== 'author') {
      return res.status(403).json({ error: 'Author role required' });
    }

    req.authorUser = user.record;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
