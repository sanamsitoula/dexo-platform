'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ecommerceApi } from '@/lib/api';
import { PageHeader, Btn } from '../../_ui';
import ProductForm, { ProductFormValues, EMPTY_PRODUCT } from '../_form';

export default function NewProductPage() {
  const router = useRouter();
  const subdomain = (useParams()?.subdomain as string) || 'vrfitness';
  const [values, setValues] = useState<ProductFormValues>(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!values.name.trim()) { setError('Name is required'); return; }
    if (!values.sellingPrice) { setError('Selling price is required'); return; }
    setSaving(true);
    setError('');
    const r = await ecommerceApi.products.create(subdomain, {
      name: values.name,
      sellingPrice: Number(values.sellingPrice),
      categoryId: values.categoryId || undefined,
      brandId: values.brandId || undefined,
      sku: values.sku || undefined,
      barcode: values.barcode || undefined,
      description: values.description || undefined,
      images: values.images.length ? values.images : undefined,
      costPrice: values.costPrice ? Number(values.costPrice) : undefined,
      taxRatePercent: values.taxRatePercent ? Number(values.taxRatePercent) : undefined,
      trackInventory: values.trackInventory,
      isFeatured: values.isFeatured,
      reorderPoint: values.reorderPoint ? Number(values.reorderPoint) : undefined,
      metaTitle: values.metaTitle || undefined,
      metaDescription: values.metaDescription || undefined,
      openingStock: values.openingStock ? Number(values.openingStock) : undefined,
    });
    if (r.error) setError(r.error);
    else router.push('/products');
    setSaving(false);
  }

  return (
    <div>
      <PageHeader title="Add Product" subtitle="Create a new product for your storefront" />

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <ProductForm subdomain={subdomain} values={values} onChange={setValues} isCreate />

      <div className="flex items-center justify-end gap-3 mt-6">
        <Btn variant="ghost" onClick={() => router.push('/products')}>Cancel</Btn>
        <Btn onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Create Product'}</Btn>
      </div>
    </div>
  );
}
