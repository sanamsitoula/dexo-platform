'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { tenantCrmApi } from '@/lib/api';
import { PageHeader, KpiCard, Card, EmptyState, Badge, Btn } from '../_ui';

const CHANNELS: Record<string, { icon: string; label: string }> = {
  WEBSITE: { icon: '🌐', label: 'Website' },
  EMAIL: { icon: '✉️', label: 'Email' },
  WHATSAPP: { icon: '🟢', label: 'WhatsApp' },
  VIBER: { icon: '🟣', label: 'Viber' },
  FACEBOOK: { icon: '📘', label: 'Facebook' },
  INSTAGRAM: { icon: '📸', label: 'Instagram' },
  TIKTOK: { icon: '🎵', label: 'TikTok' },
  SMS: { icon: '💬', label: 'SMS' },
};

// Credential fields per channel (stored in ChannelConfig.credentials JSON)
function credentialFields(channel: string): { key: string; label: string; placeholder: string; secret?: boolean }[] {
  switch (channel) {
    case 'WHATSAPP':
      return [
        { key: 'phoneNumberId', label: 'Phone Number ID', placeholder: 'e.g. 104857xxxxxxxxx' },
        { key: 'accessToken', label: 'Access Token', placeholder: 'Meta Cloud API access token', secret: true },
      ];
    case 'EMAIL':
      return [{ key: 'inboundAddress', label: 'Inbound address', placeholder: 'inbox@yourgym.com' }];
    case 'WEBSITE':
      return [];
    default:
      return [{ key: 'apiKey', label: 'API Key', placeholder: `${channel.toLowerCase()} API key`, secret: true }];
  }
}

interface ChannelCfg {
  channel: string;
  configured: boolean;
  enabled: boolean;
  displayName: string | null;
  credentials: Record<string, any> | null;
  webhookSecret: string | null;
}

export default function ContactsPage() {
  const subdomain = (useParams()?.subdomain as string) || 'vrfitness';
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ total: number; totalPages: number } | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [configs, setConfigs] = useState<ChannelCfg[]>([]);
  const [savingChannel, setSavingChannel] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');
  const limit = 20;

  const fetchMessages = useCallback(() => {
    setLoading(true);
    tenantCrmApi.list(subdomain, { page, limit, channel, status }).then((r) => {
      const body: any = r.data;
      const list = Array.isArray(body) ? body : body?.items ?? body?.data ?? [];
      setMessages(list);
      setPagination(body?.pagination ?? null);
    }).finally(() => setLoading(false));
  }, [subdomain, page, channel, status]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    if (showSetup && configs.length === 0) {
      tenantCrmApi.listChannels(subdomain).then((r) => {
        if (Array.isArray(r.data)) setConfigs(r.data as ChannelCfg[]);
      });
    }
  }, [showSetup, subdomain, configs.length]);

  function patchCfg(ch: string, p: Partial<ChannelCfg>) {
    setConfigs((prev) => prev.map((c) => (c.channel === ch ? { ...c, ...p } : c)));
  }

  async function saveCfg(cfg: ChannelCfg) {
    setSavingChannel(cfg.channel);
    await tenantCrmApi.upsertChannel(subdomain, cfg.channel, {
      enabled: cfg.enabled,
      displayName: cfg.displayName,
      credentials: cfg.credentials,
    });
    patchCfg(cfg.channel, { configured: true });
    setSavingChannel(null);
  }

  async function toggleCfg(cfg: ChannelCfg) {
    const enabled = !cfg.enabled;
    patchCfg(cfg.channel, { enabled, configured: true });
    const r = await tenantCrmApi.upsertChannel(subdomain, cfg.channel, { enabled });
    if (r.error) patchCfg(cfg.channel, { enabled: !enabled });
  }

  async function rotateCfg(cfg: ChannelCfg) {
    setSavingChannel(cfg.channel);
    const r = await tenantCrmApi.rotateChannelSecret(subdomain, cfg.channel);
    if (r.data?.webhookSecret) patchCfg(cfg.channel, { webhookSecret: r.data.webhookSecret, configured: true });
    setSavingChannel(null);
  }

  function webhookUrl(cfg: ChannelCfg) {
    const secretQ = cfg.webhookSecret ? `&secret=${cfg.webhookSecret}` : '';
    return `${apiBase}/api/contact/inbound/${cfg.channel.toLowerCase()}?tenant=${subdomain}${secretQ}`;
  }

  async function copyUrl(cfg: ChannelCfg) {
    try {
      await navigator.clipboard.writeText(webhookUrl(cfg));
      setCopied(cfg.channel);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  const unread = messages.filter((m) => !m.isRead && m.status !== 'READ').length;
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div>
      <PageHeader title="Contact / CRM" subtitle="Omni-channel inbox — website, WhatsApp, socials, email"
        action={<Btn variant="outline" onClick={() => setShowSetup((s) => !s)}>{showSetup ? 'Hide' : '⚙ Channel setup'}</Btn>} />

      {showSetup && (
        <Card className="p-5 mb-6">
          <div className="font-bold text-gray-900">Connect your channels</div>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Enable each channel, add its credentials, then point the platform&apos;s webhook at the URL shown.
            Incoming messages land in this inbox tagged with their channel.
            Body: <code className="font-mono text-xs bg-gray-100 px-1 rounded">{'{ "name", "message", "externalId", "phone" }'}</code>
          </p>
          {configs.length === 0 ? (
            <div className="text-sm text-gray-400 py-4 text-center">Loading channel configs…</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {configs.map((cfg) => {
                const meta = CHANNELS[cfg.channel] ?? CHANNELS.WEBSITE;
                const fields = credentialFields(cfg.channel);
                return (
                  <div key={cfg.channel} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800 text-sm">{meta.icon} {meta.label}
                        {!cfg.configured && <span className="ml-2 text-xs font-normal text-gray-400">not configured</span>}
                      </span>
                      <button
                        onClick={() => toggleCfg(cfg)}
                        role="switch"
                        aria-checked={cfg.enabled}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${cfg.enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${cfg.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={cfg.displayName || ''}
                      onChange={(e) => patchCfg(cfg.channel, { displayName: e.target.value })}
                      placeholder={`Display name (e.g. ${meta.label} inbox)`}
                      className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm"
                    />
                    {fields.map((f) => (
                      <input
                        key={f.key}
                        type={f.secret ? 'password' : 'text'}
                        value={cfg.credentials?.[f.key] || ''}
                        onChange={(e) => patchCfg(cfg.channel, { credentials: { ...(cfg.credentials || {}), [f.key]: e.target.value } })}
                        placeholder={`${f.label} — ${f.placeholder}`}
                        className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm font-mono"
                      />
                    ))}
                    <div className="flex items-center gap-2">
                      <code className="flex-1 font-mono text-[11px] bg-gray-50 border border-gray-200 rounded px-2 py-1.5 overflow-x-auto whitespace-nowrap">
                        POST {webhookUrl(cfg)}
                      </code>
                      <button onClick={() => copyUrl(cfg)} className="text-xs px-2 py-1.5 border border-gray-200 rounded hover:bg-gray-50 shrink-0">
                        {copied === cfg.channel ? '✓' : '📋'}
                      </button>
                    </div>
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => rotateCfg(cfg)}
                        disabled={savingChannel === cfg.channel}
                        className="text-xs px-2.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100 disabled:opacity-50"
                      >
                        🔄 {cfg.webhookSecret ? 'Rotate secret' : 'Generate secret'}
                      </button>
                      <Btn onClick={() => saveCfg(cfg)} disabled={savingChannel === cfg.channel}>
                        {savingChannel === cfg.channel ? 'Saving…' : 'Save'}
                      </Btn>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <KpiCard label="Total messages" value={pagination?.total ?? messages.length} accent="#4f46e5" />
        <KpiCard label="Unread (this page)" value={unread} accent="#f59e0b" />
        <KpiCard label="This week (this page)" value={messages.filter((m) => Date.now() - new Date(m.createdAt).getTime() < 7 * 864e5).length} accent="#16a34a" />
      </div>

      {/* Channel filter chips (server-side) */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={() => { setChannel('all'); setPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${channel === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>All</button>
        {Object.entries(CHANNELS).map(([key, c]) => (
          <button key={key} onClick={() => { setChannel(key); setPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${channel === key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>
            {c.icon} {c.label}
          </button>
        ))}
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="ml-auto border border-gray-200 rounded-md px-2.5 py-1.5 text-xs text-gray-600"
        >
          <option value="all">All status</option>
          <option value="NEW">New</option>
          <option value="READ">Read</option>
          <option value="REPLIED">Replied</option>
          <option value="ARCHIVED">Archived</option>
          <option value="SPAM">Spam</option>
        </select>
      </div>

      <Card>
        {loading ? <div className="p-10 text-center text-gray-400">Loading…</div> : messages.length === 0 ? (
          <EmptyState icon="✉️" title="No messages yet" msg="Enquiries from your website and connected channels land here." />
        ) : (
          <div className="divide-y divide-gray-100">
            {messages.map((m) => {
              const c = CHANNELS[(m.channel || 'WEBSITE') as string] ?? CHANNELS.WEBSITE;
              return (
                <div key={m.id} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900">
                      <span className="mr-1.5" title={c.label}>{c.icon}</span>
                      {m.name || 'Anonymous'} <span className="text-gray-400 font-normal text-sm">· {m.email || m.phone || ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color="gray">{c.label}</Badge>
                      {m.subject && <Badge color="indigo">{m.subject}</Badge>}
                      <span className="text-xs text-gray-400">{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ''}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{m.message}</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Pager */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">Page {page} of {totalPages} · {pagination?.total ?? 0} messages</span>
          <div className="flex gap-2">
            <Btn variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Previous</Btn>
            <Btn variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next →</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
