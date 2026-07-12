'use client';

import { useEffect, useState } from 'react';
import { ecommerceApi } from '@/lib/api';
import { Card, Field, Input } from '../_ui';

export interface ProductFormValues {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  categoryId: string;
  brandId: string;
  sellingPrice: string;
  costPrice: string;
  taxRatePercent: string;
  trackInventory: boolean;
  isFeatured: boolean;
  reorderPoint: string;
  images: string[];
  metaTitle: string;
  metaDescription: string;
  openingStock: string;
}

export const EMPTY_PRODUCT: ProductFormValues = {
  name: '',
  sku: '',
  barcode: '',
  description: '',
  categoryId: '',
  brandId: '',
  sellingPrice: '',
  costPrice: '',
  taxRatePercent: '',
  trackInventory: true,
  isFeatured: false,
  reorderPoint: '',
  images: [],
  metaTitle: '',
  metaDescription: '',
  openingStock: '',
};

export default function ProductForm({
  subdomain,
  values,
  onChange,
  isCreate = false,
}: {
  subdomain: string;
  values: ProductFormValues;
  onChange: (v: ProductFormValues) => void;
  isCreate?: boolean;
}) {
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [imageInput, setImageInput] = useState('');

  useEffect(() => {
    ecommerceApi.categories.list(subdomain).then((r) => r.data && setCategories(Array.isArray(r.data) ? r.data : []));
    ecommerceApi.brands.list(subdomain).then((r) => r.data && setBrands(Array.isArray(r.data) ? r.data : []));
  }, [subdomain]);

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  function addImage() {
    const url = imageInput.trim();
    if (url && !values.images.includes(url)) set('images', [...values.images, url]);
    setImageInput('');
  }

  const previewSlug = values.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || '…';

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <Field label="Name *">
          <Input value={values.name} onChange={(e: any) => set('name', e.target.value)} placeholder="Product name" />
        </Field>
        <Field label="Slug (auto-generated)">
          <code className="text-xs bg-gray-100 px-2 py-1.5 rounded text-gray-700 block">/{previewSlug}</code>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="SKU">
            <Input value={values.sku} onChange={(e: any) => set('sku', e.target.value)} placeholder="SKU-001" />
          </Field>
          <Field label="Barcode">
            <Input value={values.barcode} onChange={(e: any) => set('barcode', e.target.value)} placeholder="Barcode" />
          </Field>
        </div>
        <Field label="Description">
          <textarea
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            placeholder="Product description"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <select
              value={values.categoryId}
              onChange={(e) => set('categoryId', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Brand">
            <select
              value={values.brandId}
              onChange={(e) => set('brandId', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Images (URLs)">
          <div className="flex flex-wrap items-center gap-2 border border-gray-300 rounded-lg px-2 py-1.5 bg-white mb-2">
            {values.images.map((img) => (
              <span key={img} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-1 rounded-full max-w-[180px]">
                <span className="truncate">{img}</span>
                <button type="button" onClick={() => set('images', values.images.filter((i) => i !== img))} className="hover:text-indigo-900">×</button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={imageInput}
              onChange={(e) => setImageInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImage(); } }}
              placeholder="https://example.com/image.jpg"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button type="button" onClick={addImage} className="rounded-lg px-3 py-2 text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200">Add</button>
          </div>
          {values.images[0] && <img src={values.images[0]} alt="Preview" className="h-24 object-cover rounded-lg mt-3" />}
        </Field>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-gray-900 mb-4">Pricing &amp; Inventory</h3>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Selling Price *">
            <Input type="number" step="0.01" value={values.sellingPrice} onChange={(e: any) => set('sellingPrice', e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Cost Price">
            <Input type="number" step="0.01" value={values.costPrice} onChange={(e: any) => set('costPrice', e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Tax Rate (%)">
            <Input type="number" step="0.01" value={values.taxRatePercent} onChange={(e: any) => set('taxRatePercent', e.target.value)} placeholder="0" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Reorder Point">
            <Input type="number" value={values.reorderPoint} onChange={(e: any) => set('reorderPoint', e.target.value)} placeholder="0" />
          </Field>
          {isCreate && (
            <Field label="Opening Stock">
              <Input type="number" value={values.openingStock} onChange={(e: any) => set('openingStock', e.target.value)} placeholder="0" />
            </Field>
          )}
        </div>
        <div className="flex items-center gap-6 mt-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input type="checkbox" checked={values.trackInventory} onChange={(e) => set('trackInventory', e.target.checked)} className="rounded border-gray-300" />
            Track inventory
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input type="checkbox" checked={values.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} className="rounded border-gray-300" />
            Featured product
          </label>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-gray-900 mb-4">SEO</h3>
        <Field label="Meta Title">
          <Input value={values.metaTitle} onChange={(e: any) => set('metaTitle', e.target.value)} placeholder="SEO title (defaults to product name)" />
        </Field>
        <Field label="Meta Description">
          <textarea
            value={values.metaDescription}
            onChange={(e) => set('metaDescription', e.target.value)}
            rows={2}
            placeholder="SEO description"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
      </Card>
    </div>
  );
}
