'use client';
import { useState } from 'react';
import { getPB } from '@/lib/pb';
import { useAuth } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function AnnouncementsPage() {
  const { user }   = useAuth();
  const [title,    setTitle]    = useState('');
  const [message,  setMessage]  = useState('');
  const [target,   setTarget]   = useState('all');
  const [channel,  setChannel]  = useState('sms');
  const [sending,  setSending]  = useState(false);
  const [result,   setResult]   = useState<string>('');
  const [error,    setError]    = useState('');

  async function send() {
    if (!message.trim()) { setError('Message is required'); return; }
    setSending(true); setResult(''); setError('');
    try {
      const token = getPB().authStore.token;
      const res   = await fetch(`${API}/admin/announce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title, message, target, channel }),
      });
      const data  = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to send');
      setResult(`✓ Sent to ${data.sent} companies via ${data.channel}`);
      setTitle(''); setMessage('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  const iStyle = { width: '100%', padding: '8px 12px', fontSize: 13 };

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Syne, sans-serif', marginBottom: 8 }}>Announcements</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 28 }}>Send platform-wide messages to operators via SMS</p>

      <div style={{ maxWidth: 620 }}>
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px 28px' }}>
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 20 }}>Compose Announcement</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Title (optional)</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Platform Maintenance" style={iStyle} />
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Message *</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} placeholder="Type your message here..." style={{ ...iStyle, resize: 'vertical' }} />
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{message.length} characters</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Target audience</label>
                <select value={target} onChange={e => setTarget(e.target.value)} style={{ ...iStyle }}>
                  <option value="all">All companies</option>
                  <option value="starter">Starter only</option>
                  <option value="professional">Professional only</option>
                  <option value="enterprise">Enterprise only</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Channel</label>
                <select value={channel} onChange={e => setChannel(e.target.value)} style={{ ...iStyle }}>
                  <option value="sms">SMS only</option>
                  <option value="email">Email only</option>
                  <option value="both">SMS + Email</option>
                </select>
              </div>
            </div>

            {/* Preview */}
            {message && (
              <div style={{ background: 'var(--surface-2)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>SMS Preview</p>
                <p style={{ fontSize: 13 }}>[Ariva] {title ? `${title}: ` : ''}{message}</p>
              </div>
            )}

            {error  && <p style={{ fontSize: 12, color: 'var(--red)',   background: 'var(--red-bg)',   padding: '10px 12px', borderRadius: 'var(--radius)' }}>{error}</p>}
            {result && <p style={{ fontSize: 12, color: 'var(--green)', background: 'var(--green-bg)', padding: '10px 12px', borderRadius: 'var(--radius)' }}>{result}</p>}

            <button className="primary" onClick={send} disabled={sending || !message.trim()} style={{ padding: '10px' }}>
              {sending ? 'Sending...' : `Send to ${target === 'all' ? 'all companies' : target + ' companies'}`}
            </button>
          </div>
        </div>

        {/* Tips */}
        <div style={{ background: 'var(--amber-bg)', border: '0.5px solid var(--amber)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginTop: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--amber)', marginBottom: 6 }}>Tips</p>
          <ul style={{ fontSize: 12, color: 'var(--text)', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li>SMS messages are sent to the company's registered phone number</li>
            <li>Keep SMS under 160 characters to avoid splitting into multiple messages</li>
            <li>Only active companies will receive the announcement</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
