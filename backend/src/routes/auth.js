import express  from 'express';
import crypto   from 'crypto';
import { getClient }              from '../services/pbService.js';
import { logActivity }            from '../services/activityLogger.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js';

const router = express.Router();

const esc = v => String(v ?? '').replace(/"/g, '');

// ---------------------------------------------------------------------------
// HMAC-signed stateless tokens — no DB storage, no SMTP dependency
// Token format: base64url(JSON payload) + '.' + hex(HMAC-SHA256)
// ---------------------------------------------------------------------------
const secret = () => process.env.JWT_SECRET ?? process.env.RESEND_API_KEY ?? 'changeme-set-JWT_SECRET';

function signToken(payload, expiresInMs) {
  const data   = JSON.stringify({ ...payload, exp: Date.now() + expiresInMs });
  const b64    = Buffer.from(data).toString('base64url');
  const sig    = crypto.createHmac('sha256', secret()).update(b64).digest('hex');
  return `${b64}.${sig}`;
}

function verifyToken(token) {
  const parts = (token ?? '').split('.');
  if (parts.length !== 2) throw new Error('Invalid token');
  const [b64, sig] = parts;
  let data;
  try { data = Buffer.from(b64, 'base64url').toString(); } catch { throw new Error('Invalid token'); }
  const expected = crypto.createHmac('sha256', secret()).update(b64).digest('hex');
  // Constant-time compare (both are hex strings of equal length)
  if (sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error('Invalid token');
  }
  let payload;
  try { payload = JSON.parse(data); } catch { throw new Error('Invalid token'); }
  if (!payload.exp || payload.exp < Date.now()) throw new Error('Token has expired');
  return payload;
}

// ---------------------------------------------------------------------------
// POST /auth/register
// Creates a new user (no company yet) and sends a verification email.
// Company is created separately via POST /auth/setup-company.
// ---------------------------------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    const pb = await getClient();
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: 'name, username, email and password are all required.' });
    }

    // Check email not already taken
    try {
      const existing = await pb.collection('users').getFirstListItem(
        `email = "${esc(email)}"`, { requestKey: null }
      );
      if (existing) return res.status(409).json({ error: 'This email address is already registered.' });
    } catch { /* not found = good */ }

    // Check username not already taken
    try {
      const existingUser = await pb.collection('users').getFirstListItem(
        `username = "${esc(username)}"`, { requestKey: null }
      );
      if (existingUser) return res.status(409).json({ error: 'This username is already taken.' });
    } catch { /* not found = good */ }

    const user = await pb.collection('users').create({
      email,
      username,
      password,
      passwordConfirm: password,
      full_name:       name,
      role:            'super_admin',
      company_id:      '',
      suspended:       false,
      emailVisibility: true,
      verified:        false,
    }, { requestKey: null });

    try {
      const token = signToken({ userId: user.id, email, type: 'verify' }, 24 * 60 * 60 * 1000);
      await sendVerificationEmail(email, name, token);
    } catch (err) {
      console.warn('[auth/register] verification email failed:', err.message);
    }

    await logActivity('user_registered', name, `New user registered: ${email}`, '');

    res.json({ success: true, userId: user.id, email: user.email });
  } catch (err) {
    const detail = err.data ? JSON.stringify(err.data) : '';
    console.error('[auth/register] error:', err.message, detail);
    res.status(500).json({ error: err.message ?? 'Registration failed. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// POST /auth/setup-company
// Creates a company and links it to the authenticated user.
// Called from the /onboarding page after first sign-in (email or Google).
// Auth: requires a valid PocketBase user token in Authorization: Bearer <token>
// ---------------------------------------------------------------------------
router.post('/setup-company', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  try {
    // Verify caller is a real PocketBase user by refreshing their token
    const { default: PocketBase } = await import('pocketbase');
    const userPb = new PocketBase(process.env.POCKETBASE_URL);
    userPb.authStore.save(token, null);
    let callerRecord;
    try {
      const auth = await userPb.collection('users').authRefresh({ requestKey: null });
      callerRecord = auth.record;
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
    }

    const pb = await getClient();
    const { companyName, slug, city, phone } = req.body;

    if (!companyName || !slug) {
      return res.status(400).json({ error: 'companyName and slug are required.' });
    }

    // Check slug not taken
    try {
      const existing = await pb.collection('companies').getFirstListItem(
        `slug = "${esc(slug)}"`, { requestKey: null }
      );
      if (existing) return res.status(409).json({ error: 'This company slug is already taken.' });
    } catch { /* good */ }

    const company = await pb.collection('companies').create({
      name:               companyName,
      slug,
      city:               city  ?? '',
      phone:              phone ?? '',
      plan:               'starter',
      active:             true,
      ai_ask_email:       true,
      ai_ask_flight:      true,
      ai_ask_special_req: true,
      ai_quote_prices:    true,
    }, { requestKey: null });

    // Link user to company and confirm their role
    await pb.collection('users').update(callerRecord.id, {
      company_id: company.id,
      role:       'super_admin',
      verified:   true,
    }, { requestKey: null });

    await logActivity('company_created', callerRecord.full_name ?? callerRecord.email,
      `Company "${companyName}" created by ${callerRecord.email}`, company.id);

    res.json({ success: true, companyId: company.id, companyName });
  } catch (err) {
    console.error('[auth/setup-company] error:', err.message);
    res.status(500).json({ error: err.message ?? 'Company setup failed. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// GET /auth/check-email?email=...
// Returns { exists: true/false } — real-time check on signup form.
// ---------------------------------------------------------------------------
router.get('/check-email', async (req, res) => {
  const email = String(req.query.email ?? '').trim();
  if (!email.includes('@')) return res.json({ exists: false });
  try {
    const pb = await getClient();
    try {
      await pb.collection('users').getFirstListItem(`email = "${esc(email)}"`, { requestKey: null });
      return res.json({ exists: true });
    } catch {
      return res.json({ exists: false });
    }
  } catch (err) {
    console.error('[auth/check-email] error:', err.message);
    res.json({ exists: false }); // fail open — /register catches it on submit
  }
});

// ---------------------------------------------------------------------------
// GET /auth/check-username?username=...
// ---------------------------------------------------------------------------
router.get('/check-username', async (req, res) => {
  const username = String(req.query.username ?? '').trim();
  if (!username) return res.json({ exists: false });
  try {
    const pb = await getClient();
    try {
      await pb.collection('users').getFirstListItem(`username = "${esc(username)}"`, { requestKey: null });
      return res.json({ exists: true });
    } catch {
      return res.json({ exists: false });
    }
  } catch (err) {
    console.error('[auth/check-username] error:', err.message);
    res.json({ exists: false });
  }
});

// ---------------------------------------------------------------------------
// GET /auth/check-slug?slug=...
// Returns { exists: true/false } — real-time check on signup form.
// ---------------------------------------------------------------------------
router.get('/check-slug', async (req, res) => {
  const slug = String(req.query.slug ?? '').trim();
  if (!slug) return res.json({ exists: false });
  try {
    const pb = await getClient();
    try {
      await pb.collection('companies').getFirstListItem(`slug = "${esc(slug)}"`, { requestKey: null });
      return res.json({ exists: true });
    } catch {
      return res.json({ exists: false });
    }
  } catch (err) {
    console.error('[auth/check-slug] error:', err.message);
    res.json({ exists: false }); // fail open — /register catches it on submit
  }
});

// ---------------------------------------------------------------------------
// POST /auth/resend-verification
// Generates a new verification token and resends via Resend.
// ---------------------------------------------------------------------------
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email || !String(email).includes('@')) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  try {
    const pb = await getClient();
    let user;
    try {
      user = await pb.collection('users').getFirstListItem(`email = "${esc(email)}"`, { requestKey: null });
    } catch { /* user not found — return generic success below */ }

    if (user && !user.verified) {
      try {
        const token = signToken({ userId: user.id, email, type: 'verify' }, 24 * 60 * 60 * 1000);
        await sendVerificationEmail(email, user.full_name ?? '', token);
      } catch (err) {
        console.warn('[auth/resend-verification] email failed:', err.message);
      }
    }

    res.json({ success: true, message: 'If this email exists and is unverified, a verification link has been sent.' });
  } catch (err) {
    console.error('[auth/resend-verification] error:', err.message);
    res.status(500).json({ error: 'Could not process verification resend right now.' });
  }
});

// ---------------------------------------------------------------------------
// GET /auth/verify-email?token=...
// Verifies the signed token and marks the user as verified in PocketBase.
// Called by the dashboard /verify-email page after the user clicks the link.
// ---------------------------------------------------------------------------
router.get('/verify-email', async (req, res) => {
  const token = String(req.query.token ?? '');
  try {
    const { userId, type } = verifyToken(token);
    if (type !== 'verify') return res.status(400).json({ error: 'Invalid token type.' });
    const pb = await getClient();
    await pb.collection('users').update(userId, { verified: true }, { requestKey: null });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Verification failed. The link may have expired.' });
  }
});

// ---------------------------------------------------------------------------
// POST /auth/request-password-reset
// Generates a reset token and sends it via Resend.
// Always returns success to prevent email enumeration.
// ---------------------------------------------------------------------------
router.post('/request-password-reset', async (req, res) => {
  const { email } = req.body;
  if (!email || !String(email).includes('@')) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  try {
    const pb = await getClient();
    let user;
    try {
      user = await pb.collection('users').getFirstListItem(`email = "${esc(email)}"`, { requestKey: null });
    } catch { /* not found — return generic success */ }

    if (user) {
      try {
        const token = signToken({ userId: user.id, email, type: 'reset' }, 60 * 60 * 1000);
        await sendPasswordResetEmail(email, user.full_name ?? '', token);
      } catch (err) {
        console.warn('[auth/request-password-reset] email failed:', err.message);
      }
    }

    res.json({ success: true, message: 'If an account with this email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('[auth/request-password-reset] error:', err.message);
    res.status(500).json({ error: 'Could not process password reset right now.' });
  }
});

// ---------------------------------------------------------------------------
// POST /auth/confirm-password-reset
// Verifies the signed reset token and updates the user's password.
// Called by the dashboard /reset-password page after the user submits the form.
// ---------------------------------------------------------------------------
router.post('/confirm-password-reset', async (req, res) => {
  const { token, password, passwordConfirm } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required.' });
  }
  if (password !== passwordConfirm) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  try {
    const { userId, type } = verifyToken(token);
    if (type !== 'reset') return res.status(400).json({ error: 'Invalid token type.' });
    const pb = await getClient();
    await pb.collection('users').update(userId, { password, passwordConfirm: password }, { requestKey: null });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message ?? 'Password reset failed. The link may have expired.' });
  }
});

export default router;
