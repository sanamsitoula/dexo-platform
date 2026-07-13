'use client';

import { useEffect, useState } from 'react';
import { tenantApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import FileUpload from '@/components/FileUpload';

export default function StaffProfilePage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', avatarUrl: '' });

  useEffect(() => {
    (async () => {
      const r = await tenantApi.getProfile(subdomain);
      if (r.data) {
        setProfile(r.data);
        setForm({
          firstName: r.data.firstName || '',
          lastName: r.data.lastName || '',
          phone: r.data.phone || '',
          avatarUrl: r.data.avatarUrl || '',
        });
      }
      setLoading(false);
    })();
  }, [subdomain]);

  async function save() {
    setSaving(true);
    setMsg(null);
    const r = await tenantApi.updateProfile(subdomain, form);
    setSaving(false);
    setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: 'Profile updated.' });
  }

  if (loading) return <div className="text-gray-400">Loading…</div>;

  return (
    <div className="max-w-lg">
      <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
      <p className="mt-1 text-gray-500">{profile?.email}</p>

      <div className="mt-6 bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Profile photo</label>
          <FileUpload
            subdomain={subdomain}
            documentType="PROFILE_PIC"
            isPublic
            preview={
              form.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.avatarUrl} alt="Profile" className="w-16 h-16 rounded-full object-cover mb-2 border border-gray-200" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold mb-2">
                  {(form.firstName || profile?.email || '?').charAt(0).toUpperCase()}
                </div>
              )
            }
            onUploaded={(files) => { if (files[0]) setForm((f) => ({ ...f, avatarUrl: files[0].url })) }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
            <input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
            <input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {msg && <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>}
        </div>
      </div>
    </div>
  );
}
