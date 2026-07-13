'use client';

import { useEffect, useState } from 'react';
import { paymentGatewayApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, EmptyState, Btn, Field, Input, SlideOver, Badge } from '../../_ui';

interface Provider {
  id: string;
  type: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TEST_MODE';
  hasCredentials: boolean;
  isDefault: boolean;
  transactionFeePercent?: number | null;
  fixedFee?: number | null;
  supportedCurrencies?: string[];
}

// Only the providers with a real, working implementation in
// apps/api/src/modules/payment-gateway/providers — khalti is a Prisma enum
// value with no provider class yet, so it's excluded here.
const PROVIDER_TYPES: { value: string; label: string; defaultCurrency: string }[] = [
  { value: 'STRIPE', label: 'Stripe', defaultCurrency: 'USD' },
  { value: 'PAYPAL', label: 'PayPal', defaultCurrency: 'USD' },
  { value: 'ESEWA', label: 'eSewa', defaultCurrency: 'NPR' },
  { value: 'FONEPAY', label: 'Fonepay', defaultCurrency: 'NPR' },
  { value: 'CONNECTIPS', label: 'ConnectIPS', defaultCurrency: 'NPR' },
];

// Credential field definitions per provider type — names match exactly what
// each provider class reads off config.credentials (see providers/*.provider.ts).
const CREDENTIAL_FIELDS: Record<string, { key: string; label: string; placeholder?: string; type?: string }[]> = {
  STRIPE: [
    { key: 'secretKey', label: 'Secret Key', placeholder: 'sk_live_...', type: 'password' },
    { key: 'publishableKey', label: 'Publishable Key', placeholder: 'pk_live_...' },
  ],
  PAYPAL: [
    { key: 'clientId', label: 'Client ID' },
    { key: 'clientSecret', label: 'Client Secret', type: 'password' },
  ],
  ESEWA: [
    { key: 'merchantId', label: 'Merchant / Product Code' },
    { key: 'secretKey', label: 'Secret Key', type: 'password' },
  ],
  FONEPAY: [
    { key: 'merchantId', label: 'Merchant ID (PID)' },
    { key: 'secretKey', label: 'Secret Key', type: 'password' },
  ],
  CONNECTIPS: [
    { key: 'merchantId', label: 'Merchant ID' },
    { key: 'appId', label: 'App ID' },
    { key: 'appName', label: 'App Name' },
    { key: 'password', label: 'Password', type: 'password' },
    { key: 'pfxBase64', label: 'PFX Certificate (base64)', type: 'password' },
  ],
};

const STATUS_COLOR: Record<string, 'green' | 'amber' | 'gray'> = {
  ACTIVE: 'green',
  TEST_MODE: 'amber',
  INACTIVE: 'gray',
};

const EMPTY_FORM = {
  type: 'STRIPE',
  name: '',
  isDefault: false,
  supportedCurrencies: 'USD',
  transactionFeePercent: '',
  fixedFee: '',
  sandbox: true,
};

export default function PaymentSettingsPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain]);

  async function fetchProviders() {
    setLoading(true);
    const r = await paymentGatewayApi.listTenantProviders(subdomain);
    if (r.data) setProviders(Array.isArray(r.data) ? r.data : []);
    else if (r.error) setError(r.error);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCredentials({});
    setOpen(true);
  }

  function openEdit(p: Provider) {
    setEditing(p);
    setForm({
      type: p.type,
      name: p.name,
      isDefault: p.isDefault,
      supportedCurrencies: (p.supportedCurrencies || []).join(', ') || PROVIDER_TYPES.find((t) => t.value === p.type)?.defaultCurrency || '',
      transactionFeePercent: p.transactionFeePercent != null ? String(p.transactionFeePercent) : '',
      fixedFee: p.fixedFee != null ? String(p.fixedFee) : '',
      sandbox: true,
    });
    // Credentials are never returned by the API — leave blank; only fields the
    // user re-enters get sent (existing stored credentials stay untouched
    // server-side only if we send them again, so we require re-entry here).
    setCredentials({});
    setOpen(true);
  }

  function onTypeChange(type: string) {
    const meta = PROVIDER_TYPES.find((t) => t.value === type);
    setForm((f) => ({ ...f, type, supportedCurrencies: meta?.defaultCurrency || f.supportedCurrencies }));
    setCredentials({});
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    const fields = CREDENTIAL_FIELDS[form.type] || [];
    const missing = fields.filter((f) => !credentials[f.key]?.trim());
    if (!editing && missing.length > 0) {
      alert(`Please fill in: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    setSaving(true);
    const payload = {
      type: form.type,
      name: form.name,
      credentials,
      config: { sandbox: form.sandbox },
      isDefault: form.isDefault,
      transactionFeePercent: form.transactionFeePercent ? Number(form.transactionFeePercent) : undefined,
      fixedFee: form.fixedFee ? Number(form.fixedFee) : undefined,
      supportedCurrencies: form.supportedCurrencies
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean),
    };
    const r = await paymentGatewayApi.saveProvider(subdomain, payload);
    if (r.error) alert(r.error);
    else {
      setOpen(false);
      fetchProviders();
    }
    setSaving(false);
  }

  const fields = CREDENTIAL_FIELDS[form.type] || [];

  return (
    <div>
      <PageHeader
        title="Payment Gateways"
        subtitle="Connect payment providers so customers can pay for orders online."
        action={<Btn onClick={openCreate}>+ Add Provider</Btn>}
      />

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <Card>
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : providers.length === 0 ? (
          <EmptyState icon="💳" title="No payment providers configured" msg="Add a provider like eSewa, Stripe, or PayPal to start accepting payments." />
        ) : (
          <div className="divide-y divide-gray-100">
            {providers.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{p.name}</span>
                    {p.isDefault && <span title="Default provider">⭐</span>}
                    <Badge color={STATUS_COLOR[p.status] || 'gray'}>{p.status.replace('_', ' ')}</Badge>
                    <Badge color={p.hasCredentials ? 'indigo' : 'red'}>
                      {p.hasCredentials ? 'Credentials set' : 'No credentials'}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {PROVIDER_TYPES.find((t) => t.value === p.type)?.label || p.type}
                    {p.supportedCurrencies?.length ? ` · ${p.supportedCurrencies.join(', ')}` : ''}
                    {p.transactionFeePercent ? ` · ${p.transactionFeePercent}% fee` : ''}
                    {p.fixedFee ? ` + ${p.fixedFee} fixed` : ''}
                  </div>
                </div>
                <button onClick={() => openEdit(p)} className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm">Edit</button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <SlideOver open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Payment Provider' : 'Add Payment Provider'}>
        <Field label="Provider *">
          <select
            value={form.type}
            onChange={(e) => onTypeChange(e.target.value)}
            disabled={!!editing}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
          >
            {PROVIDER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Display Name *">
          <Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Stripe Checkout" />
        </Field>

        {editing && (
          <p className="text-xs text-gray-500 -mt-2 mb-4">
            Credentials are never shown again for security. Re-enter them below to rotate/update, or leave blank to keep the existing ones (note: the API upserts the full record, so leaving a field blank may clear it — check with your backend team if unsure).
          </p>
        )}

        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <Input
              type={f.type || 'text'}
              value={credentials[f.key] || ''}
              onChange={(e: any) => setCredentials({ ...credentials, [f.key]: e.target.value })}
              placeholder={f.placeholder}
            />
          </Field>
        ))}

        <Field label="Supported Currencies (comma-separated)">
          <Input
            value={form.supportedCurrencies}
            onChange={(e: any) => setForm({ ...form, supportedCurrencies: e.target.value })}
            placeholder="NPR, USD"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Transaction Fee %">
            <Input
              type="number"
              step="0.01"
              value={form.transactionFeePercent}
              onChange={(e: any) => setForm({ ...form, transactionFeePercent: e.target.value })}
              placeholder="0"
            />
          </Field>
          <Field label="Fixed Fee">
            <Input
              type="number"
              step="0.01"
              value={form.fixedFee}
              onChange={(e: any) => setForm({ ...form, fixedFee: e.target.value })}
              placeholder="0"
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 mb-4 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.sandbox}
            onChange={(e) => setForm({ ...form, sandbox: e.target.checked })}
          />
          Sandbox / test mode
        </label>

        <label className="flex items-center gap-2 mb-4 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
          />
          Set as default provider
        </label>

        <div className="flex items-center justify-end gap-2 mt-2">
          <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving || !form.name.trim()}>{saving ? 'Saving…' : editing ? 'Save' : 'Create'}</Btn>
        </div>
      </SlideOver>
    </div>
  );
}
