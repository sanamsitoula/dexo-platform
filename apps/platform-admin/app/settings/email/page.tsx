'use client'

import { useEffect, useState } from 'react'
import { platformEmailApi } from '@/lib/api'

export default function GlobalEmailSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [logs, setLogs] = useState<any[]>([])

  const [provider, setProvider] = useState('brevo')
  const [isEnabled, setIsEnabled] = useState(true)
  const [host, setHost] = useState('')
  const [port, setPort] = useState(587)
  const [secure, setSecure] = useState(false)
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [fromName, setFromName] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [testTo, setTestTo] = useState('')

  useEffect(() => {
    load()
    platformEmailApi.logs(20).then((r) => r.data && setLogs(r.data))
  }, [])

  async function load() {
    setLoading(true)
    const res = await platformEmailApi.get()
    if (res.data) {
      const c = res.data
      setProvider(c.provider || 'brevo')
      setIsEnabled(c.isEnabled !== false)
      setHost(c.host || '')
      setPort(c.port || 587)
      setSecure(!!c.secure)
      setUser(c.user || '')
      setPass(c.pass || '')
      setFromName(c.fromName || '')
      setFromEmail(c.fromEmail || '')
      setReplyTo(c.replyTo || '')
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')
    const res = await platformEmailApi.save({
      provider, isEnabled, host, port: Number(port), secure, user, pass, fromName, fromEmail, replyTo,
    })
    if (res.error) setError(res.error)
    else {
      setSuccess('Global email configuration saved — takes effect immediately, no redeploy needed.')
      load()
    }
    setSaving(false)
  }

  async function handleTest() {
    if (!testTo) { setError('Enter a recipient email to test'); return }
    setTesting(true)
    setError('')
    setSuccess('')
    const res = await platformEmailApi.test(testTo)
    if (res.error) setError(res.error)
    else if (res.data?.success) setSuccess(`Test email sent to ${testTo} ✅`)
    else setError(res.data?.error || 'Test send failed')
    setTesting(false)
    platformEmailApi.logs(20).then((r) => r.data && setLogs(r.data))
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading email settings...</div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Global Email</h1>
          <p className="mt-2 text-gray-600">
            The platform-wide email provider. Tenants without their own SMTP configuration send through this —
            switch providers or rotate keys here, no redeploy required.
          </p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">{success}</div>}

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Provider</h2>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
            Enabled
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider label</label>
            <input value={provider} onChange={(e) => setProvider(e.target.value)} className="input-primary" placeholder="brevo, sendgrid, smtp..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
            <input value={host} onChange={(e) => setHost(e.target.value)} className="input-primary" placeholder="smtp-relay.brevo.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
            <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} className="input-primary" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Login</label>
            <input value={user} onChange={(e) => setUser(e.target.value)} className="input-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Key / Password</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="input-primary font-mono"
              placeholder="********"
            />
            <p className="text-xs text-gray-400 mt-1">Masked after save — leave as-is to keep the current key, or paste a new one to rotate it.</p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} />
          Use TLS/SSL (secure connection)
        </label>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Sender Identity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
            <input value={fromName} onChange={(e) => setFromName(e.target.value)} className="input-primary" placeholder="OneDexo" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
            <input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} className="input-primary" placeholder="noreply@onedexo.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reply-To (optional)</label>
            <input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} className="input-primary" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-3">
        <h2 className="text-lg font-medium text-gray-900">Test Delivery</h2>
        <p className="text-sm text-gray-500">Sends a real email through the saved global config — save first if you just changed anything.</p>
        <div className="flex gap-2">
          <input
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="you@example.com"
            className="input-primary flex-1"
          />
          <button onClick={handleTest} disabled={testing} className="btn-primary whitespace-nowrap">
            {testing ? 'Sending...' : 'Send Test'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-3">Recent Deliveries</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400">No emails logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="py-2 pr-4">To</th>
                  <th className="py-2 pr-4">Subject</th>
                  <th className="py-2 pr-4">Via</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">When</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-gray-50">
                    <td className="py-2 pr-4 truncate max-w-[220px]">{l.to}</td>
                    <td className="py-2 pr-4 truncate max-w-[240px]">{l.subject}</td>
                    <td className="py-2 pr-4">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{l.via}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${l.status === 'SENT' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-400 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
