'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import pb from '@/lib/pb';
import '@/styles/auth.css';

function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [companyName, setCompanyName] = useState('');
  const [slug,        setSlug]        = useState('');
  const [city,        setCity]        = useState('');
  const [phone,       setPhone]       = useState('');

  const [slugEdited,    setSlugEdited]    = useState(false);
  const [slugChecking,  setSlugChecking]  = useState(false);
  const [slugError,     setSlugError]     = useState('');
  const [errors,        setErrors]        = useState({});
  const [globalError,   setGlobalError]   = useState('');
  const [submitting,    setSubmitting]    = useState(false);

  // Redirect away if user already has a company
  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.company_id) { router.replace('/dashboard'); }
  }, [user, loading, router]);

  // Auto-generate slug from company name
  useEffect(() => {
    if (!slugEdited && companyName) {
      setSlug(slugify(companyName));
    }
  }, [companyName, slugEdited]);

  async function checkSlug(value) {
    const s = value.trim();
    if (!s || s.length < 2) return;
    setSlugChecking(true);
    try {
      const res  = await api(`/auth/check-slug?slug=${encodeURIComponent(s)}`);
      const json = await res.json();
      if (json.exists) setSlugError('This slug is already taken. Choose another.');
      else setSlugError('');
    } catch {}
    finally { setSlugChecking(false); }
  }

  function handleSlugChange(v) {
    const clean = v.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(clean);
    setSlugEdited(true);
    setSlugError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!companyName.trim())        errs.companyName = 'Company name is required';
    if (!slug.trim())               errs.slug        = 'Slug is required';
    else if (slug.length < 2)       errs.slug        = 'Slug must be at least 2 characters';
    else if (slugError)             errs.slug        = slugError;
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true); setGlobalError('');
    try {
      const token = pb.authStore.token;
      const res   = await api('/auth/setup-company', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ companyName: companyName.trim(), slug: slug.trim(), city: city.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Company setup failed.');

      // Refresh PocketBase session so user.company_id is populated
      try { await pb.collection('users').authRefresh(); } catch {}

      router.replace('/dashboard');
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) return null;

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
      </nav>

      <div className="auth-body">
        <div className="auth-wrap" style={{ maxWidth: 480 }}>
          <div className="auth-card">
            <div className="auth-header">
              <span className="auth-icon">🏢</span>
              <h1 className="auth-title">Set up your company</h1>
              <p className="auth-subtitle">
                Welcome{user.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}! Tell us about your business to finish setting up Ariva.
              </p>
            </div>

            {globalError && <div className="auth-alert auth-alert-error">{globalError}</div>}

            <form onSubmit={handleSubmit}>
              {/* Company name */}
              <div className="auth-field">
                <label className="auth-label">
                  Company name <span className="auth-label-required">*</span>
                </label>
                <input
                  className={`auth-input${errors.companyName ? ' auth-input-err' : ''}`}
                  value={companyName}
                  onChange={e => { setCompanyName(e.target.value); setErrors(p => ({ ...p, companyName: '' })); }}
                  placeholder="Lagos Luxury Rides"
                  autoFocus
                />
                {errors.companyName && <p className="auth-field-error">{errors.companyName}</p>}
              </div>

              {/* Slug */}
              <div className="auth-field">
                <label className="auth-label">
                  Company slug <span className="auth-label-required">*</span>
                </label>
                <input
                  className={`auth-input${errors.slug || slugError ? ' auth-input-err' : ''}`}
                  value={slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  onBlur={() => checkSlug(slug)}
                  placeholder="lagos-luxury-rides"
                />
                {(errors.slug || slugError)
                  ? <p className="auth-field-error">{errors.slug || slugError}</p>
                  : slugChecking
                    ? <p className="auth-helper">Checking availability…</p>
                    : slug && !slugError && <p className="auth-helper">ariva.io/{slug}</p>
                }
              </div>

              {/* City + Phone on same row */}
              <div className="auth-field-row">
                <div className="auth-field" style={{ marginBottom: 0 }}>
                  <label className="auth-label">
                    City <span className="auth-label-optional">(optional)</span>
                  </label>
                  <input
                    className="auth-input"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Lagos"
                  />
                </div>

                <div className="auth-field" style={{ marginBottom: 0 }}>
                  <label className="auth-label">
                    Phone <span className="auth-label-optional">(optional)</span>
                  </label>
                  <input
                    className="auth-input"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                    type="tel"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="auth-btn auth-btn-primary"
                disabled={submitting}
                style={{ marginTop: 24 }}
              >
                {submitting ? 'Setting up…' : 'Launch my dashboard →'}
              </button>
            </form>
          </div>

          <p className="auth-legal">
            You can update your company details any time in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
