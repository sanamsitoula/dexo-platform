'use client'

import { useEffect, useState } from 'react'
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { tenantWhatsAppApi } from '@/lib/api'

const TEMPLATE_KEYS = [
  'membership_expiry',
  'payment_received',
  'class_reminder',
  'birthday_greeting',
  'trainer_session_reminder',
  'welcome_message',
]

export default function WhatsAppSettingsPage() {
  const subdomain = resolveTenantAdminSubdomain();

  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [phoneNumber, setPhoneNumber] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [wabaId, setWabaId] = useState('')
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('')
  const [isEnabled, setIsEnabled] = useState(false)
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false)
  const [templates, setTemplates] = useState<Record<string, string>>({})

  // Test message state
  const [testTo, setTestTo] = useState('')
  const [testText, setTestText] = useState('Test message from Dexo')
  const [testResult, setTestResult] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    tenantWhatsAppApi.getConfig(subdomain).then((r) => {
      if (r.error) setError(r.error)
      else {
        const c = r.data ?? {}
        setConfig(c)
        setPhoneNumber(c.phoneNumber ?? '')
        setDisplayName(c.displayName ?? '')
        setIsEnabled(!!c.isEnabled)
        setAutoReplyEnabled(!!c.autoReplyEnabled)
        setTemplates(c.templates ?? {})
      }
    }).finally(() => setLoading(false))
  }, [subdomain])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null); setSuccess(null)
    const res = await tenantWhatsAppApi.upsertConfig(subdomain, {
      phoneNumber,
      displayName,
      accessToken: accessToken || undefined,
      phoneNumberId: phoneNumberId || undefined,
      wabaId: wabaId || undefined,
      webhookVerifyToken: webhookVerifyToken || undefined,
      isEnabled,
      autoReplyEnabled,
      templates,
    })
    setSaving(false)
    if (res.error) setError(res.error)
    else setSuccess('WhatsApp configuration saved.')
  }

  const handleSendTest = async () => {
    if (!testTo) { setError('Enter a phone number to test'); return }
    setTestResult(null); setError(null)
    const res = await tenantWhatsAppApi.sendTest(subdomain, testTo, testText)
    if (res.error) setError(res.error)
    else setTestResult(`✓ Sent (simulated=${res.data?.simulated ?? false}, messageId=${res.data?.messageId ?? 'n/a'})`)
  }

  if (loading) return <div className="text-gray-400">Loading…</div>

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">WhatsApp Settings</h2>
      <p className="mt-1 text-gray-600 text-sm">
        Configure WhatsApp Business Cloud API for your tenant. Members will see a &quot;Chat on WhatsApp&quot; button on your public website, and you can send templated notifications (membership expiry, payment received, class reminders).
      </p>

      {config?.phoneNumberId === '***configured***' && (
        <div className="mt-4 p-3 rounded bg-blue-50 border border-blue-200 text-sm text-blue-800">
          Meta Cloud API credentials are already on file. To replace them, enter new values below and save.
        </div>
      )}

      <form onSubmit={handleSave} className="mt-6 space-y-6 bg-white rounded-lg shadow p-6">
        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold text-gray-900">Business Profile</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone Number (E.164, no +) *" value={phoneNumber} onChange={setPhoneNumber} placeholder="9779800000000" required />
            <Field label="Display Name" value={displayName} onChange={setDisplayName} placeholder="My Fitness Center" />
          </div>
          <div className="flex flex-wrap gap-6">
            <Toggle label="Enabled" checked={isEnabled} onChange={setIsEnabled} />
            <Toggle label="Auto-reply to inbound (TODO)" checked={autoReplyEnabled} onChange={setAutoReplyEnabled} />
          </div>
        </fieldset>

        <fieldset className="space-y-4 border-t pt-4">
          <legend className="text-lg font-semibold text-gray-900">Meta Cloud API Credentials</legend>
          <p className="text-xs text-gray-500">
            Obtain from <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Meta for Developers</a>.
            Leave blank for simulated/stub mode (UI/test only, no real messages sent).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Access Token" value={accessToken} onChange={setAccessToken} placeholder="EAAG..." type="password" />
            <Field label="Phone Number ID" value={phoneNumberId} onChange={setPhoneNumberId} placeholder="109...xyz" />
            <Field label="WABA ID" value={wabaId} onChange={setWabaId} placeholder="123...456" />
            <Field label="Webhook Verify Token" value={webhookVerifyToken} onChange={setWebhookVerifyToken} placeholder="your_custom_verify_token" />
          </div>
        </fieldset>

        <fieldset className="space-y-4 border-t pt-4">
          <legend className="text-lg font-semibold text-gray-900">Notification Templates</legend>
          <p className="text-xs text-gray-500">
            Map notification keys (sent via <code>POST /api/whatsapp/notify</code>) to your approved Meta template names.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEMPLATE_KEYS.map((k) => (
              <Field
                key={k}
                label={k}
                value={templates[k] ?? ''}
                onChange={(v) => setTemplates({ ...templates, [k]: v })}
                placeholder={`e.g. ${k}_template_v1`}
              />
            ))}
          </div>
        </fieldset>

        {error && <div className="p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
        {success && <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">{success}</div>}

        <button type="submit" disabled={saving} className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
      </form>

      <section className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900">Send Test Message</h3>
        <p className="text-xs text-gray-500 mt-1">
          Test your configuration by sending a message. In stub mode (no Meta credentials), the message will be logged to the API server console.
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="To (E.164, no +)" value={testTo} onChange={setTestTo} placeholder="9779800000000" />
          <Field label="Message" value={testText} onChange={setTestText} placeholder="Hello from Dexo" />
          <div className="flex items-end">
            <button type="button" onClick={handleSendTest} className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              Send Test
            </button>
          </div>
        </div>
        {testResult && <div className="mt-3 text-sm text-emerald-700">{testResult}</div>}
      </section>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type, required }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-gray-600">{label}</span>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
      />
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}