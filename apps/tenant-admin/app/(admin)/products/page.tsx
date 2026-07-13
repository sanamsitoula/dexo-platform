'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ecommerceApi } from '@/lib/api';
import { resolveTenantAdminSubdomain } from '@/lib/subdomain';
import { PageHeader, Card, EmptyState, Badge, Btn } from '../_ui';

const PAGE_SIZE = 10;

export default function ProductsPage() {
  const subdomain = resolveTenantAdminSubdomain();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    ecommerceApi.categories.list(subdomain).then((r) => r.data && setCategories(Array.isArray(r.data) ? r.data : []));
    ecommerceApi.brands.list(subdomain).then((r) => r.data && setBrands(Array.isArray(r.data) ? r.data : []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain]);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain, categoryId, brandId]);

  async function fetchProducts() {
    setLoading(true);
    const r = await ecommerceApi.products.list(subdomain, {
      categoryId: categoryId || undefined,
      brandId: brandId || undefined,
      q: search || undefined,
    });
    if (r.data) {
      setProducts(Array.isArray(r.data) ? r.data : []);
      setError(null);
    } else if (r.error) {
      setError(r.error);
    }
    setLoading(false);
    setPage(1);
  }

  async function handleDelete(product: any) {
    if (!confirm(`Delete product "${product.name}"? This cannot be undone.`)) return;
    const r = await ecommerceApi.products.remove(subdomain, product.id);
    if (r.error) alert(r.error);
    else fetchProducts();
  }

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const pageItems = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function totalStock(product: any) {
    if (Array.isArray(product.stockLevels)) {
      return product.stockLevels.reduce((s: number, sl: any) => s + (sl.quantity || 0), 0);
    }
    return product.stockQuantity ?? product.stock ?? '—';
  }

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage your storefront catalog"
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

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
          placeholder="Search by name or SKU…"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-64"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <Card>
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : pageItems.length === 0 ? (
          <EmptyState icon="📦" title="No products yet" msg="Add your first product to start selling." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Product</th>
                  <th className="text-left px-4 py-3 font-semibold">SKU</th>
                  <th className="text-left px-4 py-3 font-semibold">Price</th>
                  <th className="text-left px-4 py-3 font-semibold">Stock</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageItems.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="w-12 h-12 object-cover rounded-md border border-gray-200" />
                        ) : (
                          <div className="w-12 h-12 rounded-md bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                            {(product.name || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900 max-w-xs truncate">{product.name}</div>
                          <div className="text-xs text-gray-400">{product.category?.name || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{product.sku || '—'}</td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">
                      {product.sellingPrice != null ? `$${Number(product.sellingPrice).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{totalStock(product)}</td>
                    <td className="px-4 py-3">
                      {product.isFeatured ? <Badge color="indigo">Featured</Badge> : <Badge color="gray">Standard</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                      <Link href={`/products/${product.id}`} className="text-indigo-600 hover:text-indigo-800 font-semibold">Edit</Link>
                      <button onClick={() => handleDelete(product)} className="text-red-600 hover:text-red-800">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
