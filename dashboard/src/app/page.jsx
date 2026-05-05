'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useScrollAnimation, useScrollAnimationAll } from '@/hooks/useScrollAnimation';
import { useCountUp } from '@/hooks/useCountUp';
import '@/styles/tokens.css';
import '@/styles/animations.css';
import '@/styles/landing.css';

/* ─── Data ───────────────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: 'Features',     href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing',      href: '#pricing' },
  { label: 'FAQ',          href: '#faq' },
];

const TRANSPORT_TYPES = [
  { icon: 'directions_bus',  label: 'Coach Hire' },
  { icon: 'airport_shuttle', label: 'Minibus' },
  { icon: 'flight',          label: 'Airport Transfer' },
  { icon: 'directions_car',  label: 'Executive Cars' },
  { icon: 'star',            label: 'Chauffeur Service' },
  { icon: 'celebration',     label: 'Party Bus' },
  { icon: 'local_hospital',  label: 'Medical Transport' },
  { icon: 'rv_hookup',       label: 'SUV Fleet' },
  { icon: 'local_taxi',      label: 'Taxi Dispatch' },
  { icon: 'diamond',         label: 'VIP Transport' },
];

const PAIN_POINTS = [
  {
    icon: 'phone_disabled',
    title: 'Calls dropped, revenue gone',
    body: "Every missed call at 2am is a booking that went to your competitor. Your phone can't work 24/7 — your AI can.",
    stat: '73% of callers never call back',
  },
  {
    icon: 'assignment_late',
    title: 'Manual booking = costly mistakes',
    body: 'Double-bookings, wrong pickup times, scribbled notes. One dispatcher error can lose you the client forever.',
    stat: '1 in 5 manual bookings has an error',
  },
  {
    icon: 'sentiment_very_dissatisfied',
    title: 'Customers expect instant confirmation',
    body: "Saying \"we'll call you back\" is no longer acceptable. Customers book the service that responds in 10 seconds.",
    stat: '68% expect same-minute confirmation',
  },
];

const HOW_IT_WORKS = [
  { step: '01', icon: 'call',          title: 'Customer calls your number',          body: "Your Twilio number rings. Aria answers instantly — in your company's voice, with your pricing, every time." },
  { step: '02', icon: 'psychology',    title: 'AI captures every detail',            body: 'Aria asks the right questions: pickup, destination, date, time, passenger count, vehicle preference — then confirms pricing live on the call.' },
  { step: '03', icon: 'sms',           title: 'Customer gets instant SMS',            body: "A confirmation SMS with full trip details and a cancellation link lands on the customer's phone within seconds of the call ending." },
  { step: '04', icon: 'notifications', title: 'Your team gets notified',              body: 'Every admin in your company receives an SMS alert. Your dashboard updates in real time.' },
  { step: '05', icon: 'monitoring',    title: 'You run the business, not the phones', body: 'Track revenue, manage drivers, review calls, and grow — while Aria handles every inbound booking automatically.' },
];

const FEATURES = [
  { tab: 'AI Voice',  icon: 'mic',          title: '24/7 AI Voice Agent',     body: 'GPT-4o powered voice agent answers every call, understands natural language, handles complex multi-leg bookings, and knows your pricing inside out.' },
  { tab: 'AI Voice',  icon: 'language',     title: 'Multi-language Ready',     body: 'Aria can converse in English and adapt to local dialects and phrasing — perfect for regional transport companies.' },
  { tab: 'AI Voice',  icon: 'bolt',         title: 'Sub-2s Response Time',     body: 'No IVR menus, no hold music. The call is answered and the conversation starts in under 2 seconds.' },
  { tab: 'Dashboard', icon: 'bar_chart',    title: 'Real-time Dashboard',      body: 'Live view of all active trips, upcoming bookings, and driver status. Everything updates the moment a call ends.' },
  { tab: 'Dashboard', icon: 'file_download',title: 'CSV & PDF Exports',        body: 'Export bookings, leads, and revenue data to CSV or generate customer invoices as PDFs with a single click.' },
  { tab: 'Dashboard', icon: 'group',        title: 'Multi-user Roles',         body: 'Super admin, admin, and user roles. Each person sees exactly what they need — nothing more, nothing less.' },
  { tab: 'Drivers',   icon: 'map',          title: 'Smart Driver Assignment',  body: 'Assign drivers to trips from the dashboard. Conflict detection prevents double-booking any driver for overlapping trips.' },
  { tab: 'Drivers',   icon: 'notifications',title: 'Driver Notifications',     body: "Drivers receive SMS when they're assigned a trip. Includes pickup time, address, and passenger details." },
  { tab: 'Drivers',   icon: 'flight',       title: 'Flight Tracking',          body: 'Track inbound flights and auto-adjust pickup times when a flight is delayed. No more stranded passengers.' },
  { tab: 'Revenue',   icon: 'payments',     title: 'Dynamic Pricing Rules',    body: 'Set hourly rates, flat fares, or route-specific pricing. Aria quotes the correct price on every call automatically.' },
  { tab: 'Revenue',   icon: 'trending_up',  title: 'Revenue Analytics',        body: 'See monthly revenue, peak booking hours, top routes, and conversion rate from lead to confirmed booking.' },
  { tab: 'Revenue',   icon: 'credit_card',  title: 'Paystack Payments',        body: 'Accept card payments for subscription plans. Automated plan upgrades keep your team operational without manual invoicing.' },
];

const PLANS = [
  {
    name: 'Starter',
    price: { monthly: 0, annual: 0 },
    desc: 'Get started with AI booking — no credit card required.',
    cta: 'Start free',
    href: '/signup',
    features: ['50 bookings/month', '1 user', 'AI voice answering', 'SMS confirmations', 'Basic dashboard', 'Email support'],
    highlight: false,
  },
  {
    name: 'Professional',
    price: { monthly: 49, annual: 39 },
    desc: 'Everything a growing transport business needs.',
    cta: 'Start 14-day trial',
    href: '/signup?plan=professional',
    features: ['Unlimited bookings', '10 users', 'Driver management', 'Flight tracking', 'Revenue analytics', 'PDF invoices', 'CSV exports', 'Priority support'],
    highlight: true,
    badge: 'Most popular',
  },
  {
    name: 'Enterprise',
    price: { monthly: null, annual: null },
    desc: 'Custom pricing for large fleets and white-label.',
    cta: 'Contact us',
    href: 'mailto:hello@arrival.ai',
    features: ['Unlimited everything', 'Unlimited users', 'Custom AI persona', 'White-label dashboard', 'SLA guarantee', 'Dedicated account manager'],
    highlight: false,
  },
];

const TESTIMONIALS = [
  {
    quote: "We were losing 30-40 calls a week to voicemail. Arrival turned those missed calls into $8,000 in new bookings in the first month. It pays for itself a hundred times over.",
    name: 'Marcus Eze', role: 'Owner, Premier Rides London', avatar: 'ME', rating: 5,
  },
  {
    quote: "My dispatcher used to spend 6 hours a day just answering phones. Now he focuses on operations. Aria handles the calls, and our customer satisfaction scores went up 22%.",
    name: 'Chidinma Okafor', role: 'Operations Manager, Abuja Executive Cars', avatar: 'CO', rating: 5,
  },
  {
    quote: "The flight tracking feature alone saved us 3 complaints in the first week. When a flight delays, the pickup adjusts automatically. Our airport transfer clients are amazed.",
    name: 'David Mensah', role: 'Fleet Manager, AccraTrans', avatar: 'DM', rating: 5,
  },
];

const FAQS = [
  { q: "How does Aria sound on calls? Can customers tell it's AI?", a: "Aria is built on GPT-4o with natural speech synthesis — it sounds remarkably human, responds conversationally, and handles interruptions naturally. Most customers complete the booking without realising they're speaking to an AI." },
  { q: "What happens when a caller asks something Aria doesn't know?", a: "Aria is trained on your pricing rules, vehicle types, and service area. For anything outside that scope, Aria politely notes the question and flags it as a lead in your dashboard for a human to follow up." },
  { q: "Can I keep my existing phone number?", a: "You can port your existing number to Twilio, or we can provision a new local number for your city. The setup takes about 15 minutes." },
  { q: "What if I already have a dispatcher?", a: "Aria handles overflow — all the calls your dispatcher can't get to, plus overnight and weekend traffic. Your dispatcher spends time on complex jobs, not routine bookings." },
  { q: "How is multi-tenant isolation handled?", a: "Each company gets a completely isolated data environment. One company cannot see another's bookings, customers, drivers, or revenue data — by design, at the database query level." },
  { q: "Is my data secure?", a: "All data is stored in PocketBase on Railway with encrypted connections. SMS is handled by Twilio (SOC 2). Payments go through Paystack's PCI-compliant infrastructure. We never store card numbers." },
  { q: "Can I add multiple admins to my company?", a: "Yes. The Professional plan allows up to 10 users per company. Each admin can receive SMS booking alerts on their own phone number." },
  { q: "How do I cancel a booking on behalf of a customer?", a: "You can cancel from the dashboard in one click. The customer also receives a unique cancellation link in their confirmation SMS, so they can self-cancel without calling." },
  { q: "What's the difference between Starter and Professional?", a: "Starter is free with a 50-booking/month cap and 1 user. Professional removes all limits, unlocks driver management, flight tracking, analytics, and supports up to 10 users." },
  { q: "Do you offer a free trial for Professional?", a: "Yes — 14 days free on Professional, no credit card required. If you need more time to evaluate, just contact us." },
];

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function StarRating({ rating }) {
  return (
    <div className="star-rating" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 16 16" fill={i < rating ? '#F59E0B' : 'none'} stroke={i < rating ? '#F59E0B' : '#D1D9E6'}>
          <path d="M8 1.5l1.93 3.91 4.32.63-3.12 3.04.73 4.3L8 11.27l-3.86 2.11.73-4.3L1.75 5.04l4.32-.63L8 1.5z" strokeWidth="1.2"/>
        </svg>
      ))}
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? 'faq-open' : ''}`}>
      <button className="faq-question" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>{q}</span>
        <span className="faq-chevron" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 7.5l5 5 5-5"/>
          </svg>
        </span>
      </button>
      {open && <div className="faq-answer"><p>{a}</p></div>}
    </div>
  );
}

/* ─── ROI Calculator ──────────────────────────────────────────────────────── */

function ROICalculator() {
  const [calls,      setCalls]      = useState(40);
  const [bookingVal, setBookingVal] = useState(85);
  const [missedPct,  setMissedPct]  = useState(30);
  const ref = useScrollAnimation();

  const missedCalls    = Math.round(calls * (missedPct / 100));
  const monthlyLoss    = missedCalls * bookingVal * 4.3;
  const arrivalRecovery = Math.round(monthlyLoss * 0.85);
  const planCost       = 49;
  const monthlyROI     = arrivalRecovery - planCost;
  const yearlyLoss     = monthlyLoss * 12;

  const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <section className="section roi-section" id="roi-calculator">
      <div className="container">
        <div ref={ref} className="section-header anim-ready">
          <div className="section-eyebrow">Revenue at risk</div>
          <h2 className="section-title">How much are you losing right now?</h2>
          <p className="section-subtitle">
            Transport businesses lose thousands every month to missed calls. Drag the sliders to see your exact exposure — then see what Arrival recovers.
          </p>
        </div>

        <div className="roi-layout">
          <div className="roi-controls">
            {[
              { label: 'Inbound calls per week', value: calls, set: setCalls, min: 5, max: 200, step: 5, format: v => v, rangeL: '5', rangeR: '200+' },
              { label: 'Average booking value',  value: bookingVal, set: setBookingVal, min: 20, max: 500, step: 5, format: v => `$${v}`, rangeL: '$20', rangeR: '$500' },
              { label: 'Calls you currently miss', value: missedPct, set: setMissedPct, min: 5, max: 80, step: 5, format: v => `${v}%`, rangeL: '5%', rangeR: '80%' },
            ].map(({ label, value, set, min, max, step, format, rangeL, rangeR }) => (
              <div key={label} className="roi-slider-group">
                <div className="roi-slider-header">
                  <label>{label}</label>
                  <span className="roi-value">{format(value)}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={value}
                  onChange={e => set(+e.target.value)} className="roi-slider" />
                <div className="roi-slider-range"><span>{rangeL}</span><span>{rangeR}</span></div>
              </div>
            ))}

            <div className="roi-insight">
              <span className="roi-insight-icon"><span className="material-symbols-outlined">bar_chart</span></span>
              <p>You miss roughly <strong>{missedCalls} calls/week</strong> — that's <strong>{Math.round(missedCalls * 4.3)} per month</strong> ringing out unanswered.</p>
            </div>
          </div>

          <div className="roi-results">
            <div className="roi-card roi-card-loss">
              <div className="roi-card-label">Monthly revenue at risk</div>
              <div className="roi-card-amount">{fmt(monthlyLoss)}</div>
              <div className="roi-card-sub">Without Arrival — {fmt(yearlyLoss)}/yr going to competitors</div>
            </div>

            <div className="roi-card roi-card-recovery">
              <div className="roi-card-label">Monthly recovery with Arrival</div>
              <div className="roi-card-amount">{fmt(arrivalRecovery)}</div>
              <div className="roi-card-sub">Aria captures ~85% of missed calls as confirmed bookings</div>
            </div>

            <div className="roi-card roi-card-profit">
              <div className="roi-card-label">Net monthly profit (after ${planCost}/mo plan)</div>
              <div className="roi-card-amount roi-profit-amount">{fmt(monthlyROI)}</div>
              <div className="roi-card-sub">ROI: {Math.round(monthlyROI / planCost)}× your Arrival subscription</div>
            </div>

            <Link href="/signup?plan=professional" className="roi-cta-btn">
              Recover {fmt(arrivalRecovery)} this month
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9h12M9 3l6 6-6 6"/></svg>
            </Link>

            <p className="roi-disclaimer">Estimates based on 85% call-capture rate and 100% booking conversion on captured calls. Actual results vary by business.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Animated stat ───────────────────────────────────────────────────────── */

function AnimatedStat({ value, suffix = '', prefix = '', label, enabled }) {
  const count = useCountUp(value, { enabled, duration: 1600 });
  return (
    <div className="hero-stat">
      <span className="hero-stat-number">{prefix}{Math.round(count)}{suffix}</span>
      <span className="hero-stat-label">{label}</span>
    </div>
  );
}

/* ─── Floating notification ───────────────────────────────────────────────── */

function FloatingNotif({ icon, text, sub, delay = 0, side = 'right', style = {} }) {
  return (
    <div className={`floating-notif floating-notif-${side}`} style={{ animationDelay: `${delay}s`, ...style }}>
      <span className="floating-notif-icon">
        <span className="material-symbols-outlined">{icon}</span>
      </span>
      <div>
        <div className="floating-notif-text">{text}</div>
        {sub && <div className="floating-notif-sub">{sub}</div>}
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const [scrolled,         setScrolled]         = useState(false);
  const [menuOpen,         setMenuOpen]         = useState(false);
  const [billingAnnual,    setBillingAnnual]    = useState(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState('AI Voice');
  const [statsVisible,     setStatsVisible]     = useState(false);

  const statsRef = useRef(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setStatsVisible(true); },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const painRef         = useScrollAnimationAll('.anim-item');
  const howRef          = useScrollAnimationAll('.anim-item');
  const featRef         = useScrollAnimationAll('.anim-item');
  const pricingRef      = useScrollAnimationAll('.anim-item');
  const testimonialsRef = useScrollAnimationAll('.anim-item');
  const faqRef          = useScrollAnimationAll('.anim-item');
  const ctaRef          = useScrollAnimation();

  const featureTabs     = [...new Set(FEATURES.map(f => f.tab))];
  const visibleFeatures = FEATURES.filter(f => f.tab === activeFeatureTab);

  return (
    <>
      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <nav className={`nav ${scrolled ? 'nav-scrolled' : ''}`}>
        <div className="nav-inner">
          <Link href="/" className="nav-logo" onClick={() => setMenuOpen(false)}>
            <span className="nav-logo-icon">
              <span className="material-symbols-outlined">flight_takeoff</span>
            </span>
            <span className="nav-logo-text">Arrival</span>
          </Link>

          <ul className="nav-links">
            {NAV_LINKS.map(l => (
              <li key={l.label}><a href={l.href} className="nav-link">{l.label}</a></li>
            ))}
          </ul>

          <div className="nav-actions">
            <Link href="/login"  className="nav-btn-ghost">Log in</Link>
            <Link href="/signup" className="nav-btn-primary">Start free</Link>
          </div>

          <button
            className={`nav-hamburger ${menuOpen ? 'nav-hamburger-open' : ''}`}
            onClick={() => setMenuOpen(o => !o)}
            aria-expanded={menuOpen}
            aria-label="Toggle menu"
          >
            <span/><span/><span/>
          </button>
        </div>

        {menuOpen && (
          <div className="nav-mobile">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} className="nav-mobile-link" onClick={() => setMenuOpen(false)}>{l.label}</a>
            ))}
            <div className="nav-mobile-actions">
              <Link href="/login"  className="nav-btn-ghost"   onClick={() => setMenuOpen(false)}>Log in</Link>
              <Link href="/signup" className="nav-btn-primary" onClick={() => setMenuOpen(false)}>Start free</Link>
            </div>
          </div>
        )}
      </nav>

      <main>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="hero">
          <div className="hero-orbs" aria-hidden="true">
            <div className="orb hero-orb-1"/>
            <div className="orb hero-orb-2"/>
            <div className="orb hero-orb-3"/>
          </div>

          <div className="container hero-container">
            <div className="hero-content animate-fade-up">
              <div className="hero-eyebrow">
                <span className="hero-eyebrow-dot animate-pulse"/>
                AI-powered booking for transport companies
              </div>

              <h1 className="hero-title">
                Your AI receptionist that{' '}
                <span className="text-gradient-animated">never misses a call</span>
              </h1>

              <p className="hero-subtitle">
                Aria answers every inbound call, captures booking details, quotes the price, and confirms the trip — all while you sleep. Set up in 15 minutes.
              </p>

              <div className="hero-actions">
                <Link href="/signup" className="btn-hero-primary">
                  Start free — no card needed
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 9h12M9 3l6 6-6 6"/></svg>
                </Link>
                <a href="#how-it-works" className="btn-hero-ghost">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="9" r="7"/><path d="M7 6.5l4 2.5-4 2.5V6.5z" fill="currentColor" stroke="none"/></svg>
                  See how it works
                </a>
              </div>

              <div className="hero-trust">
                <span className="hero-trust-item"><span className="material-symbols-outlined">check</span>50 bookings free</span>
                <span className="hero-trust-item"><span className="material-symbols-outlined">check</span>No setup fees</span>
                <span className="hero-trust-item"><span className="material-symbols-outlined">check</span>Cancel anytime</span>
              </div>
            </div>

            <div className="hero-visual animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="hero-mockup">
                <div className="hero-mockup-bar">
                  <span/><span/><span/>
                  <div className="hero-mockup-title">Arrival Dashboard</div>
                </div>
                <div className="hero-mockup-content">
                  <div className="hero-mockup-stat-row">
                    <div className="hero-mockup-stat"><div className="hm-label">Today</div><div className="hm-val hm-green">12</div></div>
                    <div className="hero-mockup-stat"><div className="hm-label">Active</div><div className="hm-val hm-blue">3</div></div>
                    <div className="hero-mockup-stat"><div className="hm-label">Revenue</div><div className="hm-val hm-purple">$1,840</div></div>
                  </div>
                  <div className="hero-mockup-booking">
                    <div className="hm-booking-row">
                      <div className="hm-badge hm-badge-confirmed">Confirmed</div>
                      <div className="hm-ref">BK-00042</div>
                    </div>
                    <div className="hm-booking-detail"><span className="material-symbols-outlined">location_on</span>Heathrow T2 → Canary Wharf</div>
                    <div className="hm-booking-detail"><span className="material-symbols-outlined">schedule</span>15 Jan · 06:30 · Executive Saloon</div>
                  </div>
                  <div className="hero-mockup-booking">
                    <div className="hm-booking-row">
                      <div className="hm-badge hm-badge-trip">On trip</div>
                      <div className="hm-ref">BK-00041</div>
                    </div>
                    <div className="hm-booking-detail"><span className="material-symbols-outlined">location_on</span>City Airport → Mayfair</div>
                    <div className="hm-booking-detail"><span className="material-symbols-outlined">schedule</span>15 Jan · 05:00 · VIP Mercedes</div>
                  </div>
                  <div className="hero-mockup-aria">
                    <div className="aria-pulse"><span/><span/><span/></div>
                    <div className="aria-text">Aria is live · answering calls</div>
                  </div>
                </div>
              </div>

              <FloatingNotif icon="check_circle"         text="SMS sent to customer"   sub="Confirmation + cancel link"  delay={0.8} side="right" style={{ top: '38%' }} />
              <FloatingNotif icon="call"                 text="New booking — BK-00043" sub="Gatwick → Kensington · $110" delay={2.2} side="right" style={{ top: '64%' }} />
              <FloatingNotif icon="notifications_active" text="Admin alerted"          sub="+44 7700 900123"             delay={3.8} side="left"  style={{ top: '55%' }} />
            </div>
          </div>

          <div className="hero-stats-bar" ref={statsRef}>
            <div className="container">
              <div className="hero-stats">
                <AnimatedStat value={5000} suffix="+"  label="Bookings automated" enabled={statsVisible} />
                <div className="hero-stat-divider"/>
                <AnimatedStat value={98}   suffix="%"  label="Call capture rate"  enabled={statsVisible} />
                <div className="hero-stat-divider"/>
                <AnimatedStat value={2}    suffix="s"  label="Avg response time"  enabled={statsVisible} />
                <div className="hero-stat-divider"/>
                <AnimatedStat value={24}   suffix="/7" label="Always answering"   enabled={statsVisible} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Marquee ───────────────────────────────────────────────────── */}
        <section className="marquee-section" aria-label="Supported transport types">
          <div className="marquee-track">
            <div className="marquee-inner animate-marquee">
              {[...TRANSPORT_TYPES, ...TRANSPORT_TYPES].map((t, i) => (
                <span key={i} className="marquee-item">
                  <span className="material-symbols-outlined">{t.icon}</span>{t.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pain Points ───────────────────────────────────────────────── */}
        <section className="section" id="pain-points" ref={painRef}>
          <div className="container">
            <div className="section-header anim-item">
              <div className="section-eyebrow">The problem</div>
              <h2 className="section-title">Your phone is costing you money</h2>
              <p className="section-subtitle">Transport businesses run on inbound calls. Every unanswered call is a booking, a repeat customer, and a referral — gone.</p>
            </div>
            <div className="pain-grid">
              {PAIN_POINTS.map((p, i) => (
                <div key={i} className={`pain-card anim-item anim-delay-${i + 1}`}>
                  <div className="pain-icon"><span className="material-symbols-outlined">{p.icon}</span></div>
                  <h3 className="pain-title">{p.title}</h3>
                  <p className="pain-body">{p.body}</p>
                  <div className="pain-stat">{p.stat}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ──────────────────────────────────────────────── */}
        <section className="section section-alt" id="how-it-works" ref={howRef}>
          <div className="container">
            <div className="section-header anim-item">
              <div className="section-eyebrow">How it works</div>
              <h2 className="section-title">A booking, start to finish, in 60 seconds</h2>
              <p className="section-subtitle">From first ring to driver assigned — fully automated.</p>
            </div>
            <div className="steps-track">
              {HOW_IT_WORKS.map((s, i) => (
                <div key={i} className={`step anim-item anim-delay-${i + 1}`}>
                  <div className="step-number">{s.step}</div>
                  <div className="step-icon"><span className="material-symbols-outlined">{s.icon}</span></div>
                  <h3 className="step-title">{s.title}</h3>
                  <p className="step-body">{s.body}</p>
                  {i < HOW_IT_WORKS.length - 1 && <div className="step-connector" aria-hidden="true"/>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <section className="section" id="features" ref={featRef}>
          <div className="container">
            <div className="section-header anim-item">
              <div className="section-eyebrow">Features</div>
              <h2 className="section-title">Everything a modern fleet needs</h2>
              <p className="section-subtitle">Built for transport operators who want the phone answered, the booking captured, and the driver dispatched — without lifting a finger.</p>
            </div>

            <div className="feature-tabs anim-item">
              {featureTabs.map(tab => (
                <button
                  key={tab}
                  className={`feature-tab ${activeFeatureTab === tab ? 'feature-tab-active' : ''}`}
                  onClick={() => setActiveFeatureTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="feature-grid">
              {visibleFeatures.map((f, i) => (
                <div key={`${activeFeatureTab}-${i}`} className={`feature-card anim-item anim-delay-${i + 1}`}>
                  <div className="feature-icon"><span className="material-symbols-outlined">{f.icon}</span></div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-body">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ROI Calculator ────────────────────────────────────────────── */}
        <ROICalculator />

        {/* ── Pricing ───────────────────────────────────────────────────── */}
        <section className="section" id="pricing" ref={pricingRef}>
          <div className="container">
            <div className="section-header anim-item">
              <div className="section-eyebrow">Pricing</div>
              <h2 className="section-title">Simple, honest pricing</h2>
              <p className="section-subtitle">Start free. Upgrade when you're ready. No per-booking fees, ever.</p>
            </div>

            <div className="billing-toggle anim-item">
              <span className={!billingAnnual ? 'billing-active' : ''}>Monthly</span>
              <button
                className={`billing-switch ${billingAnnual ? 'billing-switch-on' : ''}`}
                onClick={() => setBillingAnnual(a => !a)}
                aria-label="Toggle annual billing"
                role="switch"
                aria-checked={billingAnnual}
              >
                <span className="billing-switch-thumb"/>
              </button>
              <span className={billingAnnual ? 'billing-active' : ''}>
                Annual <span className="billing-save">Save 20%</span>
              </span>
            </div>

            <div className="pricing-grid">
              {PLANS.map((plan, i) => (
                <div key={plan.name} className={`pricing-card anim-item anim-delay-${i + 1} ${plan.highlight ? 'pricing-card-highlight' : ''}`}>
                  {plan.badge && <div className="pricing-badge">{plan.badge}</div>}
                  <div className="pricing-name">{plan.name}</div>
                  <div className="pricing-price">
                    {plan.price.monthly === null ? (
                      <span className="pricing-amount">Custom</span>
                    ) : plan.price.monthly === 0 ? (
                      <span className="pricing-amount">Free</span>
                    ) : (
                      <>
                        <span className="pricing-currency">$</span>
                        <span className="pricing-amount">{billingAnnual ? plan.price.annual : plan.price.monthly}</span>
                        <span className="pricing-period">/mo</span>
                      </>
                    )}
                  </div>
                  <p className="pricing-desc">{plan.desc}</p>
                  <Link href={plan.href} className={plan.highlight ? 'pricing-cta-primary' : 'pricing-cta-secondary'}>
                    {plan.cta}
                  </Link>
                  <ul className="pricing-features">
                    {plan.features.map((f, j) => (
                      <li key={j} className="pricing-feature-item">
                        <span className="pricing-feature-check"><span className="material-symbols-outlined">check</span></span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="pricing-note anim-item">All plans include Twilio SMS, PocketBase storage, and Railway hosting. Twilio usage billed separately at cost.</p>
          </div>
        </section>

        {/* ── Testimonials ──────────────────────────────────────────────── */}
        <section className="section section-alt" id="testimonials" ref={testimonialsRef}>
          <div className="container">
            <div className="section-header anim-item">
              <div className="section-eyebrow">Testimonials</div>
              <h2 className="section-title">Operators love Arrival</h2>
            </div>
            <div className="testimonial-grid">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className={`testimonial-card anim-item anim-delay-${i + 1}`}>
                  <StarRating rating={t.rating} />
                  <blockquote className="testimonial-quote">"{t.quote}"</blockquote>
                  <div className="testimonial-author">
                    <div className="testimonial-avatar">{t.avatar}</div>
                    <div>
                      <div className="testimonial-name">{t.name}</div>
                      <div className="testimonial-role">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section className="section" id="faq" ref={faqRef}>
          <div className="container">
            <div className="section-header anim-item">
              <div className="section-eyebrow">FAQ</div>
              <h2 className="section-title">Questions answered</h2>
            </div>
            <div className="faq-list">
              {FAQS.map((f, i) => (
                <div key={i} className="anim-item anim-delay-1">
                  <FaqItem q={f.q} a={f.a} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────── */}
        <section className="cta-section">
          <div className="cta-orbs" aria-hidden="true">
            <div className="orb cta-orb-1"/>
            <div className="orb cta-orb-2"/>
          </div>
          <div className="container">
            <div className="cta-content" ref={ctaRef}>
              <h2 className="cta-title">
                Your next booking is ringing right now.<br/>
                <span className="text-gradient-animated">Will Aria answer it?</span>
              </h2>
              <p className="cta-subtitle">
                Join transport operators who've stopped missing calls and started growing — starting free, no credit card required.
              </p>
              <div className="cta-actions">
                <Link href="/signup" className="btn-cta-primary">
                  Start free today
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 10h12M10 4l6 6-6 6"/></svg>
                </Link>
                <Link href="/login" className="btn-cta-ghost">Already have an account</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo">
                <span className="footer-logo-icon">
                  <span className="material-symbols-outlined">flight_takeoff</span>
                </span>
                <span className="footer-logo-text">Arrival</span>
              </div>
              <p className="footer-tagline">The AI that answers your phones, captures your bookings, and grows your fleet.</p>
              <div className="footer-socials">
                <a href="#" className="footer-social" aria-label="Twitter">𝕏</a>
                <a href="#" className="footer-social" aria-label="LinkedIn">in</a>
              </div>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Product</div>
              <a href="#features"     className="footer-link">Features</a>
              <a href="#how-it-works" className="footer-link">How it works</a>
              <a href="#pricing"      className="footer-link">Pricing</a>
              <a href="#faq"          className="footer-link">FAQ</a>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Company</div>
              <a href="#" className="footer-link">About</a>
              <a href="#" className="footer-link">Blog</a>
              <a href="#" className="footer-link">Careers</a>
              <a href="mailto:hello@arrival.ai" className="footer-link">Contact</a>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Legal</div>
              <a href="#" className="footer-link">Privacy policy</a>
              <a href="#" className="footer-link">Terms of service</a>
              <a href="#" className="footer-link">Cookie policy</a>
              <a href="#" className="footer-link">GDPR</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-copy">© {new Date().getFullYear()} Arrival. All rights reserved.</p>
            <p className="footer-built">Built with AI, for the humans who move people.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
