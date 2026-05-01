import PocketBase from 'pocketbase';

export async function authorOnly(req, res, next) {
  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Authorization required' });

  try {
    // Use a fresh PocketBase instance per request so we don't corrupt the
    // shared admin client's authStore when validating a user token.
    const pb = new PocketBase(process.env.POCKETBASE_URL);
    pb.authStore.save(token, null);
    const user = await pb.collection('users').authRefresh();

    if (!user?.record || user.record.role !== 'author') {
      return res.status(403).json({ error: 'Author role required' });
    }

    req.authorUser = user.record;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
