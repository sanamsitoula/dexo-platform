'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { channelsApi } from '@/lib/api'

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '')
const API_BASE = `${API_HOST}/api`

const CHANNEL_META: Record<string, { icon: string; cls: string; label: string }> = {
  WEBSITE: { icon: '🌐', cls: 'bg-gray-100 text-gray-700', label: 'Website' },
  EMAIL: { icon: '✉️', cls: 'bg-blue-50 text-blue-700', label: 'Email' },
  WHATSAPP: { icon: '🟢', cls: 'bg-green-50 text-green-700', label: 'WhatsApp' },
  VIBER: { icon: '🟣', cls: 'bg-purple-50 text-purple-700', label: 'Viber' },
  FACEBOOK: { icon: '📘', cls: 'bg-blue-50 text-blue-800', label: 'Facebook' },
  INSTAGRAM: { icon: '📸', cls: 'bg-pink-50 text-pink-700', label: 'Instagram' },
  TIKTOK: { icon: '🎵', cls: 'bg-gray-900 text-white', label: 'TikTok' },
  SMS: { icon: '💬', cls: 'bg-amber-50 text-amber-700', label: 'SMS' },
}

// Which credential fields each channel needs (stored in ChannelConfig.credentials JSON)
function credentialFields(channel: string): { key: string; label: string; placeholder: string; secret?: boolean }[] {
  switch (channel) {
    case 'WHATSAPP':
      return [
        { key: 'phoneNumberId', label: 'Phone Number ID', placeholder: 'e.g. 104857xxxxxxxxx' },
        { key: 'accessToken', label: 'Access Token', placeholder: 'Meta Cloud API access token', secret: true },
      ]
    case 'EMAIL':
      return [{ key: 'inboundAddress', label: 'Inbound address', placeholder: 'inbox@yourdomain.com' }]
    case 'WEBSITE':
      return []
    default:
      return [{ key: 'apiKey', label: 'API Key', placeholder: `${channel.toLowerCase()} API key`, secret: true }]
  }
}

interface ChannelCfg {
  channel: string
  configured: boolean
  enabled: boolean
  displayName: string | null
  credentials: Record<string, any> | null
  webhookSecret: string | null
}

export default function ChannelSetupPage() {
  const router = useRouter()
  const [channels, setChannels] = useState<ChannelCfg[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [tenantSubdomain, setTenantSubdomain] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await channelsApi.list()
    if (res.error) {
      setError(res.error)
      if (res.error.includes('401')) router.push('/login')
    } else if (res.data) {
      setChannels(res.data as ChannelCfg[])
    }
    setLoading(false)
  }

  function patch(channel: string, p: Partial<ChannelCfg>) {
    setChannels((prev) => prev.map((c) => (c.channel === channel ? { ...c, ...p } : c)))
  }

  async function save(cfg: ChannelCfg) {
    setSaving(cfg.channel)
    const res = await channelsApi.upsert(cfg.channel, {
      enabled: cfg.enabled,
      displayName: cfg.displayName,
      credentials: cfg.credentials,
    })
    if (res.error) setError(res.error)
    else patch(cfg.channel, { configured: true })
    setSaving(null)
  }

  async function toggle(cfg: ChannelCfg) {
    const enabled = !cfg.enabled
    patch(cfg.channel, { enabled, configured: true })
    const res = await channelsApi.upsert(cfg.channel, { enabled })
    if (res.error) { setError(res.error); patch(cfg.channel, { enabled: !enabled }) }
  }

  async function rotate(cfg: ChannelCfg) {
    setSaving(cfg.channel)
    const res = await channelsApi.rotateSecret(cfg.channel)
    if (res.error) setError(res.error)
    else patch(cfg.channel, { webhookSecret: res.data?.webhookSecret, configured: true })
    setSaving(null)
  }

  function webhookUrl(cfg: ChannelCfg) {
    const params = new URLSearchParams()
    if (tenantSubdomain) params.set('tenant', tenantSubdomain)
    if (cfg.webhookSecret) params.set('secret', cfg.webhookSecret)
    const qs = params.toString()
    return `${API_BASE}/contact/inbound/${cfg.channel.toLowerCase()}${qs ? `?${qs}` : ''}`
  }

  async function copyUrl(cfg: ChannelCfg) {
    try {
      await navigator.clipboard.writeText(webhookUrl(cfg))
      setCopied(cfg.channel)
      setTimeout(() => setCopied(null), 1500)
    } catch {}
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CRM · Channel Setup</h1>
          <p className="mt-1 text-gray-600">
            Enable channels, manage credentials and webhook secrets for the omni-channel inbox
          </p>
        </div>
        <Link href="/crm" className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50">
          ← Back to Inbox
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-sm font-medium text-gray-700 shrink-0">Webhook URLs for tenant (optional):</label>
        <input
          type="text"
          value={tenantSubdomain}
          onChange={(e) => setTenantSubdomain(e.target.value.trim())}
          placeholder="tenant subdomain, e.g. vrfitness — leave empty for platform-level"
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className="font-bold">×</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading channels…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map((cfg) => {
            const meta = CHANNEL_META[cfg.channel] ?? CHANNEL_META.WEBSITE
            const fields = credentialFields(cfg.channel)
            return (
              <div key={cfg.channel} className="bg-white shadow rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold ${meta.cls}`}>
                      {meta.icon} {meta.label}
                    </span>
                    {!cfg.configured && <span className="text-xs text-gray-400">not configured</span>}
                  </div>
                  <button
                    onClick={() => toggle(cfg)}
                    role="switch"
                    aria-checked={cfg.enabled}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${cfg.enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${cfg.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Display name</label>
                  <input
                    type="text"
                    value={cfg.displayName || ''}
                    onChange={(e) => patch(cfg.channel, { displayName: e.target.value })}
                    placeholder={`${meta.label} inbox`}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>

                {fields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">{f.label}</label>
                    <input
                      type={f.secret ? 'password' : 'text'}
                      value={cfg.credentials?.[f.key] || ''}
                      onChange={(e) =>
                        patch(cfg.channel, { credentials: { ...(cfg.credentials || {}), [f.key]: e.target.value } })
                      }
                      placeholder={f.placeholder}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Webhook URL</label>
                  <div className="flex gap-2">
                    <code className="flex-1 font-mono text-xs bg-gray-50 border border-gray-200 rounded px-2 py-2 overflow-x-auto whitespace-nowrap">
                      {webhookUrl(cfg)}
                    </code>
                    <button
                      onClick={() => copyUrl(cfg)}
                      className="px-3 py-1.5 border border-gray-300 rounded-md text-xs hover:bg-gray-50 shrink-0"
                    >
                      {copied === cfg.channel ? '✓ Copied' : '📋 Copy'}
                    </button>
                  </div>
                  {!cfg.webhookSecret && (
                    <p className="text-xs text-amber-600 mt-1">No secret set — webhook is open. Rotate to secure it.</p>
                  )}
                </div>

                <div className="flex justify-between items-center pt-1">
                  <button
                    onClick={() => rotate(cfg)}
                    disabled={saving === cfg.channel}
                    className="px-3 py-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-md hover:bg-amber-100 disabled:opacity-50"
                  >
                    🔄 {cfg.webhookSecret ? 'Rotate secret' : 'Generate secret'}
                  </button>
                  <button
                    onClick={() => save(cfg)}
                    disabled={saving === cfg.channel}
                    className="px-4 py-1.5 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving === cfg.channel ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
