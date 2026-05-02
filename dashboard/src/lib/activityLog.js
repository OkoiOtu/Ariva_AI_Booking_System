import pb from './pb';

/**
 * logEvent — sends an activity log entry to the backend.
 * Used from the dashboard for auth events (login, failed, suspended).
 * Never throws — logging failure must never break the login flow.
 * POST /activity is deliberately open so pre-login events (login_failed) can be recorded.
 */
export async function logEvent(action, actor, detail) {
  try {
    const token = pb.authStore.token ?? '';
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/activity`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action, actor, detail }),
    });
  } catch {
    // Silently ignore — logging is non-critical
  }
}
