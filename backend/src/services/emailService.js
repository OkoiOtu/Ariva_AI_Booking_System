import { Resend } from 'resend';

const resend  = new Resend(process.env.RESEND_API_KEY);
const FROM    = process.env.RESEND_FROM    ?? 'Ariva <onboarding@resend.dev>';
const DASH    = process.env.DASHBOARD_URL  ?? 'https://ariva-dashboard.up.railway.app';

function card(body) {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:40px 24px">
      <div style="margin-bottom:28px;display:flex;align-items:center;gap:10px">
        <div style="width:34px;height:34px;border-radius:8px;background:linear-gradient(135deg,#6c63ff,#a78bfa);display:flex;align-items:center;justify-content:center;font-size:18px">🚗</div>
        <span style="font-size:20px;font-weight:800;color:#0a0a0f;letter-spacing:-0.5px">Ariva</span>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:36px 32px">
        ${body}
      </div>
      <p style="font-size:12px;color:#9ca3af;margin-top:20px;text-align:center">
        Ariva — AI-powered transportation booking
      </p>
    </div>
  `;
}

export async function sendVerificationEmail(email, name, token) {
  const url  = `${DASH}/verify-email?token=${encodeURIComponent(token)}`;
  const html = card(`
    <h1 style="font-size:22px;font-weight:700;color:#0a0a0f;margin:0 0 10px">Verify your email</h1>
    <p style="font-size:15px;color:#4b5563;line-height:1.7;margin:0 0 28px">
      Hi ${name ?? 'there'}, welcome to Ariva! Click below to verify your email address and activate your account.
    </p>
    <a href="${url}" style="display:inline-block;padding:14px 28px;background:#6c63ff;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">
      Verify email address →
    </a>
    <p style="font-size:12px;color:#9ca3af;margin-top:24px;line-height:1.6">
      This link expires in 24 hours. If you didn't create an Ariva account, you can safely ignore this email.
    </p>
  `);

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: 'Verify your Ariva account',
    html,
  });
  if (error) throw new Error(error.message ?? 'Failed to send verification email');
}

export async function sendPasswordResetEmail(email, name, token) {
  const url  = `${DASH}/reset-password?token=${encodeURIComponent(token)}`;
  const html = card(`
    <h1 style="font-size:22px;font-weight:700;color:#0a0a0f;margin:0 0 10px">Reset your password</h1>
    <p style="font-size:15px;color:#4b5563;line-height:1.7;margin:0 0 28px">
      Hi ${name ?? 'there'}, we received a request to reset your Ariva password. Click below to set a new one.
    </p>
    <a href="${url}" style="display:inline-block;padding:14px 28px;background:#6c63ff;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">
      Reset password →
    </a>
    <p style="font-size:12px;color:#9ca3af;margin-top:24px;line-height:1.6">
      This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>
  `);

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: 'Reset your Ariva password',
    html,
  });
  if (error) throw new Error(error.message ?? 'Failed to send password reset email');
}
