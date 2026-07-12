'use client'

import { useEffect, useState } from 'react'
import { chatwootApi } from '@/lib/api'

export default function ChatSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [provisioning, setProvisioning] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [baseUrl, setBaseUrl] = useState('')
  const [apiAccessToken, setApiAccessToken] = useState('')
  const [platformAccountId, setPlatformAccountId] = useState<number | ''>('')
  const [isEnabled, setIsEnabled] = useState(false)
  const [platformInboxId, setPlatformInboxId] = useState<number | null>(null)
  const [lastTestStatus, setLastTestStatus] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await chatwootApi.get()
    if (res.data) {
      const c = res.data
      setBaseUrl(c.baseUrl || '')
      setApiAccessToken(c.apiAccessToken || '')
      setPlatformAccountId(c.platformAccountId || '')
      setIsEnabled(!!c.isEnabled)
      setPlatformInboxId(c.platformInboxId || null)
      setLastTestStatus(c.lastTestStatus || null)
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')
    const res = await chatwootApi.save({
      baseUrl, apiAccessToken, platformAccountId: platformAccountId === '' ? undefined : Number(platformAccountId), isEnabled,
    })
    if (res.error) setError(res.error)
    else {
      setSuccess('Chatwoot connection saved.')
      load()
    }
    setSaving(false)
  }

  async function handleTest() {
    setTesting(true)
    setError('')
    setSuccess('')
    const res = await chatwootApi.test()
    if (res.error) setError(res.error)
    else if (res.data?.success) setSuccess('Connected to Chatwoot successfully ✅')
    else setError(res.data?.error || 'Connection test failed')
    setTesting(false)
    load()
  }

  async function handleProvisionPlatformInbox() {
    setProvisioning(true)
    setError('')
    setSuccess('')
    const res = await chatwootApi.provisionPlatformInbox()
    if (res.error) setError(res.error)
    else {
      setSuccess('Platform support inbox created — tenant owners can now message platform support from tenant-admin.')
      load()
    }
    setProvisioning(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading chat settings...</div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chat (Chatwoot)</h1>
          <p className="mt-2 text-gray-600">
            Self-hosted <a href="https://github.com/chatwoot/chatwoot" target="_blank" rel="noreferrer" className="underline">Chatwoot</a> connection.
            Tier 1 (customer ↔ tenant) inboxes are auto-provisioned per tenant; this configures the connection itself
            and the single Tier 2 (tenant owner ↔ platform) inbox.
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
          <h2 className="text-lg font-medium text-gray-900">Connection</h2>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
            Enabled
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chatwoot Base URL</label>
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="input-primary" placeholder="https://chatwoot.onedexo.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Platform Account ID</label>
            <input
              type="number"
              value={platformAccountId}
              onChange={(e) => setPlatformAccountId(e.target.value === '' ? '' : Number(e.target.value))}
              className="input-primary"
              placeholder="1"
            />
            <p className="text-xs text-gray-400 mt-1">The Chatwoot account every tenant inbox is created under — from the URL after logging into Chatwoot.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Access Token</label>
          <input
            type="password"
            value={apiAccessToken}
            onChange={(e) => setApiAccessToken(e.target.value)}
            className="input-primary font-mono"
            placeholder="********"
          />
          <p className="text-xs text-gray-400 mt-1">Profile Settings → Access Token in Chatwoot. Masked after save — paste a new one to rotate it.</p>
        </div>

        <div className="flex gap-2">
          <button onClick={handleTest} disabled={testing} className="btn-primary">
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          {lastTestStatus && (
            <span className={`self-center text-xs px-2 py-1 rounded-full ${lastTestStatus === 'SUCCESS' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              Last test: {lastTestStatus}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-3">
        <h2 className="text-lg font-medium text-gray-900">Tier 2 — Platform Support Inbox</h2>
        <p className="text-sm text-gray-500">
          The single inbox every tenant owner messages when they need help from OneDexo — separate from each
          tenant's own customer-facing inbox (Tier 1, auto-created per tenant on signup).
        </p>
        {platformInboxId ? (
          <p className="text-sm text-green-700">✅ Platform inbox provisioned (Chatwoot inbox #{platformInboxId})</p>
        ) : (
          <button onClick={handleProvisionPlatformInbox} disabled={provisioning || !isEnabled} className="btn-primary">
            {provisioning ? 'Creating...' : 'Create Platform Support Inbox'}
          </button>
        )}
      </div>
    </div>
  )
}
