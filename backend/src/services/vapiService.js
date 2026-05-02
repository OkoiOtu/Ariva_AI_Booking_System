import { STRUCTURED_DATA_SCHEMA } from '../../vapi-assistant-config.js';

const VAPI_BASE   = 'https://api.vapi.ai';
const BACKEND_URL = process.env.BACKEND_URL ?? 'https://ariva-backend.up.railway.app';

function headers() {
  return {
    Authorization:  `Bearer ${process.env.VAPI_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

// ── System prompt builder ──────────────────────────────────────────────────

export function buildSystemPrompt(company, pricingRules = [], customQA = []) {
  const agentName    = company.ai_agent_name || 'Aria';
  const vehicleTypes = (company.ai_vehicle_types || 'sedan,suv,van,bus')
    .split(',').map(v => v.trim()).filter(Boolean).join(', ');
  const languages    = company.ai_languages || 'English';
  const minHours     = company.ai_min_hours     ?? 1;
  const maxHours     = company.ai_max_hours     ?? 12;
  const noticeHrs    = company.ai_advance_notice_hrs ?? 2;

  // Business hours
  const hoursMode = company.ai_business_hours || '24/7';
  let hoursLine;
  if (hoursMode === '24/7') {
    hoursLine = 'You operate 24 hours a day, 7 days a week.';
  } else if (hoursMode === 'business_hours') {
    hoursLine = `Business hours: ${company.ai_hours_start || '08:00'} – ${company.ai_hours_end || '22:00'}, Monday to Friday.`;
  } else {
    const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const days = (company.ai_hours_days || '1,2,3,4,5')
      .split(',').map(d => dayNames[+d.trim()]).filter(Boolean).join(', ');
    hoursLine = `Operating hours: ${company.ai_hours_start || '08:00'} – ${company.ai_hours_end || '22:00'} on ${days}.`;
  }

  const afterHoursMsg = company.ai_after_hours_msg ||
    `We are currently outside our operating hours. Please call back during business hours.`;

  // Pricing
  const activeRules = pricingRules.filter(r => r.active !== false);
  let pricingSection;
  if (company.ai_quote_prices !== false && activeRules.length > 0) {
    pricingSection = 'PRICING:\n' + activeRules.map(r => {
      const price = Number(r.price || r.price_per_hour || r.fixed_price) || 0;
      return r.type === 'fixed'
        ? `- ${r.name}: ₦${price.toLocaleString()} (flat rate)`
        : `- ${r.name}: ₦${price.toLocaleString()}/hour`;
    }).join('\n');
  } else {
    pricingSection = 'Pricing will be confirmed via SMS after the call.';
  }

  // What to collect
  const collectLines = [
    '1. Caller full name',
    '2. Pickup date and time',
    '3. Full pickup address (including area/landmark)',
    `4. Duration — minimum ${minHours} hour(s), maximum ${maxHours} hours`,
    company.ai_ask_flight     !== false ? '5. Flight number if this is an airport pickup' : null,
    company.ai_ask_email      !== false ? '6. Email address for booking confirmation'      : null,
    company.ai_ask_special_req !== false ? '7. Any special requests or requirements'       : null,
  ].filter(Boolean).join('\n');

  // Custom Q&A
  const activeQA = customQA
    .filter(q => q.active !== false)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const qaSection = activeQA.length > 0
    ? '\nFREQUENTLY ASKED QUESTIONS:\n' + activeQA.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n')
    : '';

  const greeting = company.ai_greeting ||
    `Welcome to ${company.name}, I'm ${agentName}, how can I help you today?`;

  return `You are ${agentName}, a professional booking assistant for ${company.name}${company.city ? ` based in ${company.city}` : ''}.
Your job is to answer inbound calls and collect information needed to confirm a vehicle hire booking.

## Personality
- Warm, calm, and professional
- Plain conversational language — no jargon
- Keep the call focused; do not go off-topic

## Greeting
When the call starts say: "${greeting}"

## Business Hours
${hoursLine}

## After Hours
${afterHoursMsg}

## Service Area
${company.ai_service_area || 'We serve the local area and surrounding regions.'}

## Vehicles Available
${vehicleTypes}

## Booking Rules
- Minimum duration: ${minHours} hour(s)
- Maximum duration: ${maxHours} hours
- Minimum advance notice: ${noticeHrs} hours from now

## ${pricingSection}

## What You Must Collect
${collectLines}

## Conversation Flow
1. Greet the caller
2. Ask for their name
3. Ask for pickup date and time
4. Ask for pickup address
5. Ask how many hours they need the vehicle
6. Ask for vehicle type preference (optional)
${company.ai_ask_flight  !== false ? '7. If airport mentioned: ask for flight number\n' : ''}${company.ai_ask_email !== false ? '8. Ask for email for confirmation\n' : ''}${company.ai_ask_special_req !== false ? '9. Ask for any special requests\n' : ''}
7. Read all details back for confirmation
8. If they asked about price, confirm the quoted price
9. Tell them they will receive an SMS confirmation shortly
10. Thank them and end the call

## Important Rules
- If any required field is missing — do NOT confirm. Say a human agent will call back.
- If duration is outside the allowed range — do NOT auto-confirm. Escalate to team.
- Never guess or make up information.
- Always confirm details before ending the call.

## Ending the Call
"Thank you, [Name]. You will receive an SMS confirmation shortly. Have a great day!"
${qaSection}

## Languages
Respond in ${languages} only.`.trim();
}

// ── Vapi REST helpers ──────────────────────────────────────────────────────

export async function createAssistant(company, pricingRules = [], customQA = []) {
  if (!process.env.VAPI_API_KEY) throw new Error('VAPI_API_KEY is not set');

  const systemPrompt = buildSystemPrompt(company, pricingRules, customQA);

  const res = await fetch(`${VAPI_BASE}/assistant`, {
    method:  'POST',
    headers: headers(),
    body: JSON.stringify({
      name:  `${company.name} — ${company.ai_agent_name || 'Aria'}`,
      model: {
        provider: 'openai',
        model:    'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }],
      },
      voice:       { provider: '11labs', voiceId: 'paula' },
      transcriber: { provider: 'deepgram', model: 'nova-2' },
      serverUrl:   `${BACKEND_URL}/webhook/vapi`,
      analysisPlan: { structuredDataSchema: STRUCTURED_DATA_SCHEMA },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Vapi createAssistant ${res.status}: ${err}`);
  }

  const data = await res.json();
  console.info(`[vapiService] Assistant created: ${data.id} for ${company.name}`);
  return data.id;
}

export async function updateAssistant(assistantId, company, pricingRules = [], customQA = []) {
  if (!process.env.VAPI_API_KEY || !assistantId) return;

  const systemPrompt = buildSystemPrompt(company, pricingRules, customQA);

  const res = await fetch(`${VAPI_BASE}/assistant/${assistantId}`, {
    method:  'PATCH',
    headers: headers(),
    body: JSON.stringify({
      name:  `${company.name} — ${company.ai_agent_name || 'Aria'}`,
      model: {
        provider: 'openai',
        model:    'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Vapi updateAssistant ${res.status}: ${err}`);
  }

  console.info(`[vapiService] Assistant updated: ${assistantId}`);
}

export async function deleteAssistant(assistantId) {
  if (!process.env.VAPI_API_KEY || !assistantId) return;
  await fetch(`${VAPI_BASE}/assistant/${assistantId}`, {
    method: 'DELETE', headers: headers(),
  }).catch(err => console.warn('[vapiService] deleteAssistant:', err.message));
  console.info(`[vapiService] Assistant deleted: ${assistantId}`);
}

export async function importPhoneNumber(number, friendlyName) {
  if (!process.env.VAPI_API_KEY) throw new Error('VAPI_API_KEY is not set');

  const res = await fetch(`${VAPI_BASE}/phone-number`, {
    method:  'POST',
    headers: headers(),
    body: JSON.stringify({
      provider:          'twilio',
      number,
      twilioAccountSid:  process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken:   process.env.TWILIO_AUTH_TOKEN,
      name:              friendlyName || number,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Vapi importPhoneNumber ${res.status}: ${err}`);
  }

  const data = await res.json();
  console.info(`[vapiService] Phone number imported: ${data.id} (${number})`);
  return data.id;
}

export async function enableAssistantOnPhone(vapiPhoneId, assistantId) {
  if (!process.env.VAPI_API_KEY || !vapiPhoneId || !assistantId) return;

  const res = await fetch(`${VAPI_BASE}/phone-number/${vapiPhoneId}`, {
    method:  'PATCH',
    headers: headers(),
    body:    JSON.stringify({ assistantId }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Vapi enableAssistant ${res.status}: ${err}`);
  }

  console.info(`[vapiService] Assistant ${assistantId} → phone ${vapiPhoneId}`);
}

export async function disableAssistantOnPhone(vapiPhoneId) {
  if (!process.env.VAPI_API_KEY || !vapiPhoneId) return;

  await fetch(`${VAPI_BASE}/phone-number/${vapiPhoneId}`, {
    method:  'PATCH',
    headers: headers(),
    body:    JSON.stringify({ assistantId: null }),
  }).catch(err => console.warn('[vapiService] disableAssistant:', err.message));

  console.info(`[vapiService] Assistant removed from phone ${vapiPhoneId}`);
}
