'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import '@/styles/tour.css';

const STEPS = [
  {
    icon: 'celebration',
    label: 'Step 1 of 7',
    title: 'Welcome to Arrival',
    body: 'You\'re all set up. Arrival is your AI-powered booking platform — it handles inbound calls, creates bookings automatically, and keeps your team in the loop. Let\'s take a quick look around.',
    bullets: [
      'AI voice agent answers calls 24/7',
      'Bookings logged in real time',
      'SMS confirmations sent automatically',
    ],
  },
  {
    icon: 'dashboard',
    label: 'Step 2 of 7',
    title: 'Your overview dashboard',
    body: 'This is your command centre. See all confirmed, in-progress, and completed bookings at a glance. Recent activity shows you everything that\'s happened across calls and bookings.',
    bullets: [
      'Live booking and lead stats',
      'Recent activity feed',
      'Auto-refreshes every 15 seconds',
    ],
  },
  {
    icon: 'event_available',
    label: 'Step 3 of 7',
    title: 'Bookings',
    body: 'Every booking captured by the AI voice agent appears here instantly. You can review details, assign drivers, update status, and export records — all from one place.',
    bullets: [
      'Filter by status, date, or driver',
      'One-click driver assignment',
      'Export to CSV anytime',
    ],
  },
  {
    icon: 'call',
    label: 'Step 4 of 7',
    title: 'Leads & calls',
    body: 'Not every call becomes a booking. Leads are captured when callers inquire but don\'t confirm. All call recordings and transcripts are stored so nothing slips through the cracks.',
    bullets: [
      'Every call logged with transcript',
      'Convert leads manually',
      'Filter by date or outcome',
    ],
  },
  {
    icon: 'directions_car',
    label: 'Step 5 of 7',
    title: 'Drivers',
    body: 'Add your drivers, set their availability, and the system handles conflict detection automatically. When a booking is confirmed, you can assign the right driver in seconds.',
    bullets: [
      'Driver availability tracking',
      'Conflict detection built in',
      'Driver SMS notifications',
    ],
  },
  {
    icon: 'payments',
    label: 'Step 6 of 7',
    title: 'Revenue & pricing',
    body: 'Set up pricing rules per route or vehicle type. The AI agent uses your rules to quote customers during the call. Track revenue, monitor trends, and grow with confidence.',
    bullets: [
      'Hourly, fixed, and hybrid pricing',
      'Revenue reports by period',
      'Upgrade when you\'re ready',
    ],
  },
  {
    icon: 'business_center',
    label: 'Step 7 of 7',
    title: 'Set up your company',
    body: 'You\'re one step away from going live. Fill in your company profile — brand, fleet, pricing model, and contact details — so Arrival can be fully configured for your business.',
    bullets: [
      'Takes about 3 minutes',
      'You can edit everything later',
      'Unlock your AI voice agent after setup',
    ],
  },
];

export default function ProductTour({ user, onDone }) {
  const router  = useRouter();
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const total   = STEPS.length;

  async function completeTour() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`tour_${user.id}`, '1');
    }
    try { await api('/auth/complete-tour', { method: 'POST' }); } catch {}
    if (onDone) onDone();
    router.replace('/onboarding');
  }

  function next() {
    if (step < total - 1) setStep(s => s + 1);
    else completeTour();
  }

  function back() {
    if (step > 0) setStep(s => s - 1);
  }

  return (
    <div className="tour-overlay">
      <div className="tour-card">
        {/* Progress bar */}
        <div className="tour-progress">
          <div className="tour-progress-fill" style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>

        {/* Step dots */}
        <div className="tour-dots">
          {STEPS.map((_, i) => (
            <div key={i} className={`tour-dot${i === step ? ' active' : i < step ? ' done' : ''}`} />
          ))}
        </div>

        {/* Icon */}
        <div className="tour-icon">
          <span className="material-symbols-outlined">{current.icon}</span>
        </div>

        {/* Text */}
        <p className="tour-step-label">{current.label}</p>
        <h2 className="tour-title">{current.title}</h2>
        <p className="tour-body">{current.body}</p>

        {/* Bullets */}
        <ul className="tour-bullets">
          {current.bullets.map((b, i) => (
            <li key={i} className="tour-bullet">
              <span className="material-symbols-outlined">check_circle</span>
              {b}
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div className="tour-footer">
          <button className="tour-skip" onClick={completeTour}>
            Skip tour
          </button>
          <div className="tour-actions">
            {step > 0 && (
              <button className="tour-btn-back" onClick={back}>Back</button>
            )}
            <button className="tour-btn-next" onClick={next}>
              {step === total - 1 ? 'Set up company' : 'Next'}
              <span className="material-symbols-outlined">
                {step === total - 1 ? 'arrow_forward' : 'chevron_right'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
