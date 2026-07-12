'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ecommerceApi } from '@/lib/api';
import { PageHeader, Card, EmptyState, Btn, Field, Input, SlideOver, Badge } from '../_ui';

const EMPTY_ADJUST = { productId: '', variantId: '', warehouseId: '', quantityChange: '', reason: '' };
const EMPTY_WAREHOUSE = { name: '', code: '', address: '', isDefault: false };

export default function InventoryPage() {
  const subdomain = (useParams()?.subdomain as string) || 'vrfitness';
  const [stock, setStock] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [warehouseFilter, setWarehouseFilter] = useState('');

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState(EMPTY_ADJUST);
  const [adjusting, setAdjusting] = useState(false);

  const [warehouseOpen, setWarehouseOpen] = useState(false);
  const [warehouseForm, setWarehouseForm] = useState(EMPTY_WAREHOUSE);
  const [savingWarehouse, setSavingWarehouse] = useState(false);

  useEffect(() => {
    ecommerceApi.products.list(subdomain).then((r) => r.data && setProducts(Array.isArray(r.data) ? r.data : []));
    fetchWarehouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain]);

  useEffect(() => {
    fetchStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain, showLowStock, warehouseFilter]);

  async function fetchStock() {
    setLoading(true);
    const r = showLowStock
      ? await ecommerceApi.stock.low(subdomain)
      : await ecommerceApi.stock.list(subdomain, warehouseFilter || undefined);
    if (r.data) {
      setStock(Array.isArray(r.data) ? r.data : []);
      setError('');
    } else if (r.error) {
      setError(r.error);
    }
    setLoading(false);
  }

  async function fetchWarehouses() {
    const r = await ecommerceApi.warehouses.list(subdomain);
    if (r.data) setWarehouses(Array.isArray(r.data) ? r.data : []);
  }

  function openAdjust() {
    setAdjustForm(EMPTY_ADJUST);
    setAdjustOpen(true);
  }

  async function handleAdjust() {
    if (!adjustForm.productId || !adjustForm.warehouseId || !adjustForm.quantityChange) {
      alert('Product, warehouse, and quantity change are required');
      return;
    }
    setAdjusting(true);
    const r = await ecommerceApi.stock.adjust(subdomain, {
      productId: adjustForm.productId,
      variantId: adjustForm.variantId || undefined,
      warehouseId: adjustForm.warehouseId,
      quantityChange: Number(adjustForm.quantityChange),
      reason: adjustForm.reason || undefined,
    });
    if (r.error) alert(r.error);
    else {
      setAdjustOpen(false);
      fetchStock();
    }
    setAdjusting(false);
  }

  function openCreateWarehouse() {
    setWarehouseForm(EMPTY_WAREHOUSE);
    setWarehouseOpen(true);
  }

  async function handleSaveWarehouse() {
    if (!warehouseForm.name.trim()) return;
    setSavingWarehouse(true);
    const r = await ecommerceApi.warehouses.create(subdomain, {
      name: warehouseForm.name,
      code: warehouseForm.code || undefined,
      address: warehouseForm.address || undefined,
      isDefault: warehouseForm.isDefault,
    });
    if (r.error) alert(r.error);
    else {
      setWarehouseOpen(false);
      fetchWarehouses();
    }
    setSavingWarehouse(false);
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Track stock levels across warehouses"
        action={<Btn onClick={openAdjust}>+ Adjust Stock</Btn>}
      />

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <div className="flex items-center gap-3 mb-4">
        <select
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          disabled={showLowStock}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
        >
          <option value="">All warehouses</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <input type="checkbox" checked={showLowStock} onChange={(e) => setShowLowStock(e.target.checked)} className="rounded border-gray-300" />
          Low stock only
        </label>
      </div>

      <Card>
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : stock.length === 0 ? (
          <EmptyState icon="📦" title="No stock records" msg="Adjust stock to start tracking inventory." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Product</th>
                  <th className="text-left px-4 py-3 font-semibold">Variant</th>
                  <th className="text-left px-4 py-3 font-semibold">Warehouse</th>
                  <th className="text-left px-4 py-3 font-semibold">Quantity</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stock.map((s) => {
                  const isLow = s.product?.reorderPoint != null && s.quantityOnHand <= s.product.reorderPoint;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">{s.product?.name || s.productId}</td>
                      <td className="px-4 py-3 text-gray-600">{s.variant?.sku || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{s.warehouse?.name || s.warehouseId}</td>
                      <td className="px-4 py-3 text-gray-900 font-semibold">{s.quantityOnHand}</td>
                      <td className="px-4 py-3">
                        {isLow ? <Badge color="red">Low Stock</Badge> : <Badge color="green">OK</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-8 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Warehouses</h3>
          <Btn variant="ghost" onClick={openCreateWarehouse}>+ New Warehouse</Btn>
        </div>
        {warehouses.length === 0 ? (
          <p className="text-sm text-gray-500">No warehouses configured yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map((w) => (
              <div key={w.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">{w.name}</div>
                  {w.isDefault && <Badge color="indigo">Default</Badge>}
                </div>
                {w.code && <div className="text-xs text-gray-400 mt-1">{w.code}</div>}
                {w.address && <div className="text-sm text-gray-500 mt-1">{w.address}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <SlideOver open={adjustOpen} onClose={() => setAdjustOpen(false)} title="Adjust Stock">
        <Field label="Product *">
          <select
            value={adjustForm.productId}
            onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Variant ID (optional)">
          <Input value={adjustForm.variantId} onChange={(e: any) => setAdjustForm({ ...adjustForm, variantId: e.target.value })} placeholder="Variant ID" />
        </Field>
        <Field label="Warehouse *">
          <select
            value={adjustForm.warehouseId}
            onChange={(e) => setAdjustForm({ ...adjustForm, warehouseId: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select warehouse</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Quantity Change *">
          <Input type="number" value={adjustForm.quantityChange} onChange={(e: any) => setAdjustForm({ ...adjustForm, quantityChange: e.target.value })} placeholder="e.g. 10 or -5" />
        </Field>
        <Field label="Reason">
          <Input value={adjustForm.reason} onChange={(e: any) => setAdjustForm({ ...adjustForm, reason: e.target.value })} placeholder="e.g. Restock, damaged goods" />
        </Field>
        <div className="flex items-center justify-end gap-2 mt-2">
          <Btn variant="ghost" onClick={() => setAdjustOpen(false)}>Cancel</Btn>
          <Btn onClick={handleAdjust} disabled={adjusting}>{adjusting ? 'Saving…' : 'Adjust'}</Btn>
        </div>
      </SlideOver>

      <SlideOver open={warehouseOpen} onClose={() => setWarehouseOpen(false)} title="New Warehouse">
        <Field label="Name *">
          <Input value={warehouseForm.name} onChange={(e: any) => setWarehouseForm({ ...warehouseForm, name: e.target.value })} placeholder="e.g. Main Warehouse" />
        </Field>
        <Field label="Code">
          <Input value={warehouseForm.code} onChange={(e: any) => setWarehouseForm({ ...warehouseForm, code: e.target.value })} placeholder="e.g. WH-01" />
        </Field>
        <Field label="Address">
          <textarea
            value={warehouseForm.address}
            onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
          <input
            type="checkbox"
            checked={warehouseForm.isDefault}
            onChange={(e) => setWarehouseForm({ ...warehouseForm, isDefault: e.target.checked })}
            className="rounded border-gray-300"
          />
          Set as default warehouse
        </label>
        <div className="flex items-center justify-end gap-2 mt-2">
          <Btn variant="ghost" onClick={() => setWarehouseOpen(false)}>Cancel</Btn>
          <Btn onClick={handleSaveWarehouse} disabled={savingWarehouse || !warehouseForm.name.trim()}>{savingWarehouse ? 'Saving…' : 'Create'}</Btn>
        </div>
      </SlideOver>
    </div>
  );
}
