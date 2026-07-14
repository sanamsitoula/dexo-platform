'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ecommerceApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, EmptyState, Badge, Btn } from '../_ui';

const PAGE_SIZE = 10;
const COLUMNS_STORAGE_KEY = 'dexo-products-columns';

type ColumnKey =
  | 'image' | 'name' | 'sku' | 'barcode' | 'category' | 'brand'
  | 'price' | 'costPrice' | 'tax' | 'stock' | 'reorderPoint' | 'status' | 'featured';

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'image', label: 'Image' },
  { key: 'name', label: 'Name' },
  { key: 'sku', label: 'SKU' },
  { key: 'barcode', label: 'Barcode' },
  { key: 'category', label: 'Category' },
  { key: 'brand', label: 'Brand' },
  { key: 'price', label: 'Price' },
  { key: 'costPrice', label: 'Cost Price' },
  { key: 'tax', label: 'Tax %' },
  { key: 'stock', label: 'Stock' },
  { key: 'reorderPoint', label: 'Reorder Point' },
  { key: 'status', label: 'Status' },
  { key: 'featured', label: 'Featured' },
];

const DEFAULT_COLUMNS: ColumnKey[] = ['image', 'name', 'sku', 'category', 'price', 'stock', 'status'];

function loadColumnPrefs(): ColumnKey[] {
  if (typeof window === 'undefined') return DEFAULT_COLUMNS;
  try {
    const raw = window.localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (!raw) return DEFAULT_COLUMNS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    // ignore malformed localStorage value
  }
  return DEFAULT_COLUMNS;
}

export default function ProductsPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('all');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [stockStatus, setStockStatus] = useState<'' | 'in_stock' | 'low_stock' | 'out_of_stock'>('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [page, setPage] = useState(1);

  const [view, setView] = useState<'table' | 'cards'>('table');
  const [columns, setColumns] = useState<ColumnKey[]>(DEFAULT_COLUMNS);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);

  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ created: number; updated: number; errors: { row: number; message: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setColumns(loadColumnPrefs());
  }, []);

  function toggleColumn(key: ColumnKey) {
    setColumns((prev) => {
      const next = prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key];
      if (typeof window !== 'undefined') window.localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  useEffect(() => {
    ecommerceApi.categories.list(subdomain).then((r) => r.data && setCategories(Array.isArray(r.data) ? r.data : []));
    ecommerceApi.brands.list(subdomain).then((r) => r.data && setBrands(Array.isArray(r.data) ? r.data : []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const r = await ecommerceApi.products.listPaginated(subdomain, {
      page,
      limit: PAGE_SIZE,
      categoryId: categoryId || undefined,
      brandId: brandId || undefined,
      q: search || undefined,
      status,
      featured: featuredOnly || undefined,
      stockStatus: stockStatus || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
    if (r.data) {
      setProducts(Array.isArray(r.data.items) ? r.data.items : []);
      setTotal(r.data.total ?? 0);
      setTotalPages(Math.max(1, r.data.totalPages ?? 1));
      setError(null);
    } else if (r.error) {
      setError(r.error);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain, page, categoryId, brandId, status, featuredOnly, stockStatus, minPrice, maxPrice]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Filter changes should reset back to page 1 rather than staying on a
  // page that may no longer exist under the new filter set.
  function applyFilterReset() {
    setPage(1);
    fetchProducts();
  }

  async function handleDelete(product: any) {
    if (!confirm(`Delete product "${product.name}"? This cannot be undone.`)) return;
    const r = await ecommerceApi.products.remove(subdomain, product.id);
    if (r.error) alert(r.error);
    else fetchProducts();
  }

  function totalStock(product: any) {
    if (Array.isArray(product.stockItems)) {
      return product.stockItems.reduce((s: number, si: any) => s + (si.quantityOnHand || 0), 0);
    }
    if (Array.isArray(product.stockLevels)) {
      return product.stockLevels.reduce((s: number, sl: any) => s + (sl.quantity || 0), 0);
    }
    return product.stockQuantity ?? product.stock ?? '—';
  }

  function stockBadge(product: any) {
    const stock = totalStock(product);
    if (typeof stock !== 'number') return null;
    if (stock <= 0) return <Badge color="red">Out of stock</Badge>;
    if (product.reorderPoint != null && stock <= product.reorderPoint) return <Badge color="amber">Low stock</Badge>;
    return <Badge color="green">In stock</Badge>;
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExport() {
    setExporting(true);
    const r = await ecommerceApi.products.exportCsv(subdomain, {
      categoryId: categoryId || undefined,
      brandId: brandId || undefined,
      q: search || undefined,
      status,
      featured: featuredOnly || undefined,
    });
    setExporting(false);
    if (r.error || !r.data) { alert(r.error || 'Export failed'); return; }
    downloadBlob(r.data, 'products-export.csv');
  }

  async function handleDownloadSample() {
    const r = await ecommerceApi.products.importSampleCsv(subdomain);
    if (r.error || !r.data) { alert(r.error || 'Could not download sample'); return; }
    downloadBlob(r.data, 'products-import-sample.csv');
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportSummary(null);
    const r = await ecommerceApi.products.import(subdomain, file);
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (r.error || !r.data) { alert(r.error || 'Import failed'); return; }
    setImportSummary(r.data);
    fetchProducts();
  }

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={`Manage your storefront catalog · ${total} product${total === 1 ? '' : 's'}`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/products/categories" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
              Categories
            </Link>
            <Link href="/products/brands" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
              Brands
            </Link>
            <Link href="/products/new" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition">
              + New Product
            </Link>
          </div>
        }
      />

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {/* Import / Export toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <Btn variant="ghost" onClick={handleDownloadSample}>Download sample</Btn>
        <Btn variant="ghost" onClick={handleExport} disabled={exporting}>{exporting ? 'Exporting…' : 'Export'}</Btn>
        <label className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition cursor-pointer">
          {importing ? 'Uploading…' : 'Upload CSV'}
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} disabled={importing} className="hidden" />
        </label>

        <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('table')}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${view === 'table' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >
            Table
          </button>
          <button
            onClick={() => setView('cards')}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${view === 'cards' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >
            Cards
          </button>
        </div>

        {view === 'table' && (
          <div className="relative">
            <Btn variant="outline" onClick={() => setColumnMenuOpen((o) => !o)}>Columns ▾</Btn>
            {columnMenuOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-2" onMouseLeave={() => setColumnMenuOpen(false)}>
                {ALL_COLUMNS.map((c) => (
                  <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded cursor-pointer">
                    <input type="checkbox" checked={columns.includes(c.key)} onChange={() => toggleColumn(c.key)} className="rounded border-gray-300" />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {importSummary && (
        <div className="mb-4 bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-3 rounded-lg text-sm">
          <div className="font-semibold">
            Import complete: {importSummary.created} created, {importSummary.updated} updated
            {importSummary.errors.length > 0 && `, ${importSummary.errors.length} error${importSummary.errors.length === 1 ? '' : 's'}`}.
          </div>
          {importSummary.errors.length > 0 && (
            <ul className="mt-2 list-disc list-inside space-y-0.5">
              {importSummary.errors.map((e, i) => (
                <li key={i}>Row {e.row}: {e.message}</li>
              ))}
            </ul>
          )}
          <button onClick={() => setImportSummary(null)} className="mt-2 text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilterReset()}
          placeholder="Search by name or SKU…"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-64"
        />
        <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={brandId} onChange={(e) => { setBrandId(e.target.value); setPage(1); }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All brands</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value as any); setPage(1); }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={stockStatus} onChange={(e) => { setStockStatus(e.target.value as any); setPage(1); }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All stock levels</option>
          <option value="in_stock">In stock</option>
          <option value="low_stock">Low stock</option>
          <option value="out_of_stock">Out of stock</option>
        </select>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <input type="checkbox" checked={featuredOnly} onChange={(e) => { setFeaturedOnly(e.target.checked); setPage(1); }} className="rounded border-gray-300" />
          Featured only
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilterReset()}
            placeholder="Min price"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-28"
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilterReset()}
            placeholder="Max price"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-28"
          />
          <Btn variant="ghost" onClick={applyFilterReset}>Apply</Btn>
        </div>
      </div>

      {loading ? (
        <Card><div className="p-10 text-center text-gray-400">Loading…</div></Card>
      ) : products.length === 0 ? (
        <Card><EmptyState icon="📦" title="No products yet" msg="Add your first product to start selling." /></Card>
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="p-4">
              {product.images?.[0] ? (
                <img src={product.images[0]} alt="" className="w-full h-32 object-cover rounded-lg border border-gray-200 mb-3" />
              ) : (
                <div className="w-full h-32 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-2xl mb-3">
                  {(product.name || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="font-semibold text-gray-900 truncate">{product.name}</div>
              <div className="text-xs text-gray-400 mb-2">{product.sku || '—'}</div>
              <div className="text-lg font-extrabold text-indigo-600">
                {product.sellingPrice != null ? `$${Number(product.sellingPrice).toFixed(2)}` : '—'}
              </div>
              <div className="text-xs text-gray-500 mb-2">Stock: {totalStock(product)}</div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {product.isActive === false ? <Badge color="gray">Inactive</Badge> : <Badge color="green">Active</Badge>}
                {product.isFeatured && <Badge color="indigo">Featured</Badge>}
                {stockBadge(product)}
              </div>
              <div className="flex items-center justify-between">
                <Link href={`/products/${product.id}`} className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold">Edit</Link>
                <button onClick={() => handleDelete(product)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  {columns.includes('image') && <th className="text-left px-4 py-3 font-semibold">Image</th>}
                  {columns.includes('name') && <th className="text-left px-4 py-3 font-semibold">Name</th>}
                  {columns.includes('sku') && <th className="text-left px-4 py-3 font-semibold">SKU</th>}
                  {columns.includes('barcode') && <th className="text-left px-4 py-3 font-semibold">Barcode</th>}
                  {columns.includes('category') && <th className="text-left px-4 py-3 font-semibold">Category</th>}
                  {columns.includes('brand') && <th className="text-left px-4 py-3 font-semibold">Brand</th>}
                  {columns.includes('price') && <th className="text-left px-4 py-3 font-semibold">Price</th>}
                  {columns.includes('costPrice') && <th className="text-left px-4 py-3 font-semibold">Cost Price</th>}
                  {columns.includes('tax') && <th className="text-left px-4 py-3 font-semibold">Tax %</th>}
                  {columns.includes('stock') && <th className="text-left px-4 py-3 font-semibold">Stock</th>}
                  {columns.includes('reorderPoint') && <th className="text-left px-4 py-3 font-semibold">Reorder Point</th>}
                  {columns.includes('status') && <th className="text-left px-4 py-3 font-semibold">Status</th>}
                  {columns.includes('featured') && <th className="text-left px-4 py-3 font-semibold">Featured</th>}
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    {columns.includes('image') && (
                      <td className="px-4 py-3">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="w-12 h-12 object-cover rounded-md border border-gray-200" />
                        ) : (
                          <div className="w-12 h-12 rounded-md bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                            {(product.name || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </td>
                    )}
                    {columns.includes('name') && (
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 max-w-xs truncate">{product.name}</div>
                      </td>
                    )}
                    {columns.includes('sku') && <td className="px-4 py-3 text-gray-600">{product.sku || '—'}</td>}
                    {columns.includes('barcode') && <td className="px-4 py-3 text-gray-600">{product.barcode || '—'}</td>}
                    {columns.includes('category') && <td className="px-4 py-3 text-gray-600">{product.category?.name || '—'}</td>}
                    {columns.includes('brand') && <td className="px-4 py-3 text-gray-600">{product.brand?.name || '—'}</td>}
                    {columns.includes('price') && (
                      <td className="px-4 py-3 text-gray-900 font-semibold">
                        {product.sellingPrice != null ? `$${Number(product.sellingPrice).toFixed(2)}` : '—'}
                      </td>
                    )}
                    {columns.includes('costPrice') && (
                      <td className="px-4 py-3 text-gray-600">
                        {product.costPrice != null ? `$${Number(product.costPrice).toFixed(2)}` : '—'}
                      </td>
                    )}
                    {columns.includes('tax') && <td className="px-4 py-3 text-gray-600">{product.taxRatePercent != null ? `${Number(product.taxRatePercent)}%` : '—'}</td>}
                    {columns.includes('stock') && <td className="px-4 py-3 text-gray-600">{totalStock(product)}</td>}
                    {columns.includes('reorderPoint') && <td className="px-4 py-3 text-gray-600">{product.reorderPoint ?? '—'}</td>}
                    {columns.includes('status') && (
                      <td className="px-4 py-3">
                        {product.isActive === false ? <Badge color="gray">Inactive</Badge> : <Badge color="green">Active</Badge>}
                      </td>
                    )}
                    {columns.includes('featured') && (
                      <td className="px-4 py-3">
                        {product.isFeatured ? <Badge color="indigo">Featured</Badge> : <span className="text-gray-400">—</span>}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                      <Link href={`/products/${product.id}`} className="text-indigo-600 hover:text-indigo-800 font-semibold">Edit</Link>
                      <button onClick={() => handleDelete(product)} className="text-red-600 hover:text-red-800">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-4">
          <Btn variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>← Prev</Btn>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <Btn variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next →</Btn>
        </div>
      )}
    </div>
  );
}
