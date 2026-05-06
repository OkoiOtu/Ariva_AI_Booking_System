'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import pb from '@/lib/pb';
import '@/styles/wizard.css';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function Toggle({ on, onToggle }) {
  return (
    <button type="button" className={`wizard-toggle${on ? ' on' : ''}`} onClick={onToggle}>
      <span className="wizard-toggle-thumb" />
    </button>
  );
}

function CheckPill({ label, checked, onToggle }) {
  return (
    <label className={`wizard-check${checked ? ' checked' : ''}`} onClick={onToggle}>
      <input type="checkbox" readOnly checked={checked} />
      <span className="wizard-check-box">
        <span className="material-symbols-outlined">check</span>
      </span>
      <span className="wizard-check-label">{label}</span>
    </label>
  );
}

/* ─── Steps metadata ───────────────────────────────────────────────────────── */
const STEPS = [
  { icon: 'badge',          label: 'Identity & Brand' },
  { icon: 'directions_car', label: 'Fleet & Services' },
  { icon: 'payments',       label: 'Pricing & Hours'  },
  { icon: 'contact_phone',  label: 'Contact & Alerts' },
];

const SERVICE_TYPES = [
  'Airport transfers', 'Corporate travel', 'Wedding hire',
  'Day tours', 'Event transport', 'Intercity rides',
  'School runs', 'Medical transport',
];

const VEHICLE_TYPES = [
  'Saloon', 'SUV / 4x4', 'MPV', 'Minibus',
  'Coach', 'Luxury / Limo', 'Electric',
];

const TIMEZONES = [
  'Africa/Lagos', 'Africa/Nairobi', 'Africa/Accra', 'Africa/Johannesburg',
  'Africa/Cairo', 'Europe/London', 'Europe/Paris', 'America/New_York',
  'America/Chicago', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Kolkata',
];

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'NGN', label: 'NGN — Nigerian Naira' },
  { code: 'GHS', label: 'GHS — Ghanaian Cedi' },
  { code: 'ZAR', label: 'ZAR — South African Rand' },
  { code: 'KES', label: 'KES — Kenyan Shilling' },
];

/* ─── Step 1: Identity & Brand ─────────────────────────────────────────────── */
function Step1({ data, setData, errors }) {
  const [slugEdited,   setSlugEdited]   = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugMsg,      setSlugMsg]      = useState('');
  const [slugOk,       setSlugOk]       = useState(false);

  useEffect(() => {
    if (!slugEdited && data.companyName) {
      setData(p => ({ ...p, slug: slugify(data.companyName) }));
    }
  }, [data.companyName, slugEdited]);

  async function checkSlug(v) {
    const s = v.trim();
    if (!s || s.length < 2) return;
    setSlugChecking(true);
    setSlugMsg(''); setSlugOk(false);
    try {
      const res  = await api(`/auth/check-slug?slug=${encodeURIComponent(s)}`);
      const json = await res.json();
      if (json.exists) { setSlugMsg('This slug is already taken.'); setSlugOk(false); }
      else             { setSlugMsg(`arrival.ai/${s}`); setSlugOk(true); }
    } catch { setSlugMsg(''); }
    finally  { setSlugChecking(false); }
  }

  function handleSlug(v) {
    const clean = v.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setData(p => ({ ...p, slug: clean }));
    setSlugEdited(true);
    setSlugMsg(''); setSlugOk(false);
  }

  return (
    <>
      <p className="wizard-section-label">Company identity</p>

      <div className="wizard-field">
        <label className="wizard-label">Company name <span style={{ color:'var(--red)' }}>*</span></label>
        <input className={`wizard-input${errors.companyName ? ' wizard-input-err' : ''}`}
          value={data.companyName}
          onChange={e => setData(p => ({ ...p, companyName: e.target.value }))}
          placeholder="Lagos Luxury Rides" autoFocus />
        {errors.companyName && <p className="wizard-field-error">{errors.companyName}</p>}
      </div>

      <div className="wizard-field">
        <label className="wizard-label">
          Trading name <span className="wizard-label-optional">(optional)</span>
        </label>
        <input className="wizard-input"
          value={data.dbaName}
          onChange={e => setData(p => ({ ...p, dbaName: e.target.value }))}
          placeholder="If different from company name" />
      </div>

      <div className="wizard-field">
        <label className="wizard-label">Company slug <span style={{ color:'var(--red)' }}>*</span></label>
        <input className={`wizard-input${errors.slug || (!slugOk && slugMsg) ? ' wizard-input-err' : ''}`}
          value={data.slug}
          onChange={e => handleSlug(e.target.value)}
          onBlur={() => checkSlug(data.slug)}
          placeholder="lagos-luxury-rides" />
        {errors.slug
          ? <p className="wizard-field-error">{errors.slug}</p>
          : slugChecking
            ? <p className="wizard-helper">Checking…</p>
            : slugMsg && <p className={`wizard-helper${slugOk ? '' : ' wizard-field-error'}`}
                style={slugOk ? { color:'#4ade80' } : undefined}>{slugMsg}</p>
        }
      </div>

      <p className="wizard-section-label">Location & contact</p>

      <div className="wizard-row">
        <div className="wizard-field">
          <label className="wizard-label">City <span style={{ color:'var(--red)' }}>*</span></label>
          <input className={`wizard-input${errors.city ? ' wizard-input-err' : ''}`}
            value={data.city}
            onChange={e => setData(p => ({ ...p, city: e.target.value }))}
            placeholder="Lagos" />
          {errors.city && <p className="wizard-field-error">{errors.city}</p>}
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Phone <span style={{ color:'var(--red)' }}>*</span></label>
          <input className={`wizard-input${errors.phone ? ' wizard-input-err' : ''}`}
            type="tel" value={data.phone}
            onChange={e => setData(p => ({ ...p, phone: e.target.value }))}
            placeholder="+234 800 000 0000" />
          {errors.phone && <p className="wizard-field-error">{errors.phone}</p>}
        </div>
      </div>

      <div className="wizard-field">
        <label className="wizard-label">
          Website <span className="wizard-label-optional">(optional)</span>
        </label>
        <input className="wizard-input"
          type="url" value={data.website}
          onChange={e => setData(p => ({ ...p, website: e.target.value }))}
          placeholder="https://yourcompany.com" />
      </div>

      <p className="wizard-section-label">Brand</p>

      <div className="wizard-field">
        <label className="wizard-label">
          Brand colour <span className="wizard-label-optional">(optional)</span>
        </label>
        <div className="wizard-color-row">
          <input type="color" className="wizard-color-input"
            value={data.brandColor}
            onChange={e => setData(p => ({ ...p, brandColor: e.target.value }))} />
          <div className="wizard-color-text">
            <input className="wizard-input"
              value={data.brandColor}
              onChange={e => setData(p => ({ ...p, brandColor: e.target.value }))}
              placeholder="#7c5aed" maxLength={7} />
          </div>
        </div>
        <p className="wizard-helper">Used to personalise your dashboard and customer communications.</p>
      </div>
    </>
  );
}

/* ─── Step 2: Fleet & Services ─────────────────────────────────────────────── */
function Step2({ data, setData, errors }) {
  function toggleSet(key, value) {
    setData(p => {
      const set = new Set(p[key] ?? []);
      set.has(value) ? set.delete(value) : set.add(value);
      return { ...p, [key]: [...set] };
    });
  }

  return (
    <>
      <p className="wizard-section-label">Services you offer</p>
      <div className="wizard-checks">
        {SERVICE_TYPES.map(s => (
          <CheckPill key={s} label={s}
            checked={(data.serviceTypes ?? []).includes(s)}
            onToggle={() => toggleSet('serviceTypes', s)} />
        ))}
      </div>
      {errors.serviceTypes && <p className="wizard-field-error" style={{ marginTop:8 }}>{errors.serviceTypes}</p>}

      <p className="wizard-section-label">Vehicle types in your fleet</p>
      <div className="wizard-checks">
        {VEHICLE_TYPES.map(v => (
          <CheckPill key={v} label={v}
            checked={(data.vehicleTypes ?? []).includes(v)}
            onToggle={() => toggleSet('vehicleTypes', v)} />
        ))}
      </div>
      {errors.vehicleTypes && <p className="wizard-field-error" style={{ marginTop:8 }}>{errors.vehicleTypes}</p>}

      <p className="wizard-section-label">Fleet size & coverage</p>

      <div className="wizard-row">
        <div className="wizard-field">
          <label className="wizard-label">
            Number of vehicles <span className="wizard-label-optional">(optional)</span>
          </label>
          <input className="wizard-input" type="number" min={1} max={9999}
            value={data.fleetSize}
            onChange={e => setData(p => ({ ...p, fleetSize: e.target.value }))}
            placeholder="12" />
        </div>
        <div className="wizard-field">
          <label className="wizard-label">
            Timezone <span style={{ color:'var(--red)' }}>*</span>
          </label>
          <select className={`wizard-select${errors.timezone ? ' wizard-input-err' : ''}`}
            value={data.timezone}
            onChange={e => setData(p => ({ ...p, timezone: e.target.value }))}>
            <option value="">Select timezone…</option>
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
          {errors.timezone && <p className="wizard-field-error">{errors.timezone}</p>}
        </div>
      </div>

      <div className="wizard-field">
        <label className="wizard-label">
          Operating area <span className="wizard-label-optional">(optional)</span>
        </label>
        <input className="wizard-input"
          value={data.operatingArea}
          onChange={e => setData(p => ({ ...p, operatingArea: e.target.value }))}
          placeholder="e.g. Lagos Island, Victoria Island, Ikoyi" />
        <p className="wizard-helper">Describe the areas or cities you cover.</p>
      </div>
    </>
  );
}

/* ─── Step 3: Pricing & Hours ──────────────────────────────────────────────── */
function Step3({ data, setData, errors }) {
  return (
    <>
      <p className="wizard-section-label">Pricing model</p>

      <div className="wizard-row">
        <div className="wizard-field">
          <label className="wizard-label">Pricing model <span style={{ color:'var(--red)' }}>*</span></label>
          <select className={`wizard-select${errors.pricingModel ? ' wizard-input-err' : ''}`}
            value={data.pricingModel}
            onChange={e => setData(p => ({ ...p, pricingModel: e.target.value }))}>
            <option value="">Select model…</option>
            <option value="hourly">Hourly rate</option>
            <option value="fixed">Fixed per route</option>
            <option value="hybrid">Hybrid (both)</option>
          </select>
          {errors.pricingModel && <p className="wizard-field-error">{errors.pricingModel}</p>}
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Currency <span style={{ color:'var(--red)' }}>*</span></label>
          <select className={`wizard-select${errors.currency ? ' wizard-input-err' : ''}`}
            value={data.currency}
            onChange={e => setData(p => ({ ...p, currency: e.target.value }))}>
            <option value="">Select currency…</option>
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          {errors.currency && <p className="wizard-field-error">{errors.currency}</p>}
        </div>
      </div>

      <div className="wizard-field">
        <label className="wizard-label">
          Base rate <span className="wizard-label-optional">(optional)</span>
        </label>
        <input className="wizard-input" type="number" min={0}
          value={data.baseRate}
          onChange={e => setData(p => ({ ...p, baseRate: e.target.value }))}
          placeholder="0.00" />
        <p className="wizard-helper">
          Your starting price per hour or per trip. You can set detailed route prices later in Pricing.
        </p>
      </div>

      <p className="wizard-section-label">Operating hours</p>

      <div className="wizard-toggle-row">
        <div className="wizard-toggle-info">
          <p className="wizard-toggle-title">24 / 7 operation</p>
          <p className="wizard-toggle-desc">Your service is available around the clock.</p>
        </div>
        <Toggle on={data.is247} onToggle={() => setData(p => ({ ...p, is247: !p.is247 }))} />
      </div>

      {!data.is247 && (
        <>
          <p className="wizard-section-label">Weekday hours</p>
          <div className="wizard-row">
            <div className="wizard-field">
              <label className="wizard-label">Open</label>
              <input className="wizard-input" type="time"
                value={data.weekdayStart}
                onChange={e => setData(p => ({ ...p, weekdayStart: e.target.value }))} />
            </div>
            <div className="wizard-field">
              <label className="wizard-label">Close</label>
              <input className="wizard-input" type="time"
                value={data.weekdayEnd}
                onChange={e => setData(p => ({ ...p, weekdayEnd: e.target.value }))} />
            </div>
          </div>

          <p className="wizard-section-label">Weekend hours</p>
          <div className="wizard-row">
            <div className="wizard-field">
              <label className="wizard-label">Open</label>
              <input className="wizard-input" type="time"
                value={data.weekendStart}
                onChange={e => setData(p => ({ ...p, weekendStart: e.target.value }))} />
            </div>
            <div className="wizard-field">
              <label className="wizard-label">Close</label>
              <input className="wizard-input" type="time"
                value={data.weekendEnd}
                onChange={e => setData(p => ({ ...p, weekendEnd: e.target.value }))} />
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ─── Step 4: Contact & Alerts ─────────────────────────────────────────────── */
function Step4({ data, setData, errors }) {
  return (
    <>
      <p className="wizard-section-label">Primary contact</p>

      <div className="wizard-field">
        <label className="wizard-label">Contact name <span style={{ color:'var(--red)' }}>*</span></label>
        <input className={`wizard-input${errors.contactName ? ' wizard-input-err' : ''}`}
          value={data.contactName}
          onChange={e => setData(p => ({ ...p, contactName: e.target.value }))}
          placeholder="Your name" />
        {errors.contactName && <p className="wizard-field-error">{errors.contactName}</p>}
      </div>

      <div className="wizard-row">
        <div className="wizard-field">
          <label className="wizard-label">Contact phone <span style={{ color:'var(--red)' }}>*</span></label>
          <input className={`wizard-input${errors.contactPhone ? ' wizard-input-err' : ''}`}
            type="tel" value={data.contactPhone}
            onChange={e => setData(p => ({ ...p, contactPhone: e.target.value }))}
            placeholder="+234 800 000 0000" />
          {errors.contactPhone && <p className="wizard-field-error">{errors.contactPhone}</p>}
        </div>
        <div className="wizard-field">
          <label className="wizard-label">Contact email <span style={{ color:'var(--red)' }}>*</span></label>
          <input className={`wizard-input${errors.contactEmail ? ' wizard-input-err' : ''}`}
            type="email" value={data.contactEmail}
            onChange={e => setData(p => ({ ...p, contactEmail: e.target.value }))}
            placeholder="you@company.com" />
          {errors.contactEmail && <p className="wizard-field-error">{errors.contactEmail}</p>}
        </div>
      </div>

      <p className="wizard-section-label">Booking alerts</p>

      <div className="wizard-toggle-row">
        <div className="wizard-toggle-info">
          <p className="wizard-toggle-title">Email alerts</p>
          <p className="wizard-toggle-desc">Get an email for every new booking and lead.</p>
        </div>
        <Toggle on={data.alertEmail} onToggle={() => setData(p => ({ ...p, alertEmail: !p.alertEmail }))} />
      </div>

      <div className="wizard-toggle-row">
        <div className="wizard-toggle-info">
          <p className="wizard-toggle-title">SMS alerts</p>
          <p className="wizard-toggle-desc">Get a text message for every new booking.</p>
        </div>
        <Toggle on={data.alertSms} onToggle={() => setData(p => ({ ...p, alertSms: !p.alertSms }))} />
      </div>
    </>
  );
}

/* ─── Main wizard ───────────────────────────────────────────────────────────── */
const INITIAL = {
  // Step 1
  companyName: '', dbaName: '', slug: '', city: '', phone: '', website: '', brandColor: '#7c5aed',
  // Step 2
  serviceTypes: [], vehicleTypes: [], fleetSize: '', timezone: '', operatingArea: '',
  // Step 3
  pricingModel: '', currency: '', baseRate: '', is247: true,
  weekdayStart: '08:00', weekdayEnd: '20:00', weekendStart: '09:00', weekendEnd: '18:00',
  // Step 4
  contactName: '', contactPhone: '', contactEmail: '', alertEmail: true, alertSms: true,
};

function validateStep(step, data) {
  const errs = {};
  if (step === 0) {
    if (!data.companyName.trim()) errs.companyName = 'Company name is required';
    if (!data.slug.trim())        errs.slug        = 'Slug is required';
    else if (data.slug.length < 2) errs.slug       = 'Slug must be at least 2 characters';
    if (!data.city.trim())        errs.city        = 'City is required';
    if (!data.phone.trim())       errs.phone       = 'Phone number is required';
  }
  if (step === 1) {
    if (!data.serviceTypes.length) errs.serviceTypes = 'Select at least one service type';
    if (!data.vehicleTypes.length) errs.vehicleTypes = 'Select at least one vehicle type';
    if (!data.timezone)            errs.timezone     = 'Please select your timezone';
  }
  if (step === 2) {
    if (!data.pricingModel) errs.pricingModel = 'Select a pricing model';
    if (!data.currency)     errs.currency     = 'Select a currency';
  }
  if (step === 3) {
    if (!data.contactName.trim())  errs.contactName  = 'Contact name is required';
    if (!data.contactPhone.trim()) errs.contactPhone = 'Contact phone is required';
    if (!data.contactEmail.includes('@')) errs.contactEmail = 'Enter a valid email';
  }
  return errs;
}

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [step,        setStep]        = useState(0);
  const [data,        setData]        = useState(INITIAL);
  const [errors,      setErrors]      = useState({});
  const [globalError, setGlobalError] = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.company_id) { router.replace('/dashboard'); }
  }, [user, loading, router]);

  function next() {
    const errs = validateStep(step, data);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    if (step < STEPS.length - 1) { setStep(s => s + 1); return; }
    submit();
  }

  function back() {
    setErrors({});
    setStep(s => s - 1);
  }

  async function submit() {
    setSubmitting(true); setGlobalError('');
    try {
      const token = pb.authStore.token;
      const payload = {
        companyName:   data.companyName.trim(),
        slug:          data.slug.trim(),
        city:          data.city.trim(),
        phone:         data.phone.trim(),
        dbaName:       data.dbaName.trim(),
        website:       data.website.trim(),
        brandColor:    data.brandColor,
        serviceTypes:  JSON.stringify(data.serviceTypes),
        vehicleTypes:  JSON.stringify(data.vehicleTypes),
        fleetSize:     data.fleetSize ? Number(data.fleetSize) : null,
        timezone:      data.timezone,
        operatingArea: data.operatingArea.trim(),
        pricingModel:  data.pricingModel,
        currency:      data.currency,
        baseRate:      data.baseRate ? Number(data.baseRate) : null,
        is247:         data.is247,
        weekdayStart:  data.is247 ? null : data.weekdayStart,
        weekdayEnd:    data.is247 ? null : data.weekdayEnd,
        weekendStart:  data.is247 ? null : data.weekendStart,
        weekendEnd:    data.is247 ? null : data.weekendEnd,
        contactName:   data.contactName.trim(),
        contactPhone:  data.contactPhone.trim(),
        contactEmail:  data.contactEmail.trim(),
        alertEmail:    data.alertEmail,
        alertSms:      data.alertSms,
      };

      const res = await api('/auth/setup-company', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Company setup failed.');

      try { await pb.collection('users').authRefresh(); } catch {}
      router.replace('/dashboard');
    } catch (err) {
      setGlobalError(err.message);
      setSubmitting(false);
    }
  }

  if (loading || !user) return null;

  const stepDef = STEPS[step];

  return (
    <div className="wizard-page">
      <nav className="wizard-nav">
        <Link href="/" className="wizard-nav-logo">
          <div className="wizard-nav-logo-icon">
            <span className="material-symbols-outlined">flight_takeoff</span>
          </div>
          Arrival
        </Link>
        <span className="wizard-nav-step">
          Step {step + 1} of {STEPS.length} — {stepDef.label}
        </span>
      </nav>

      <div className="wizard-body">
        <div className="wizard-wrap">
          {/* Progress */}
          <div className="wizard-progress">
            {STEPS.map((_, i) => (
              <div key={i} className={`wizard-progress-seg${i < step ? ' done' : i === step ? ' active' : ''}`} />
            ))}
          </div>

          {/* Header */}
          <div className="wizard-header">
            <div className="wizard-step-badge">
              <span className="material-symbols-outlined">{stepDef.icon}</span>
              {stepDef.label}
            </div>
            <h1 className="wizard-title">
              {step === 0 && 'Tell us about your company'}
              {step === 1 && 'Your fleet and services'}
              {step === 2 && 'Pricing and operating hours'}
              {step === 3 && 'Contact details and alerts'}
            </h1>
            <p className="wizard-subtitle">
              {step === 0 && 'This information is used to personalise your dashboard and set up your AI agent.'}
              {step === 1 && 'Help your AI agent understand what services you offer and what vehicles are available.'}
              {step === 2 && 'Set your pricing model so the AI can quote customers accurately during calls.'}
              {step === 3 && 'Who should we notify when new bookings and leads come in?'}
            </p>
          </div>

          {globalError && <div className="wizard-alert wizard-alert-error">{globalError}</div>}

          {/* Step content */}
          <div className="wizard-card">
            {step === 0 && <Step1 data={data} setData={setData} errors={errors} />}
            {step === 1 && <Step2 data={data} setData={setData} errors={errors} />}
            {step === 2 && <Step3 data={data} setData={setData} errors={errors} />}
            {step === 3 && <Step4 data={data} setData={setData} errors={errors} />}
          </div>

          {/* Footer */}
          <div className="wizard-footer">
            <div>
              {step > 0 && (
                <button className="wizard-btn-back" onClick={back}>
                  <span className="material-symbols-outlined">arrow_back</span>
                  Back
                </button>
              )}
            </div>
            <button className="wizard-btn-next" onClick={next} disabled={submitting}>
              {submitting
                ? <><span className="wizard-spinner" /> Setting up…</>
                : step === STEPS.length - 1
                  ? <>Launch my dashboard <span className="material-symbols-outlined">rocket_launch</span></>
                  : <>Next <span className="material-symbols-outlined">arrow_forward</span></>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
