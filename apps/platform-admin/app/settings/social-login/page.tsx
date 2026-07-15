'use client';

import { useEffect, useState } from 'react';
import { socialLoginApi } from '@/lib/api';

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');

const PROVIDERS = [
  { id: 'google', name: 'Google', icon: '🔵', consoleUrl: 'https://console.cloud.google.com/apis/credentials', hint: 'Google Cloud Console → APIs & Services → Credentials → OAuth client (Web application)' },
  { id: 'facebook', name: 'Facebook', icon: '🟦', consoleUrl: 'https://developers.facebook.com/apps', hint: 'Meta for Developers → your app → Facebook Login → Settings' },
  { id: 'github', name: 'GitHub', icon: '⬛', consoleUrl: 'https://github.com/settings/developers', hint: 'GitHub → Settings → Developer settings → OAuth Apps' },
  { id: 'microsoft', name: 'Microsoft', icon: '🟥', consoleUrl: 'https://portal.azure.com', hint: 'Azure Portal → App registrations' },
];

export default function SocialLoginSettingsPage() {
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [provider, setProvider] = useState('google');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; checks: { label: string; ok: boolean; detail?: string }[] } | null>(null);
  const [copied, setCopied] = useState(false);

  const meta = PROVIDERS.find((p) => p.id === provider)!;
  // The ONE redirect URI to whitelist in the provider's console. It is the
  // API's platform callback — fixed regardless of how many tenants exist,
  // because tenant flows without their own OAuth app fall back to this one
  // and carry the tenant in the OAuth state parameter.
  const callbackUrl = `${API_HOST}/api/auth/platform/${provider}/callback`;

  useEffect(() => {
    (async () => {
      const res = await socialLoginApi.getConfigs();
      if (res.data) {
        const byProvider: Record<string, any> = {};
        for (const c of res.data) byProvider[c.provider] = c;
        setConfigs(byProvider);
      }
      setLoading(false);
    })();
  }, []);

  // Load the selected provider's saved values into the form.
  useEffect(() => {
    const c = configs[provider];
    setClientId(c?.clientId || '');
    setClientSecret(c?.clientSecret || '');
    setIsEnabled(c ? c.isEnabled : true);
    setTestResult(null);
    setMsg(null);
  }, [provider, configs]);

  async function save() {
    setSaving(true); setMsg(null); setTestResult(null);
    const res = await socialLoginApi.save(provider, {
      clientId,
      clientSecret,
      redirectUri: callbackUrl,
      scope: 'openid email profile',
      isEnabled,
    });
    setSaving(false);
    if (res.error) return setMsg({ ok: false, text: res.error });
    setConfigs((c) => ({ ...c, [provider]: res.data }));
    setMsg({ ok: true, text: 'Saved. Run the test to verify the setup.' });
  }

  async function runTest() {
    setTesting(true); setMsg(null);
    const res = await socialLoginApi.test(provider);
    setTesting(false);
    if (res.error) return setMsg({ ok: false, text: res.error });
    setTestResult(res.data || null);
  }

  function copyCallback() {
    navigator.clipboard.writeText(callbackUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading social login settings...</div></div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Social Login</h1>
        <p className="mt-1 text-sm text-gray-500">
          Platform-wide OAuth apps. These keys power the &quot;Continue with …&quot; buttons on the platform site,
          this admin, and — automatically — <strong>every tenant website</strong> that hasn&apos;t configured its own
          app. Tenant IDs never need to be registered with the provider: only the one callback URL below.
        </p>
      </div>

      {/* Provider tabs */}
      <div className="flex gap-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => setProvider(p.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
              provider === p.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            {p.icon} {p.name}
            {configs[p.id]?.isEnabled && <span className="ml-1.5 text-emerald-400">●</span>}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-5">
        {/* Step 1 — the URL to whitelist */}
        <div>
          <div className="text-sm font-bold text-gray-900">1 · Whitelist this callback URL</div>
          <p className="text-xs text-gray-500 mt-0.5">
            {meta.hint} — <a href={meta.consoleUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">open console ↗</a>.
            Add this exact URL as an authorized redirect URI (this is the only one needed, for all tenants):
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 font-mono text-gray-800 break-all">{callbackUrl}</code>
            <button onClick={copyCallback} className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 whitespace-nowrap">
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Step 2 — keys */}
        <div className="border-t border-gray-100 pt-4">
          <div className="text-sm font-bold text-gray-900 mb-3">2 · Paste the keys from {meta.name}</div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
              <input value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono" placeholder="e.g. 1234567890-abc.apps.googleusercontent.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
              <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono" placeholder="••••••••" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
              Enable {meta.name} sign-in
            </label>
          </div>
        </div>

        {/* Step 3 — save & test */}
        <div className="border-t border-gray-100 pt-4 flex items-center gap-3">
          <button onClick={save} disabled={saving || !clientId || !clientSecret} className="px-5 py-2.5 rounded-lg font-semibold text-white bg-slate-900 disabled:opacity-40">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={runTest} disabled={testing || !configs[provider]} className="px-5 py-2.5 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 disabled:opacity-40">
            {testing ? 'Testing…' : '🧪 Test configuration'}
          </button>
          {msg && <span className={`text-sm ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</span>}
        </div>

        {testResult && (
          <div className={`rounded-lg border p-4 ${testResult.ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
            <div className="text-sm font-bold mb-2">{testResult.ok ? '✅ Configuration looks good' : '⚠️ Issues found'}</div>
            <ul className="space-y-1">
              {testResult.checks.map((c) => (
                <li key={c.label} className="text-sm flex items-start gap-2">
                  <span>{c.ok ? '✓' : '✗'}</span>
                  <span className={c.ok ? 'text-gray-700' : 'text-red-700 font-medium'}>
                    {c.label}{c.detail ? ` — ${c.detail}` : ''}
                  </span>
                </li>
              ))}
            </ul>
            {!testResult.ok && (
              <p className="text-xs text-gray-500 mt-2">
                Note: the client secret itself can only be fully verified by a real sign-in — OAuth providers have no
                &quot;check secret&quot; API. Everything above passing means the flow is wired correctly.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <strong>How tenants work:</strong> every tenant site&apos;s &quot;Continue with {meta.name}&quot; automatically uses
        these platform keys — the user is returned to the exact tenant site (or admin) they started from. A tenant only
        needs its own provider app if it wants sign-in branded with its own name; that is configured per tenant via the
        tenant OAuth API.
      </div>
    </div>
  );
}
