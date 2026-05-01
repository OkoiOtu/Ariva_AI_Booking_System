import express from 'express';
import crypto  from 'crypto';
import { getClient } from '../services/pbService.js';
import { logActivity } from '../services/activityLogger.js';

const router = express.Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const DASHBOARD_URL   = process.env.DASHBOARD_URL ?? 'https://ariva-dashboard.up.railway.app';

// Base prices in NGN (kobo = NGN * 100)
const PLAN_PRICES_NGN = {
  professional: 49000,
  enterprise:   null,
};

const PLAN_NAMES = {
  professional: 'Ariva Professional',
  enterprise:   'Ariva Enterprise',
};

// In-memory exchange rate cache — refreshes every hour
let _rateCache = { usdPerNgn: null, ts: 0 };

async function getUSDPerNGN() {
  if (_rateCache.usdPerNgn && Date.now() - _rateCache.ts < 3_600_000) {
    return _rateCache.usdPerNgn;
  }
  try {
    const res  = await fetch('https://open.er-api.com/v6/latest/NGN', {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (data.rates?.USD) {
      _rateCache = { usdPerNgn: data.rates.USD, ts: Date.now() };
      console.info(`[payments] Exchange rate updated: 1 NGN = ${data.rates.USD} USD`);
      return data.rates.USD;
    }
  } catch (err) {
    console.warn('[payments] Exchange rate fetch failed:', err.message);
  }
  return _rateCache.usdPerNgn ?? 0.00063; // fallback ~₦1,587/$1
}

/**
 * GET /payments/rate
 * Returns current NGN→USD exchange rate for frontend display.
 */
router.get('/rate', async (_req, res) => {
  const usdPerNgn = await getUSDPerNGN();
  res.json({ usdPerNgn, ngnPerUsd: Math.round(1 / usdPerNgn) });
});

/**
 * POST /payments/initialize
 */
router.post('/initialize', async (req, res) => {
  if (!PAYSTACK_SECRET) {
    return res.status(500).json({ error: 'Payment system not configured. Add PAYSTACK_SECRET_KEY to environment.' });
  }

  const { plan, companyId, email, currency = 'NGN' } = req.body;
  if (!plan || !companyId || !email) {
    return res.status(400).json({ error: 'plan, companyId and email are required.' });
  }
  if (!PLAN_PRICES_NGN[plan] === undefined) {
    return res.status(400).json({ error: 'Invalid plan.' });
  }
  if (PLAN_PRICES_NGN[plan] === null) {
    return res.status(400).json({ error: 'Enterprise plan requires direct contact. Email hello@ariva.ai.' });
  }

  try {
    const cur = currency.toUpperCase();
    const ngnBase = PLAN_PRICES_NGN[plan]; // e.g. 49000

    let amount; // in lowest currency unit (kobo for NGN, cents for USD)
    let displayAmount;

    if (cur === 'USD') {
      const rate = await getUSDPerNGN();
      const usd  = ngnBase * rate;           // e.g. 49000 * 0.00063 ≈ 30.87
      amount     = Math.ceil(usd * 100);     // in cents, round up
      displayAmount = (amount / 100).toFixed(2);
    } else {
      amount        = ngnBase * 100;         // in kobo
      displayAmount = ngnBase.toLocaleString('en-NG');
    }

    const ref = `ariva_${companyId}_${plan}_${Date.now()}`;

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount,
        currency: cur,
        reference:    ref,
        callback_url: `${DASHBOARD_URL}/checkout/callback`,
        metadata: {
          plan,
          companyId,
          displayAmount,
          currency: cur,
          custom_fields: [
            { display_name: 'Plan',       variable_name: 'plan',      value: plan      },
            { display_name: 'Company ID', variable_name: 'companyId', value: companyId },
          ],
        },
        channels: ['card', 'bank', 'ussd', 'bank_transfer'],
      }),
    });

    const data = await response.json();
    if (!data.status) throw new Error(data.message ?? 'Paystack initialization failed');

    const pb = await getClient();
    await pb.collection('payments').create({
      company_id: companyId,
      plan,
      amount:     amount / 100,
      currency:   cur,
      reference:  ref,
      status:     'pending',
      email,
    }, { requestKey: null }).catch(() => {});

    res.json({
      success:      true,
      checkoutUrl:  data.data.authorization_url,
      reference:    ref,
      accessCode:   data.data.access_code,
      amount:       amount / 100,
      displayAmount,
      currency:     cur,
    });
  } catch (err) {
    console.error('[payments] initialize error:', err.message);
    res.status(500).json({ error: err.message ?? 'Failed to initialize payment.' });
  }
});

/**
 * POST /payments/webhook
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  const body      = req.body;

  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(body)
    .digest('hex');

  if (hash !== signature) {
    console.warn('[payments] Invalid webhook signature');
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(body);
  console.info('[payments] Webhook event:', event.event);

  if (event.event === 'charge.success') {
    const { reference, metadata, amount, currency } = event.data;
    const { plan, companyId } = metadata ?? {};

    if (!plan || !companyId) {
      console.warn('[payments] Missing metadata in webhook');
      return res.sendStatus(200);
    }

    try {
      const pb = await getClient();

      // Idempotency: skip if already processed
      const existing = await pb.collection('payments').getFullList({
        filter: `reference = "${reference}" && status = "paid"`, requestKey: null,
      }).catch(() => []);

      if (existing.length > 0) {
        console.info(`[payments] Duplicate webhook for ${reference} — skipping`);
        return res.sendStatus(200);
      }

      // Activate plan
      await pb.collection('companies').update(companyId, {
        plan,
        active: true,
      }, { requestKey: null });

      // Update payment record (non-fatal)
      await pb.collection('payments').getFullList({
        filter: `reference = "${reference}"`, requestKey: null,
      }).then(async (rows) => {
        if (rows.length > 0) {
          await pb.collection('payments').update(rows[0].id, {
            status:  'paid',
            paid_at: new Date().toISOString(),
          }, { requestKey: null });
        }
      }).catch(() => {});

      await logActivity(
        'plan_upgraded',
        'System',
        `Company ${companyId} upgraded to ${plan} plan. Ref: ${reference}`,
        companyId
      );

      console.info(`[payments] Plan activated: ${plan} for company ${companyId}`);
    } catch (err) {
      console.error('[payments] Failed to activate plan:', err.message);
    }
  }

  res.sendStatus(200);
});

/**
 * GET /payments/verify/:reference
 */
router.get('/verify/:reference', async (req, res) => {
  if (!PAYSTACK_SECRET) return res.status(500).json({ error: 'Payment not configured.' });

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${req.params.reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    const data = await response.json();
    if (!data.status) throw new Error(data.message ?? 'Verification failed');

    const tx = data.data;
    res.json({
      status:    tx.status,
      plan:      tx.metadata?.plan,
      companyId: tx.metadata?.companyId,
      amount:    tx.amount / 100,
      currency:  tx.currency,
      paidAt:    tx.paid_at,
      reference: tx.reference,
    });
  } catch (err) {
    res.status(500).json({ error: err.message ?? 'Verification failed.' });
  }
});

/**
 * GET /payments/history
 */
router.get('/history', async (req, res) => {
  try {
    const pb     = await getClient();
    const filter = req.companyId ? `company_id = "${req.companyId}"` : '';
    const result = await pb.collection('payments').getFullList({
      filter, sort: '-created', requestKey: null,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment history.' });
  }
});

export default router;
