'use client';

import { useEffect, useState } from 'react';
import { contactApi, fitnessApi, publicApi } from '../../lib/api';

export default function ContactPage() {
  const [info, setInfo] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    (async () => {
      const [i, m] = await Promise.all([publicApi.info(), fitnessApi.me()]);
      if (i.data) setInfo(i.data);
      const member = m.data;
      const firstName = member?.user?.firstName || '';
      const lastName = member?.user?.lastName || '';
      if (firstName || lastName) setName(`${firstName} ${lastName}`.trim());
      if (member?.user?.email) setEmail(member.user.email);
    })();
  }, []);

  const primary = info?.colorPrimary || '#E85D24';

  async function submit() {
    if (!name || !email || !message) return;
    setSaving(true);
    setError(null);
    const res = await contactApi.send({
      name,
      email,
      subject: subject || undefined,
      message,
      source: 'tenant_app_contact_form',
    });
    setSaving(false);
    if (res.error) return setError(res.error);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="px-6 py-10 max-w-md mx-auto flex flex-col items-center text-center min-h-[70vh] justify-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-4xl shadow-lg" style={{ background: '#16A34A' }}>✓</div>
        <h1 className="text-2xl font-extrabold text-gray-900 mt-4 -tracking-tight">Message sent</h1>
        <p className="text-gray-500 mt-2">We&apos;ll get back to you within 24 hours.</p>
        <button
          onClick={() => { setSent(false); setSubject(''); setMessage(''); }}
          className="mt-8 rounded-full px-6 py-3 text-white font-bold"
          style={{ background: primary }}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-24 max-w-md mx-auto">
      <h1 className="text-2xl font-extrabold text-gray-900 px-2 -tracking-tight">Contact us</h1>
      <p className="text-gray-500 px-2 mt-1 text-sm">Send a message to {info?.name || 'the gym'} — we usually reply within a day.</p>

      <div className="mt-6 space-y-4 px-2">
        <Field label="Your name" value={name} onChange={setName} placeholder="Jane Doe" />
        <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" type="email" />
        <Field label="Subject (optional)" value={subject} onChange={setSubject} placeholder="Membership question" />
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="How can we help?"
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-gray-900 resize-none"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={submit}
          disabled={saving || !name || !email || !message}
          className="w-full rounded-full py-4 text-white font-extrabold shadow disabled:opacity-40 transition active:scale-[.99]"
          style={{ background: primary }}
        >
          {saving ? 'Sending…' : 'Send message'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: any) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-800 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-gray-900"
      />
    </div>
  );
}
