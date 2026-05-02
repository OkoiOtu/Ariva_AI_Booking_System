# Ariva AI Booking System — Project Context for Claude Code

## What this project is
A multi-tenant SaaS AI booking platform for transportation companies.
Companies sign up, get their own dashboard, connect a Twilio number, and an AI
voice agent (Aria via Vapi.ai) answers inbound calls, captures booking details,
confirms pricing, and updates the dashboard automatically.

## Stack
- **Backend**: Node.js + Express — `backend/`
- **Database**: PocketBase — `pocketbase/`
- **Dashboard**: Next.js 14 + React — `dashboard/`
- **Voice AI**: Vapi.ai (GPT-4o) + Twilio
- **SMS**: Twilio
- **Payments**: Paystack
- **Deployment**: Railway (all three services)

## Live URLs (Railway)
- Backend:    https://ariva-backend.up.railway.app
- PocketBase: https://ariva-pocketbase.up.railway.app
- Dashboard:  https://ariva-dashboard.up.railway.app
- Admin:      https://ariva-admin.up.railway.app

## User Role Hierarchy
1. `author`      — Platform developer, sees all companies (your role)
2. `super_admin` — Company owner who signed up, controls their company dashboard
3. `admin`       — Added by super_admin, manages dashboard
4. `user`        — Read-only + driver assignment + reports

## Plans
- `starter`      — Free, 50 bookings/month, limited features, 1 user
- `professional` — $49/month (₦49,000), unlimited bookings, all features, 10 users
- `enterprise`   — Custom pricing, unlimited everything, white-label

## Key files
```
dashboard/src/
  app/
    page.jsx              — Landing page (public root)
    layout.jsx            — Main layout with sidebar, auth guard, company branding
    dashboard/page.jsx    — Overview/stats page (protected)
    login/page.jsx        — Login
    signup/page.jsx       — Multi-step company registration
    forgot-password/      — Password reset flow
    verify-email/         — Email verification
    plans/page.jsx        — Pricing plans page
    checkout/page.jsx     — Paystack payment checkout
    checkout/callback/    — Payment callback/verification
    bookings/page.jsx
    leads/page.jsx
    calls/page.jsx
    calendar/page.jsx
    customers/page.jsx
    revenue/page.jsx
    drivers/page.jsx
    pricing/page.jsx
    activity/page.jsx
    users/page.jsx
    settings/page.jsx
    companies/page.jsx    — Author-only, all tenants
  lib/
    auth.js               — Auth context, role helpers, password strength
    pb.js                 — PocketBase client
    companyContext.js     — Company context, caches company_id
    api.js                — Fetch helper that auto-injects x-company-id header
    activityLog.js        — Frontend activity logging
  components/
    PlanGate.jsx          — Wraps pages, blurs if plan doesn't allow feature
    BookingTable.jsx
    BookingDetailModal.jsx
    StatusBadge.jsx
    RightSidebar.jsx
    CallDrawer.jsx
    LeadCard.jsx

backend/src/
  routes/
    auth.js               — POST /auth/register (creates user+company), /resend-verification
    bookings.js           — Full CRUD + company scoped
    leads.js
    calls.js
    drivers.js
    pricing.js
    revenue.js
    stats.js
    activity.js
    users.js              — Company-scoped users, role protection
    companies.js          — Multi-tenant company management
    payments.js           — Paystack initialize/webhook/verify
    export.js             — CSV exports
    notifications.js      — SMS notification settings
    webhook.js            — Vapi webhook handler
  services/
    pbService.js          — PocketBase admin client with token refresh
    bookingService.js     — Core booking logic from Vapi webhook
    smsService.js         — Twilio SMS
    pricingService.js     — calculatePrice() from pricing_rules
    driverService.js      — assignDriver, conflict detection
    reminderService.js    — 1hr pickup SMS reminders
    statusScheduler.js    — 60s tick: status updates, reminders, driver sync
    activityLogger.js     — logActivity()
  middleware/
    companyScope.js       — Reads x-company-id header, adds buildFilter()
    validateWebhook.js    — Vapi signature validation
```

## PocketBase Collections
- `users`         — Auth collection + full_name, role, company_id, suspended
- `companies`     — Tenant registry: name, slug, plan, vapi/twilio config
- `bookings`      — All booking records with company_id
- `leads`         — Non-qualifying calls with company_id
- `calls`         — All Vapi call records with company_id
- `drivers`       — Driver profiles with company_id
- `pricing_rules` — Hourly/fixed route pricing with company_id
- `activity_logs` — Audit trail with company_id
- `app_settings`  — key/value store (notification settings)
- `payments`      — Payment records: company_id, plan, amount, status

## Multi-tenant isolation
Every API request from the dashboard sends `x-company-id` header (via api.js).
Backend middleware (companyScope.js) reads it and buildFilter() injects
`company_id = "xxx"` into every PocketBase query automatically.

## What's working
- Full signup flow (backend /auth/register → PocketBase admin client)
- Email verification via PocketBase + Brevo SMTP
- Forgot/reset password
- Company data isolation
- Plan enforcement (PlanGate blur overlays)
- Payment flow (Paystack — needs PAYSTACK_SECRET_KEY in .env)
- AI voice agent config in backend/vapi-assistant-config.js

## What still needs work (pending your decisions)
- Paystack secret key needs adding to Railway env vars
- payments collection needs creating in PocketBase
- Vapi live call test (waiting on Twilio number from boss)
- Author dashboard (/admin) for platform-level analytics
- Company logo display in sidebar

## Environment variables (backend/.env)
```
POCKETBASE_URL=http://127.0.0.1:8090
PB_ADMIN_EMAIL=...
PB_ADMIN_PASSWORD=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
ADMIN_PHONE_NUMBER=+234...
VAPI_WEBHOOK_SECRET=booking-secret-2026
DASHBOARD_URL=http://localhost:3001
PAYSTACK_SECRET_KEY=sk_test_...
PORT=3000
```