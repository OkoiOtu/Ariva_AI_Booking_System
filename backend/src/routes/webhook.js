import express from 'express';
import { processCall }          from '../services/bookingService.js';
import { validateVapiWebhook }  from '../middleware/validateWebhook.js';
import { getClient }            from '../services/pbService.js';
import { logActivity }          from '../services/activityLogger.js';

const router = express.Router();

const esc = v => String(v ?? '').replace(/"/g, '');

/**
 * POST /webhook/vapi
 *
 * Vapi calls this at the end of every inbound call.
 * We look up the company from the called phone number, verify
 * calling is enabled, then hand off to processCall.
 */
router.post('/vapi', validateVapiWebhook, async (req, res) => {
  // Acknowledge receipt immediately so Vapi doesn't retry
  res.status(200).json({ received: true });

  const { message } = req.body;
  if (!message || message.type !== 'end-of-call-report') return;

  try {
    // Determine which company owns the called number
    const calledNumber = message.call?.phoneNumber?.number ?? message.call?.to ?? '';
    let companyId      = null;

    if (calledNumber) {
      try {
        const pb     = await getClient();
        const numRec = await pb.collection('phone_numbers').getFirstListItem(
          `number = "${esc(calledNumber)}"`, { requestKey: null }
        );
        companyId = numRec.company_id ?? null;

        // Check that calling is still enabled for this company
        if (companyId) {
          const company = await pb.collection('companies').getOne(companyId, { requestKey: null });
          if (!company.calling_enabled) {
            console.info(`[webhook] Calling disabled for company ${companyId} — rejecting call`);
            await logActivity('call_rejected_calling_disabled', calledNumber,
              `Inbound call rejected — calling_enabled is false`, companyId);
            return;
          }
        }
      } catch {
        // Number not found in pool — process without company scope (legacy / single-tenant)
      }
    }

    await processCall(message, companyId);
  } catch (err) {
    console.error('[webhook] processCall failed:', err.message, {
      callId: message?.call?.id,
      stack:  err.stack,
    });
  }
});

export default router;
