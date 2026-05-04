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
// Creates a new user + company and sends a verification email via Resend.
// ---------------------------------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    const pb = await getClient();
    const { name, email, password, companyName, slug, city, phone, plan = 'starter' } = req.body;

    if (!name || !email || !password || !companyName || !slug) {
      return res.status(400).json({ error: 'name, email, password, companyName and slug are all required.' });
    }

    // 1. Check email not already taken
    try {
      const existing = await pb.collection('users').getFirstListItem(
        `email = "${esc(email)}"`, { requestKey: null }
      );
      if (existing) return res.status(409).json({ error: 'This email address is already registered.' });
    } catch { /* not found = good */ }

    // 2. Check slug not already taken
    try {
      const existingSlug = await pb.collection('companies').getFirstListItem(
        `slug = "${esc(slug)}"`, { requestKey: null }
      );
      if (existingSlug) return res.status(409).json({ error: 'This company slug is already taken. Choose a different one.' });
    } catch { /* not found = good */ }

    // 3. Create company first
    const company = await pb.collection('companies').create({
      name:   companyName,
      slug,
      city:   city  ?? '',
      phone:  phone ?? '',
      plan,
      active: true,
      // AI voice agent defaults — user can adjust in Settings
      ai_ask_email:       true,
      ai_ask_flight:      true,
      ai_ask_special_req: true,
      ai_quote_prices:    true,
    }, { requestKey: null });

    // 4. Create user linked to company
    const user = await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      full_name:       name,
      role:            'super_admin',
      company_id:      company.id,
      suspended:       false,
      emailVisibility: true,
      verified:        false,
    }, { requestKey: null });

    // 5. Send verification email via Resend (bypasses SMTP entirely)
    try {
      const token = signToken({ userId: user.id, email, type: 'verify' }, 24 * 60 * 60 * 1000);
      await sendVerificationEmail(email, name, token);
    } catch (err) {
      console.warn('[auth/register] verification email failed:', err.message);
    }

    await logActivity('user_registered', name, `New super_admin registered: ${email} (${companyName})`, company.id);

    res.json({
      success:   true,
      userId:    user.id,
      companyId: company.id,
      email:     user.email,
    });
  } catch (err) {
    const detail = err.data ? JSON.stringify(err.data) : '';
    console.error('[auth/register] error:', err.message, detail);
    res.status(500).json({ error: err.message ?? 'Registration failed. Please try again.' });
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
