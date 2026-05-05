'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { checkPasswordStrength } from '@/lib/auth';
import { api } from '@/lib/api';
import '@/styles/auth.css';

/* ─── Session storage helpers ─────────────────────────────────────────────── */
const STORAGE_KEY = 'ariva_signup';
function readStorage()   { try { const r = sessionStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } }
function writeStorage(v) { try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch {} }
function clearStorage()  { try { sessionStorage.removeItem(STORAGE_KEY); } catch {} }

/* ─── Step bar ────────────────────────────────────────────────────────────── */
const STEPS = [
  { num: 1, label: 'Account' },
  { num: 2, label: 'Company' },
  { num: 3, label: 'Verify'  },
  { num: 4, label: 'Done'    },
];

function StepBar({ current }) {
  return (
    <div className="auth-steps">
      {STEPS.map((s, i) => {
        const done   = current > s.num;
        const active = current === s.num;
        return (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center' }}>
            <div className="auth-step">
              <div className={`auth-step-dot ${done ? 'auth-step-dot-done' : active ? 'auth-step-dot-active' : 'auth-step-dot-pending'}`}>
                {done ? '✓' : s.num}
              </div>
              <span className={`auth-step-label ${done || active ? 'auth-step-label-active' : 'auth-step-label-pending'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`auth-step-line ${done ? 'auth-step-line-done' : 'auth-step-line-pending'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Shared field component ──────────────────────────────────────────────── */
function Field({ label, type = 'text', value, onChange, onBlur, placeholder, required, helper, error, optional, children }) {
  return (
    <div className="auth-field">
      <label className="auth-label">
        {label}
        {required && <span className="auth-label-required">*</span>}
        {optional && <span className="auth-label-optional">(optional)</span>}
      </label>
      {children ?? (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`auth-input${error ? ' auth-input-err' : ''}`}
        />
      )}
      {error  && <p className="auth-field-error">{error}</p>}
      {helper && !error && <p className="auth-helper">{helper}</p>}
    </div>
  );
}

/* ─── Password strength bar ───────────────────────────────────────────────── */
function PasswordStrengthBar({ password }) {
  const { score, label, color, tips } = checkPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="auth-strength">
      <div className="auth-strength-track">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="auth-strength-seg"
            style={{ background: i <= score ? color : 'rgba(255,255,255,0.1)' }} />
        ))}
      </div>
      <div className="auth-strength-meta">
        <span className="auth-strength-label" style={{ color }}>{label}</span>
        {tips[0] && <span className="auth-strength-tip">{tips[0]}</span>}
      </div>
    </div>
  );
}

/* ─── Step 1 — Account details ────────────────────────────────────────────── */
function Step1({ data, onNext }) {
  const [name,    setName]    = useState(data.name    ?? '');
  const [email,   setEmail]   = useState(data.email   ?? '');
  const [pass,    setPass]    = useState(data.pass    ?? '');
  const [confirm, setConfirm] = useState(data.confirm ?? '');
  const [errors,  setErrors]  = useState({});
  const [emailChecking, setEmailChecking] = useState(false);

  const strength = checkPasswordStrength(pass);

  async function checkEmailExists() {
    if (!email.includes('@')) return;
    setEmailChecking(true);
    try {
      const res  = await api(`/auth/check-email?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      if (json.exists) setErrors(p => ({ ...p, email: 'This email is already registered. Sign in instead.' }));
    } catch { /* fail silently */ }
    finally { setEmailChecking(false); }
  }

  function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!name.trim())         errs.name    = 'Full name is required';
    if (!email.includes('@')) errs.email   = 'Enter a valid email address';
    else if (errors.email)    errs.email   = errors.email;
    if (pass.length < 8)      errs.pass    = 'Password must be at least 8 characters';
    if (strength.score < 2)   errs.pass    = 'Password is too weak — ' + (strength.tips[0] ?? 'choose a stronger password');
    if (pass !== confirm)      errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onNext({ name, email, pass, confirm });
  }

  return (
    <form onSubmit={submit}>
      <Field label="Full name" value={name} onChange={setName} placeholder="Your full name" required error={errors.name} />

      <Field
        label="Email address" type="email" value={email}
        onChange={v => { setEmail(v); if (errors.email) setErrors(p => ({ ...p, email: '' })); }}
        onBlur={checkEmailExists}
        placeholder="you@company.com" required error={errors.email}
        helper={emailChecking ? 'Checking availability…' : undefined}
      />

      <div className="auth-field">
        <label className="auth-label">
          Password <span className="auth-label-required">*</span>
        </label>
        <input
          type="password" value={pass}
          onChange={e => setPass(e.target.value)}
          placeholder="Create a strong password"
          className={`auth-input${errors.pass ? ' auth-input-err' : ''}`}
        />
        <PasswordStrengthBar password={pass} />
        {errors.pass && <p className="auth-field-error">{errors.pass}</p>}
      </div>

      <Field
        label="Confirm password" type="password" value={confirm}
        onChange={setConfirm} placeholder="Repeat your password"
        required error={errors.confirm}
      />

      <button type="submit" className="auth-btn auth-btn-primary">Continue →</button>

      <div className="auth-links-center" style={{ marginTop: 20 }}>
        <span className="auth-muted">
          Already have an account? <Link href="/login">Sign in</Link>
        </span>
      </div>
    </form>
  );
}

/* ─── Step 2 — Company setup ──────────────────────────────────────────────── */
function Step2({ data, onNext, onBack }) {
  const [companyName,  setCompanyName]  = useState(data.companyName ?? '');
  const [slug,         setSlug]         = useState(data.slug        ?? '');
  const [city,         setCity]         = useState(data.city        ?? 'Lagos');
  const [phone,        setPhone]        = useState(data.phone       ?? '');
  const [logo,         setLogo]         = useState(null);
  const [logoPreview,  setLogoPreview]  = useState(null);
  const [errors,       setErrors]       = useState({});
  const [slugChecking, setSlugChecking] = useState(false);

  function handleName(v) {
    setCompanyName(v);
    const derived = v.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    setSlug(derived);
    if (errors.slug) setErrors(p => ({ ...p, slug: '' }));
  }

  async function checkSlugExists() {
    if (!slug.trim()) return;
    setSlugChecking(true);
    try {
      const res  = await api(`/auth/check-slug?slug=${encodeURIComponent(slug)}`);
      const json = await res.json();
      if (json.exists) setErrors(p => ({ ...p, slug: 'This slug is already taken. Try a different company name.' }));
    } catch { /* fail silently */ }
    finally { setSlugChecking(false); }
  }

  function validatePhone() {
    if (!phone.trim()) return;
    const digits = phone.replace(/\D/g, '');
    if (!phone.startsWith('+') || digits.length < 7)
      setErrors(p => ({ ...p, phone: 'Enter a valid phone number starting with + (e.g. +234…)' }));
  }

  function handleLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setErrors(p => ({ ...p, logo: 'Logo must be under 2MB' })); return; }
    setLogo(file);
    setLogoPreview(URL.createObjectURL(file));
    setErrors(p => ({ ...p, logo: null }));
  }

  function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!companyName.trim()) errs.companyName = 'Company name is required';
    if (!slug.trim())        errs.slug        = 'Slug is required';
    else if (errors.slug)    errs.slug        = errors.slug;
    if (errors.phone)        errs.phone       = errors.phone;
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onNext({ companyName, slug, city, phone, logo });
  }

  return (
    <form onSubmit={submit}>
      <Field
        label="Company name" value={companyName} onChange={handleName}
        onBlur={checkSlugExists} placeholder="e.g. Blessed Global Transportation"
        required error={errors.companyName}
      />

      <Field
        label="URL slug" value={slug}
        onChange={v => { setSlug(v); if (errors.slug) setErrors(p => ({ ...p, slug: '' })); }}
        onBlur={checkSlugExists} placeholder="e.g. blessed-global" required
        error={errors.slug}
        helper={slugChecking ? 'Checking availability…' : 'Lowercase letters, numbers and hyphens only'}
      />

      <div className="auth-field-row">
        <Field label="City" value={city} onChange={setCity} placeholder="e.g. Lagos" />
        <Field
          label="Business phone" value={phone}
          onChange={v => { setPhone(v); if (errors.phone) setErrors(p => ({ ...p, phone: '' })); }}
          onBlur={validatePhone} placeholder="+234…" error={errors.phone}
        />
      </div>

      {/* Logo upload */}
      <div className="auth-field">
        <label className="auth-label">
          Company logo <span className="auth-label-optional">max 2MB</span>
        </label>
        <div className="auth-logo-upload">
          {logoPreview
            ? <img src={logoPreview} alt="Logo" className="auth-logo-preview" />
            : <div className="auth-logo-placeholder">🏢</div>
          }
          <label className="auth-logo-upload-btn">
            {logoPreview ? 'Change logo' : 'Upload logo'}
            <input type="file" accept="image/*" onChange={handleLogo} style={{ display: 'none' }} />
          </label>
          {logoPreview && (
            <button type="button" className="auth-logo-remove"
              onClick={() => { setLogo(null); setLogoPreview(null); }}>
              Remove
            </button>
          )}
        </div>
        {errors.logo && <p className="auth-field-error">{errors.logo}</p>}
      </div>

      <button type="submit" className="auth-btn auth-btn-primary">Continue →</button>
      <button type="button" className="auth-btn auth-btn-secondary" onClick={onBack}>← Back</button>
    </form>
  );
}

/* ─── Step 3 — Verify email ───────────────────────────────────────────────── */
function Step3({ email, onNext, onResend }) {
  const [resent,  setResent]  = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleResend() {
    setResent(false);
    await onResend();
    setResent(true);
    setTimeout(() => setResent(false), 5000);
  }

  return (
    <div>
      <div className="auth-verify-email">
        <span className="auth-verify-icon">📧</span>
        <h3 className="auth-verify-title">Check your inbox</h3>
        <p className="auth-verify-body">
          We sent a verification link to<br />
          <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{email}</strong>
        </p>
        <p className="auth-verify-note">
          Click the link in your email to verify your account, then come back here and click Continue.
        </p>
      </div>

      <button
        type="button"
        className="auth-btn auth-btn-primary"
        disabled={loading}
        onClick={() => onNext()}
      >
        I've verified — continue →
      </button>

      <div className="auth-resend-row">
        <button
          className={`auth-btn-link${resent ? ' auth-btn-link-green' : ''}`}
          onClick={handleResend}
        >
          {resent ? '✓ Verification email sent again' : "Didn't get the email? Resend"}
        </button>
      </div>

      <p className="auth-helper" style={{ textAlign: 'center', marginTop: 10 }}>
        Check your spam folder if you don't see it within 2 minutes.
      </p>
    </div>
  );
}

/* ─── Step 4 — Done ───────────────────────────────────────────────────────── */
function Step4({ companyName }) {
  const router = useRouter();
  return (
    <div className="auth-state">
      <span className="auth-state-icon">🎉</span>
      <h2 className="auth-state-title">You're all set!</h2>
      <p className="auth-state-body">
        <strong>{companyName}</strong> is ready.<br />
        Add pricing rules, connect your Twilio number, then make your first test call.
      </p>
      <button
        className="auth-btn auth-btn-primary"
        style={{ marginTop: 0 }}
        onClick={() => { clearStorage(); router.push('/login'); }}
      >
        Sign in to your dashboard →
      </button>
      <p className="auth-helper" style={{ textAlign: 'center', marginTop: 12 }}>
        Use the email and password you just created.
      </p>
    </div>
  );
}

/* ─── Main signup page ────────────────────────────────────────────────────── */
export default function SignupPage() {
  const [step,       setStep]       = useState(1);
  const [allData,    setAllData]    = useState({});
  const [hydrated,   setHydrated]   = useState(false);
  const [error,      setError]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = readStorage();
    if (saved) {
      const data       = saved.allData ?? {};
      const targetStep = (saved.step === 2 && !data.pass) ? 1 : (saved.step ?? 1);
      setAllData(data);
      setStep(targetStep);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const { pass, confirm, ...safeData } = allData;
    writeStorage({ step, allData: safeData });
  }, [step, allData, hydrated]);

  async function createAccountAndCompany(companyData = {}) {
    setSubmitting(true); setError('');
    try {
      const payload = { ...allData, ...companyData };
      const res = await api('/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:        payload.name,
          email:       payload.email,
          password:    payload.pass,
          companyName: payload.companyName,
          slug:        payload.slug,
          city:        payload.city  ?? '',
          phone:       payload.phone ?? '',
          plan:        'starter',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Registration failed. Please try again.');
      setStep(3);
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function resendVerification() {
    await api('/auth/resend-verification', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: allData.email }),
    });
  }

  const titles = {
    1: { title: 'Create your account', sub: 'Start your free Ariva trial'          },
    2: { title: 'Set up your company', sub: 'Tell us about your business'           },
    3: { title: 'Verify your email',   sub: 'One last step before you get started'  },
    4: { title: '',                    sub: ''                                       },
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <nav className="auth-nav">
        <Link href="/" className="auth-nav-logo">
          <div className="auth-nav-logo-icon">✈</div>
          Ariva
        </Link>
        <span className="auth-nav-right">
          Have an account? <Link href="/login">Sign in</Link>
        </span>
      </nav>

      <div className="auth-body">
        <div className="auth-wrap-wide">

          {step < 4 && <StepBar current={step} />}

          <div className="auth-card">

            {step < 4 && (
              <div className="auth-header">
                <h1 className="auth-title">{titles[step].title}</h1>
                <p className="auth-subtitle">{titles[step].sub}</p>
              </div>
            )}

            {error && <div className="auth-alert auth-alert-error">{error}</div>}
            {submitting && (
              <div className="auth-alert auth-alert-info">
                Creating your account — please wait…
              </div>
            )}

            {step === 1 && (
              <Step1
                data={allData}
                onNext={d => { setAllData(p => ({ ...p, ...d })); setStep(2); }}
              />
            )}
            {step === 2 && (
              <Step2
                data={allData}
                onNext={d => {
                  const merged = { ...allData, ...d };
                  setAllData(merged);
                  createAccountAndCompany(merged);
                }}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && (
              <Step3
                email={allData.email}
                onNext={() => setStep(4)}
                onResend={resendVerification}
              />
            )}
            {step === 4 && <Step4 companyName={allData.companyName} />}

          </div>

          {step < 4 && (
            <p className="auth-legal">
              By signing up you agree to our Terms of Service and Privacy Policy.
            </p>
          )}

        </div>
      </div>
    </div>
  );
}
