'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ecommerceApi } from '@/lib/api';
import { PageHeader, Btn, Card, Field, Input, Badge } from '../../_ui';
import ProductForm, { ProductFormValues, EMPTY_PRODUCT } from '../_form';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const subdomain = (params?.subdomain as string) || 'vrfitness';

  const [values, setValues] = useState<ProductFormValues>(EMPTY_PRODUCT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [variants, setVariants] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [newVariant, setNewVariant] = useState<{ sku: string; priceOverride: string; barcode: string; valueIds: string[] }>({
    sku: '',
    priceOverride: '',
    barcode: '',
    valueIds: [],
  });
  const [addingVariant, setAddingVariant] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadProduct();
    ecommerceApi.attributes.list(subdomain).then((r) => r.data && setAttributes(Array.isArray(r.data) ? r.data : []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, subdomain]);

  async function loadProduct() {
    setLoading(true);
    const r = await ecommerceApi.products.getById(subdomain, id);
    if (r.data) {
      const p: any = r.data;
      setValues({
        name: p.name || '',
        sku: p.sku || '',
        barcode: p.barcode || '',
        description: p.description || '',
        categoryId: p.categoryId || '',
        brandId: p.brandId || '',
        sellingPrice: p.sellingPrice != null ? String(p.sellingPrice) : '',
        costPrice: p.costPrice != null ? String(p.costPrice) : '',
        taxRatePercent: p.taxRatePercent != null ? String(p.taxRatePercent) : '',
        trackInventory: p.trackInventory ?? true,
        isFeatured: p.isFeatured ?? false,
        reorderPoint: p.reorderPoint != null ? String(p.reorderPoint) : '',
        images: Array.isArray(p.images) ? p.images : [],
        metaTitle: p.metaTitle || '',
        metaDescription: p.metaDescription || '',
        openingStock: '',
      });
      setVariants(Array.isArray(p.variants) ? p.variants : []);
      setError('');
    } else if (r.error) {
      setError(r.error);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    const r = await ecommerceApi.products.update(subdomain, id, {
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
    });
    if (r.error) setError(r.error);
    else setSuccess('Product updated successfully');
    setSaving(false);
  }

  function toggleValueId(valueId: string) {
    setNewVariant((v) => ({
      ...v,
      valueIds: v.valueIds.includes(valueId) ? v.valueIds.filter((x) => x !== valueId) : [...v.valueIds, valueId],
    }));
  }

  async function handleAddVariant() {
    if (!newVariant.valueIds.length) { alert('Select at least one attribute value'); return; }
    setAddingVariant(true);
    const r = await ecommerceApi.variants.create(subdomain, id, {
      sku: newVariant.sku || undefined,
      priceOverride: newVariant.priceOverride ? Number(newVariant.priceOverride) : undefined,
      barcode: newVariant.barcode || undefined,
      valueIds: newVariant.valueIds,
    });
    if (r.error) alert(r.error);
    else {
      setNewVariant({ sku: '', priceOverride: '', barcode: '', valueIds: [] });
      loadProduct();
    }
    setAddingVariant(false);
  }

  async function handleDeleteVariant(variantId: string) {
    if (!confirm('Delete this variant?')) return;
    const r = await ecommerceApi.variants.remove(subdomain, variantId);
    if (r.error) alert(r.error);
    else loadProduct();
  }

  if (loading) return <div className="p-10 text-center text-gray-400">Loading product…</div>;

  return (
    <div>
      <PageHeader
        title="Edit Product"
        subtitle="Update product details"
        action={values.isFeatured ? <Badge color="indigo">Featured</Badge> : undefined}
      />

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      <ProductForm subdomain={subdomain} values={values} onChange={setValues} />

      <div className="flex items-center justify-end gap-3 mt-6">
        <Btn variant="ghost" onClick={() => router.push('/products')}>Back</Btn>
        <Btn onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Btn>
      </div>

      <Card className="p-6 mt-8">
        <h3 className="font-bold text-gray-900 mb-4">Variants</h3>

        {variants.length === 0 ? (
          <p className="text-sm text-gray-500 mb-4">No variants yet.</p>
        ) : (
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">SKU</th>
                  <th className="text-left px-3 py-2 font-semibold">Price Override</th>
                  <th className="text-left px-3 py-2 font-semibold">Barcode</th>
                  <th className="text-right px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variants.map((v) => (
                  <tr key={v.id}>
                    <td className="px-3 py-2 text-gray-900 font-semibold">{v.sku || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{v.priceOverride != null ? `$${Number(v.priceOverride).toFixed(2)}` : '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{v.barcode || '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => handleDeleteVariant(v.id)} className="text-red-600 hover:text-red-800">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Add Variant</h4>
          {attributes.length === 0 ? (
            <p className="text-sm text-gray-500">No attributes defined yet. Create attributes (e.g. Size, Color) from the API before adding variants.</p>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {attributes.map((attr) => (
                  <div key={attr.id}>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{attr.name}</div>
                    <div className="flex flex-wrap gap-2">
                      {(attr.values || []).map((val: any) => (
                        <button
                          key={val.id}
                          type="button"
                          onClick={() => toggleValueId(val.id)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                            newVariant.valueIds.includes(val.id)
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {val.value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Variant SKU">
                  <Input value={newVariant.sku} onChange={(e: any) => setNewVariant((v) => ({ ...v, sku: e.target.value }))} placeholder="SKU-001-M" />
                </Field>
                <Field label="Price Override">
                  <Input type="number" step="0.01" value={newVariant.priceOverride} onChange={(e: any) => setNewVariant((v) => ({ ...v, priceOverride: e.target.value }))} placeholder="0.00" />
                </Field>
                <Field label="Barcode">
                  <Input value={newVariant.barcode} onChange={(e: any) => setNewVariant((v) => ({ ...v, barcode: e.target.value }))} placeholder="Barcode" />
                </Field>
              </div>
              <div className="flex justify-end">
                <Btn onClick={handleAddVariant} disabled={addingVariant}>{addingVariant ? 'Adding…' : '+ Add Variant'}</Btn>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
