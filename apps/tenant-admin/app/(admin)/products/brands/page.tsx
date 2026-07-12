'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ecommerceApi } from '@/lib/api';
import { PageHeader, Card, EmptyState, Btn, Field, Input, SlideOver } from '../../_ui';

interface Brand {
  id: string;
  name: string;
  logoUrl?: string | null;
}

const EMPTY = { name: '', logoUrl: '' };

export default function BrandsPage() {
  const subdomain = (useParams()?.subdomain as string) || 'vrfitness';
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain]);

  async function fetchBrands() {
    setLoading(true);
    const r = await ecommerceApi.brands.list(subdomain);
    if (r.data) setBrands(Array.isArray(r.data) ? r.data : []);
    else if (r.error) setError(r.error);
    setLoading(false);
  }

  function openCreate() {
    setForm(EMPTY);
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const r = await ecommerceApi.brands.create(subdomain, {
      name: form.name,
      logoUrl: form.logoUrl || undefined,
    });
    if (r.error) alert(r.error);
    else {
      setOpen(false);
      fetchBrands();
    }
    setSaving(false);
  }

  async function handleDelete(brand: Brand) {
    if (!confirm(`Delete brand "${brand.name}"?`)) return;
    const r = await ecommerceApi.brands.remove(subdomain, brand.id);
    if (r.error) alert(r.error);
    else fetchBrands();
  }

  return (
    <div>
      <PageHeader
        title="Brands"
        subtitle="Manage the brands carried in your store"
        action={
          <div className="flex items-center gap-2">
            <Link href="/products" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
              ← Products
            </Link>
            <Btn onClick={openCreate}>+ New Brand</Btn>
          </div>
        }
      />

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {loading ? (
        <Card><div className="p-10 text-center text-gray-400">Loading…</div></Card>
      ) : brands.length === 0 ? (
        <Card><EmptyState icon="🏷️" title="No brands yet" msg="Add brands to help customers filter products." /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {brands.map((brand) => (
            <Card key={brand.id} className="p-4">
              <div className="flex items-center gap-3">
                {brand.logoUrl ? (
                  <img src={brand.logoUrl} alt={brand.name} className="w-10 h-10 object-contain rounded border border-gray-200" />
                ) : (
                  <div className="w-10 h-10 rounded bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
                    {brand.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="font-semibold text-gray-900 flex-1 truncate">{brand.name}</div>
              </div>
              <div className="flex items-center justify-end mt-3">
                <button onClick={() => handleDelete(brand)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SlideOver open={open} onClose={() => setOpen(false)} title="New Brand">
        <Field label="Name *">
          <Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Nike" />
        </Field>
        <Field label="Logo URL">
          <Input value={form.logoUrl} onChange={(e: any) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://example.com/logo.png" />
        </Field>
        {form.logoUrl && <img src={form.logoUrl} alt="Preview" className="h-16 object-contain rounded-lg mb-4" />}
        <div className="flex items-center justify-end gap-2 mt-2">
          <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving || !form.name.trim()}>{saving ? 'Saving…' : 'Create'}</Btn>
        </div>
      </SlideOver>
    </div>
  );
}
