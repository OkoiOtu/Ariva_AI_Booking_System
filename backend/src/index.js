import 'dotenv/config';
import express from 'express';
import webhookRouter      from './routes/webhook.js';
import bookingsRouter     from './routes/bookings.js';
import leadsRouter        from './routes/leads.js';
import callsRouter        from './routes/calls.js';
import usersRouter        from './routes/users.js';
import activityRouter     from './routes/activity.js';
import statsRouter        from './routes/stats.js';
import pricingRouter      from './routes/pricing.js';
import driversRouter      from './routes/drivers.js';
import revenueRouter      from './routes/revenue.js';
import exportRouter       from './routes/export.js';
import notificationsRouter from './routes/notifications.js';
import companiesRouter    from './routes/companies.js';
import authRouter         from './routes/auth.js';
import paymentsRouter     from './routes/payments.js';
import adminRouter        from './routes/admin.js';
import phoneNumbersRouter from './routes/phoneNumbers.js';
import { companyScope }   from './middleware/companyScope.js';
import { requireAuth }    from './middleware/requireAuth.js';
import rateLimit          from 'express-rate-limit';
import { startStatusScheduler } from './services/statusScheduler.js';
import { getClient, startTokenRefresh } from './services/pbService.js';

const app  = express();
const PORT = process.env.PORT ?? 3000;

// CORS — allow both the main dashboard and the admin app
const ALLOWED_ORIGINS = new Set([
  process.env.DASHBOARD_URL   ?? 'http://localhost:3001',
  process.env.ADMIN_URL       ?? 'http://localhost:3002',
  'https://ariva-dashboard.up.railway.app',
  'https://ariva-admin.up.railway.app',
]);
app.use((req, res, next) => {
  const origin = req.headers.origin ?? '';
  if (ALLOWED_ORIGINS.has(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-company-id, x-paystack-signature, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Must be before express.json() — Paystack webhook needs raw body for HMAC signature verification
app.use('/payments/webhook', express.raw({ type: '*/*' }));

app.use(express.json());

// Rate limiting — brute-force protection on auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests — try again in a minute' },
});
app.use('/auth', authLimiter);

// Company scope + auth — attaches req.companyId and verifies the Bearer token
// Webhook is excluded because it comes from Vapi, not the dashboard
const protect = [companyScope, requireAuth];
app.use('/bookings',      protect);
app.use('/leads',         protect);
app.use('/calls',         protect);
app.use('/users',         protect);
app.use('/stats',         protect);
app.use('/pricing',       protect);
app.use('/drivers',       protect);
app.use('/revenue',       protect);
app.use('/export',        protect);
app.use('/notifications', protect);
app.use('/companies',     protect);
app.use('/ai-custom-qa',  protect);
// Activity POST is called for pre-login events (login_failed, suspended) — no token available yet.
// GET requires auth (applied in the route handler).
app.use('/activity', companyScope);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/webhook',      webhookRouter);
app.use('/bookings',     bookingsRouter);
app.use('/leads',        leadsRouter);
app.use('/calls',        callsRouter);
app.use('/users',        usersRouter);
app.use('/activity',     activityRouter);
app.use('/stats',        statsRouter);
app.use('/pricing',      pricingRouter);
app.use('/drivers',      driversRouter);
app.use('/revenue',      revenueRouter);
app.use('/export',       exportRouter);
app.use('/notifications', notificationsRouter);
app.use('/companies',    companiesRouter);
app.use('/ai-custom-qa', companiesRouter);
app.use('/auth',         authRouter);
app.use('/payments',     paymentsRouter);
app.use('/admin',        adminRouter);
app.use('/phone-numbers', phoneNumbersRouter);

app.listen(PORT, async () => {
  console.info(`[server] Running on port ${PORT}`);
  try {
    await getClient();
    startTokenRefresh();
    startStatusScheduler();
    console.info('[server] All services ready');
  } catch (err) {
    console.error('[server] Startup failed:', err.message);
  }
});
