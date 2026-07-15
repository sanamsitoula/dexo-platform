import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { WebhooksService } from '../webhooks/webhooks.service';
import { EcommerceLedgerService } from './ecommerce-ledger.service';
import { PaymentGatewayService } from '../payment-gateway/payment-gateway.service';

/**
 * Ecommerce domain service — Catalog, Inventory, Cart, Checkout, Shipment.
 *
 * Finance integration: checkout creates an Invoice linked to the SalesOrder
 * and posts a GL journal entry via EcommerceLedgerService (revenue + VAT +
 * COGS where cost data is available) — see ecommerce-ledger.service.ts.
 * COD orders post immediately (DR Accounts Receivable, since cash isn't
 * collected until delivery). PREPAID orders defer GL posting until the
 * payment gateway callback confirms payment (confirmPayment()) — the
 * Invoice is still created at checkout time so an order always has a
 * paper trail, but GL revenue is recognized only once cash is confirmed
 * received (DR Cash/Bank).
 *
 * Payment gateway wiring: PREPAID checkout calls
 * PaymentGatewayService.initPayment and returns the redirect/session
 * details to the caller; confirmPayment() calls verifyPayment and, on
 * success, marks the order + invoice paid and triggers ledger posting.
 *
 * Stock is deducted synchronously at checkout via StockItem +
 * StockLedgerEntry, the same audit-trail pattern used by the rest of the
 * platform's finance ledger.
 *
 * Checkout/status changes emit generic webhook events (order.created,
 * order.status_changed, order.cancelled, order.payment_confirmed,
 * shipment.created, shipment.status_changed, product.low_stock) via
 * WebhooksService — the same "plug and play" bus any other module can use.
 */
/**
 * Minimum catalog size enforced on delete. A storefront with fewer than this
 * many products/categories renders an empty/sparse grid and looks broken —
 * which is exactly what the demo seed (see ProvisioningService) exists to
 * prevent. Tenants must grow their catalog above the floor before trimming
 * the demo rows. Count-based (no isDemo flag on the schema) so it protects
 * user-created rows too, not just the seeded ones.
 */
const MIN_CATALOG_PRODUCTS = 5;
const MIN_CATALOG_CATEGORIES = 5;

@Injectable()
export class EcommerceService {
  constructor(
    private prisma: PrismaService,
    private webhooks: WebhooksService,
    private ledger: EcommerceLedgerService,
    private paymentGateway: PaymentGatewayService,
  ) {}

  private async assertExists<T extends { findFirst: (args: any) => Promise<any> }>(
    model: T,
    tenantId: string,
    id: string,
    label: string,
  ) {
    const row = await model.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException(`${label} not found`);
    return row;
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  // ---------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------
  listCategories(tenantId: string) {
    return this.prisma.productCategory.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async createCategory(tenantId: string, dto: any) {
    if (!dto?.name) throw new BadRequestException('name is required');
    const slug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.name);
    const existing = await this.prisma.productCategory.findFirst({ where: { tenantId, slug } });
    if (existing) throw new ConflictException('A category with this slug already exists');
    return this.prisma.productCategory.create({
      data: { tenantId, name: dto.name, slug, parentId: dto.parentId || null },
    });
  }

  async updateCategory(tenantId: string, id: string, dto: any) {
    await this.assertExists(this.prisma.productCategory, tenantId, id, 'Category');
    return this.prisma.productCategory.update({
      where: { id },
      data: { name: dto.name, parentId: dto.parentId },
    });
  }

  async deleteCategory(tenantId: string, id: string) {
    await this.assertExists(this.prisma.productCategory, tenantId, id, 'Category');
    const total = await this.prisma.productCategory.count({ where: { tenantId } });
    if (total <= MIN_CATALOG_CATEGORIES) {
      throw new BadRequestException(
        `A storefront needs at least ${MIN_CATALOG_CATEGORIES} categories to look complete. Please add more categories first, then remove this one.`,
      );
    }
    return this.prisma.productCategory.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------
  // Brands
  // ---------------------------------------------------------------------
  listBrands(tenantId: string) {
    return this.prisma.brand.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  createBrand(tenantId: string, dto: any) {
    if (!dto?.name) throw new BadRequestException('name is required');
    return this.prisma.brand.create({ data: { tenantId, name: dto.name, logoUrl: dto.logoUrl || null } });
  }

  async deleteBrand(tenantId: string, id: string) {
    await this.assertExists(this.prisma.brand, tenantId, id, 'Brand');
    return this.prisma.brand.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------
  // Products
  // ---------------------------------------------------------------------
  async listProducts(tenantId: string, q?: { categoryId?: string; brandId?: string; search?: string; activeOnly?: boolean }) {
    return this.prisma.product.findMany({
      where: {
        tenantId,
        categoryId: q?.categoryId || undefined,
        brandId: q?.brandId || undefined,
        isActive: q?.activeOnly ? true : undefined,
        ...(q?.search ? { name: { contains: q.search, mode: 'insensitive' as const } } : {}),
      },
      include: { category: true, brand: true, variants: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Paginated, filterable product listing for the tenant-admin Products page.
   * Server-side pagination + most filters map straight to a Prisma `where`;
   * `stockStatus` is the one exception — total on-hand stock is an aggregate
   * across StockItem rows with no denormalized column to filter/sort on in
   * Prisma, so when it's requested we fetch the where-matching set (category/
   * brand/status/featured/price/search applied), compute stock per product in
   * JS, filter, then paginate the filtered array in memory. Fine at gym/shop
   * catalog scale (hundreds–low thousands of SKUs); would need a materialized
   * stock-total column to stay a single indexed query at larger scale.
   */
  async listProductsPaginated(
    tenantId: string,
    q: {
      page?: number;
      limit?: number;
      categoryId?: string;
      brandId?: string;
      search?: string;
      status?: 'active' | 'inactive' | 'all';
      featured?: boolean;
      stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
      minPrice?: number;
      maxPrice?: number;
    },
  ) {
    const page = Math.max(1, q.page || 1);
    const limit = Math.min(100, Math.max(1, q.limit || 10));

    const where: any = {
      tenantId,
      categoryId: q.categoryId || undefined,
      brandId: q.brandId || undefined,
      isActive: q.status === 'active' ? true : q.status === 'inactive' ? false : undefined,
      isFeatured: q.featured ? true : undefined,
    };
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' as const } },
        { sku: { contains: q.search, mode: 'insensitive' as const } },
      ];
    }
    if (q.minPrice != null || q.maxPrice != null) {
      where.sellingPrice = {
        ...(q.minPrice != null ? { gte: q.minPrice } : {}),
        ...(q.maxPrice != null ? { lte: q.maxPrice } : {}),
      };
    }

    if (!q.stockStatus) {
      const [items, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          include: { category: true, brand: true, variants: true, stockItems: true },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.product.count({ where }),
      ]);
      return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
    }

    // stockStatus set — fetch the full filtered set, filter by computed stock in JS, then paginate.
    const all = await this.prisma.product.findMany({
      where,
      include: { category: true, brand: true, variants: true, stockItems: true },
      orderBy: { createdAt: 'desc' },
    });
    const withStock = all.filter((p) => {
      const stock = p.stockItems.reduce((s, si) => s + si.quantityOnHand, 0);
      if (q.stockStatus === 'out_of_stock') return stock <= 0;
      if (q.stockStatus === 'low_stock') return stock > 0 && p.reorderPoint != null && stock <= p.reorderPoint;
      // in_stock
      return stock > 0 && (p.reorderPoint == null || stock > p.reorderPoint);
    });
    const total = withStock.length;
    const items = withStock.slice((page - 1) * limit, page * limit);
    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  /** Full CSV export of the tenant's catalog, honoring the same filters as listProductsPaginated (minus pagination). */
  async exportProductsCsv(
    tenantId: string,
    q: { categoryId?: string; brandId?: string; search?: string; status?: 'active' | 'inactive' | 'all'; featured?: boolean },
  ) {
    const where: any = {
      tenantId,
      categoryId: q.categoryId || undefined,
      brandId: q.brandId || undefined,
      isActive: q.status === 'active' ? true : q.status === 'inactive' ? false : undefined,
      isFeatured: q.featured ? true : undefined,
    };
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' as const } },
        { sku: { contains: q.search, mode: 'insensitive' as const } },
      ];
    }
    const products = await this.prisma.product.findMany({
      where,
      include: { category: true, brand: true },
      orderBy: { createdAt: 'desc' },
    });
    return this.toCsv(this.csvHeaders(), products.map((p) => this.productToCsvRow(p)));
  }

  private csvHeaders() {
    return ['name', 'sku', 'barcode', 'description', 'categoryName', 'brandName', 'sellingPrice', 'costPrice', 'taxRatePercent', 'trackInventory', 'isActive', 'isFeatured', 'reorderPoint'];
  }

  private productToCsvRow(p: any): string[] {
    return [
      p.name ?? '',
      p.sku ?? '',
      p.barcode ?? '',
      p.description ?? '',
      p.category?.name ?? '',
      p.brand?.name ?? '',
      String(p.sellingPrice ?? ''),
      String(p.costPrice ?? ''),
      String(p.taxRatePercent ?? ''),
      String(p.trackInventory ?? ''),
      String(p.isActive ?? ''),
      String(p.isFeatured ?? ''),
      p.reorderPoint != null ? String(p.reorderPoint) : '',
    ];
  }

  private csvEscape(value: string): string {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  }

  private toCsv(headers: string[], rows: string[][]): string {
    return [headers, ...rows].map((row) => row.map((v) => this.csvEscape(String(v ?? ''))).join(',')).join('\n');
  }

  /** Downloadable CSV template for bulk product import, with two illustrative example rows. */
  getImportSampleCsv(): string {
    return this.toCsv(this.csvHeaders(), [
      ['Whey Protein 1kg', 'SKU-WHEY-1KG', '8901234567890', 'Chocolate flavor whey protein', 'Supplements', 'MuscleTech', '3500', '2500', '13', 'true', 'true', 'true', '10'],
      ['Yoga Mat', 'SKU-YOGA-01', '', 'Non-slip 6mm yoga mat', 'Accessories', 'Generic', '1200', '700', '13', 'true', 'true', 'false', '5'],
    ]);
  }

  /** Minimal CSV line parser — handles quoted fields with embedded commas/newlines/escaped quotes. No external dependency needed for this well-defined column format. */
  private parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (inQuotes) {
        if (c === '"') {
          if (s[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field); field = '';
      } else if (c === '\n') {
        row.push(field); field = '';
        rows.push(row); row = [];
      } else {
        field += c;
      }
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
  }

  /**
   * Upserts products by SKU from a CSV buffer (same headers as getImportSampleCsv).
   * Category/brand names are resolved to IDs, auto-creating them if they don't
   * exist yet — same on-the-fly-create UX as the New Product form's category/
   * brand dropdowns. Bad rows are skipped and reported rather than aborting
   * the whole import.
   */
  async importProductsCsv(tenantId: string, buffer: Buffer): Promise<{ created: number; updated: number; errors: { row: number; message: string }[] }> {
    const text = buffer.toString('utf-8');
    const rows = this.parseCsv(text);
    if (rows.length === 0) return { created: 0, updated: 0, errors: [{ row: 0, message: 'Empty file' }] };

    const header = rows[0].map((h) => h.trim());
    const idx = (col: string) => header.indexOf(col);
    const need = ['name', 'sku', 'sellingPrice'];
    for (const col of need) {
      if (idx(col) === -1) {
        return { created: 0, updated: 0, errors: [{ row: 0, message: `Missing required column "${col}"` }] };
      }
    }

    const categoryCache = new Map<string, string>();
    const brandCache = new Map<string, string>();
    let created = 0;
    let updated = 0;
    const errors: { row: number; message: string }[] = [];

    for (let r = 1; r < rows.length; r++) {
      const rowNum = r + 1; // 1-based, header is row 1
      const cols = rows[r];
      try {
        const get = (col: string) => (idx(col) >= 0 ? (cols[idx(col)] ?? '').trim() : '');
        const name = get('name');
        const sku = get('sku');
        const sellingPriceStr = get('sellingPrice');
        if (!name) throw new Error('missing name');
        if (!sku) throw new Error('missing sku');
        if (!sellingPriceStr) throw new Error('missing sellingPrice');
        const sellingPrice = Number(sellingPriceStr);
        if (Number.isNaN(sellingPrice)) throw new Error('sellingPrice is not a number');

        const categoryName = get('categoryName');
        const brandName = get('brandName');

        let categoryId: string | undefined;
        if (categoryName) {
          if (categoryCache.has(categoryName)) {
            categoryId = categoryCache.get(categoryName);
          } else {
            const slug = this.slugify(categoryName);
            let cat = await this.prisma.productCategory.findFirst({ where: { tenantId, OR: [{ slug }, { name: categoryName }] } });
            if (!cat) cat = await this.prisma.productCategory.create({ data: { tenantId, name: categoryName, slug } });
            categoryId = cat.id;
            categoryCache.set(categoryName, categoryId);
          }
        }

        let brandId: string | undefined;
        if (brandName) {
          if (brandCache.has(brandName)) {
            brandId = brandCache.get(brandName);
          } else {
            let brand = await this.prisma.brand.findFirst({ where: { tenantId, name: brandName } });
            if (!brand) brand = await this.prisma.brand.create({ data: { tenantId, name: brandName } });
            brandId = brand.id;
            brandCache.set(brandName, brandId);
          }
        }

        const costPriceStr = get('costPrice');
        const taxRateStr = get('taxRatePercent');
        const reorderPointStr = get('reorderPoint');
        const data = {
          name,
          categoryId: categoryId ?? null,
          brandId: brandId ?? null,
          barcode: get('barcode') || null,
          description: get('description') || null,
          sellingPrice,
          costPrice: costPriceStr ? Number(costPriceStr) : 0,
          taxRatePercent: taxRateStr ? Number(taxRateStr) : 0,
          trackInventory: get('trackInventory') ? /^true$/i.test(get('trackInventory')) : true,
          isActive: get('isActive') ? /^true$/i.test(get('isActive')) : true,
          isFeatured: get('isFeatured') ? /^true$/i.test(get('isFeatured')) : false,
          reorderPoint: reorderPointStr ? Number(reorderPointStr) : null,
        };

        const existing = await this.prisma.product.findFirst({ where: { tenantId, sku } });
        if (existing) {
          await this.prisma.product.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          const slug = this.slugify(name);
          await this.prisma.product.create({ data: { tenantId, sku, slug, ...data } });
          created++;
        }
      } catch (e: any) {
        errors.push({ row: rowNum, message: e?.message || 'Unknown error' });
      }
    }

    return { created, updated, errors };
  }

  async getProduct(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: { category: true, brand: true, variants: true, stockItems: { include: { warehouse: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  /** Lookup by exact SKU — used by the staff AI tool ("search products by SKU"). */
  async findProductBySku(tenantId: string, sku: string) {
    const product = await this.prisma.product.findFirst({
      where: { tenantId, sku },
      include: { category: true, brand: true, variants: true },
    });
    if (!product) throw new NotFoundException('Product not found for that SKU');
    return product;
  }

  /** Active-only product detail — used by the customer-self AI tool, never exposes inactive/draft products. */
  async getActiveProduct(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, isActive: true },
      include: { category: true, brand: true, variants: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async createProduct(tenantId: string, dto: any) {
    if (!dto?.name || dto.sellingPrice == null) {
      throw new BadRequestException('name and sellingPrice are required');
    }
    const slug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.name);
    const sku = dto.sku || `SKU-${Date.now().toString(36).toUpperCase()}`;

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        categoryId: dto.categoryId || null,
        brandId: dto.brandId || null,
        name: dto.name,
        slug,
        sku,
        barcode: dto.barcode || null,
        description: dto.description || null,
        images: dto.images || undefined,
        costPrice: dto.costPrice ?? 0,
        sellingPrice: dto.sellingPrice,
        taxRatePercent: dto.taxRatePercent ?? 0,
        trackInventory: dto.trackInventory ?? true,
        isFeatured: dto.isFeatured ?? false,
        reorderPoint: dto.reorderPoint ?? null,
        metaTitle: dto.metaTitle || null,
        metaDescription: dto.metaDescription || null,
      },
    });

    // Seed opening stock in the tenant's default warehouse, if provided.
    if (dto.openingStock != null) {
      const warehouse = await this.getOrCreateDefaultWarehouse(tenantId);
      await this.adjustStock(tenantId, {
        productId: product.id,
        warehouseId: warehouse.id,
        quantityChange: Number(dto.openingStock),
        reason: 'ADJUSTMENT',
      });
    }
    return product;
  }

  async updateProduct(tenantId: string, id: string, dto: any) {
    await this.assertExists(this.prisma.product, tenantId, id, 'Product');
    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        description: dto.description,
        images: dto.images,
        costPrice: dto.costPrice,
        sellingPrice: dto.sellingPrice,
        taxRatePercent: dto.taxRatePercent,
        isActive: dto.isActive,
        isFeatured: dto.isFeatured,
        reorderPoint: dto.reorderPoint,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
      },
    });
  }

  async deleteProduct(tenantId: string, id: string) {
    await this.assertExists(this.prisma.product, tenantId, id, 'Product');
    const total = await this.prisma.product.count({ where: { tenantId } });
    if (total <= MIN_CATALOG_PRODUCTS) {
      throw new BadRequestException(
        `A storefront needs at least ${MIN_CATALOG_PRODUCTS} products to look complete. Please add more products first, then remove this one.`,
      );
    }
    return this.prisma.product.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------
  // Product Attributes & Variations — reusable option groups (e.g. "Size":
  // S/M/L, "Color": Red/Blue) attached to variants via the join table, so
  // storefronts can render proper "Size / Color" pickers instead of opaque
  // free-form JSON.
  // ---------------------------------------------------------------------
  listAttributes(tenantId: string) {
    return this.prisma.productAttribute.findMany({
      where: { tenantId },
      include: { values: true },
      orderBy: { name: 'asc' },
    });
  }

  async createAttribute(tenantId: string, dto: { name: string; values?: string[] }) {
    if (!dto?.name) throw new BadRequestException('name is required');
    return this.prisma.productAttribute.create({
      data: {
        tenantId,
        name: dto.name,
        values: dto.values?.length ? { create: dto.values.map((v) => ({ value: v })) } : undefined,
      },
      include: { values: true },
    });
  }

  async addAttributeValue(tenantId: string, attributeId: string, value: string) {
    await this.assertExists(this.prisma.productAttribute, tenantId, attributeId, 'Attribute');
    if (!value) throw new BadRequestException('value is required');
    return this.prisma.productAttributeValue.create({ data: { attributeId, value } });
  }

  async deleteAttribute(tenantId: string, id: string) {
    await this.assertExists(this.prisma.productAttribute, tenantId, id, 'Attribute');
    return this.prisma.productAttribute.delete({ where: { id } });
  }

  /** Creates a variant carrying a specific combination of attribute values (e.g. Size=M + Color=Red). */
  async createVariant(tenantId: string, productId: string, dto: { sku?: string; priceOverride?: number; barcode?: string; valueIds: string[] }) {
    await this.assertExists(this.prisma.product, tenantId, productId, 'Product');
    if (!dto?.valueIds?.length) throw new BadRequestException('At least one attribute valueId is required');
    const sku = dto.sku || `VAR-${Date.now().toString(36).toUpperCase()}`;
    return this.prisma.productVariant.create({
      data: {
        productId,
        sku,
        priceOverride: dto.priceOverride ?? null,
        barcode: dto.barcode || null,
        attributes: {}, // structured values live in attributeValues; kept for backward-compat display
        attributeValues: { create: dto.valueIds.map((valueId) => ({ valueId })) },
      },
      include: { attributeValues: { include: { value: { include: { attribute: true } } } } },
    });
  }

  async deleteVariant(tenantId: string, id: string) {
    const variant = await this.prisma.productVariant.findFirst({ where: { id, product: { tenantId } } });
    if (!variant) throw new NotFoundException('Variant not found');
    return this.prisma.productVariant.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------
  // Warehouses & Stock
  // ---------------------------------------------------------------------
  listWarehouses(tenantId: string) {
    return this.prisma.warehouse.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
  }

  async createWarehouse(tenantId: string, dto: any) {
    if (!dto?.name) throw new BadRequestException('name is required');
    const code = dto.code || this.slugify(dto.name).toUpperCase();
    return this.prisma.warehouse.create({
      data: { tenantId, name: dto.name, code, address: dto.address || null, isDefault: dto.isDefault ?? false },
    });
  }

  /** Every tenant needs at least one warehouse before selling — auto-provisioned. */
  async getOrCreateDefaultWarehouse(tenantId: string) {
    const existing = await this.prisma.warehouse.findFirst({ where: { tenantId, isDefault: true } });
    if (existing) return existing;
    const any = await this.prisma.warehouse.findFirst({ where: { tenantId } });
    if (any) return any;
    return this.prisma.warehouse.create({
      data: { tenantId, name: 'Main Warehouse', code: 'MAIN', isDefault: true },
    });
  }

  async getStockLevels(tenantId: string, warehouseId?: string) {
    return this.prisma.stockItem.findMany({
      where: { tenantId, warehouseId: warehouseId || undefined },
      include: { product: true, variant: true, warehouse: true },
    });
  }

  /** Products at or below their configured reorder point — feeds the low-stock dashboard widget. */
  async getLowStockProducts(tenantId: string) {
    const items = await this.prisma.stockItem.findMany({
      where: { tenantId, product: { reorderPoint: { not: null } } },
      include: { product: true, warehouse: true },
    });
    return items.filter((i) => i.product.reorderPoint != null && i.quantityOnHand <= i.product.reorderPoint!);
  }

  /**
   * Postgres treats every NULL as distinct in a unique index, so the
   * `@@unique([productId, variantId, warehouseId])` constraint does NOT
   * actually prevent duplicate rows when variantId is null (Prisma's
   * generated compound-key input also requires a non-null variantId, which
   * doesn't fit the "no variant" case). Every stock lookup/write goes through
   * this find-or-create pair instead of the compound-unique shorthand.
   */
  private findStockItem(tx: any, productId: string, variantId: string | null | undefined, warehouseId: string) {
    return tx.stockItem.findFirst({ where: { productId, variantId: variantId || null, warehouseId } });
  }

  private async upsertStockItem(
    tx: any,
    tenantId: string,
    productId: string,
    variantId: string | null | undefined,
    warehouseId: string,
    quantityChange: number,
  ) {
    const existing = await this.findStockItem(tx, productId, variantId, warehouseId);
    if (existing) {
      return tx.stockItem.update({ where: { id: existing.id }, data: { quantityOnHand: { increment: quantityChange } } });
    }
    return tx.stockItem.create({
      data: { tenantId, productId, variantId: variantId || null, warehouseId, quantityOnHand: Math.max(quantityChange, 0) },
    });
  }

  /**
   * Adjust stock for a product/variant in a warehouse, writing an audit-trail
   * StockLedgerEntry. `quantityChange` is signed (+in / -out).
   */
  async adjustStock(
    tenantId: string,
    dto: { productId: string; variantId?: string; warehouseId: string; quantityChange: number; reason: string; refType?: string; refId?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const stockItem = await this.upsertStockItem(tx, tenantId, dto.productId, dto.variantId, dto.warehouseId, dto.quantityChange);

      if (stockItem.quantityOnHand < 0) {
        throw new BadRequestException('Insufficient stock for this operation');
      }

      await tx.stockLedgerEntry.create({
        data: {
          tenantId,
          productId: dto.productId,
          warehouseId: dto.warehouseId,
          quantityChange: dto.quantityChange,
          balanceAfter: stockItem.quantityOnHand,
          reason: dto.reason as any,
          refType: dto.refType,
          refId: dto.refId,
        },
      });

      return stockItem;
    });
  }

  // ---------------------------------------------------------------------
  // Customer resolution — Cart/SalesOrder relate to the finance Customer
  // model (shared with Invoice/AR), not directly to User. A logged-in
  // storefront shopper is lazily mapped to (or given) a Customer row.
  // ---------------------------------------------------------------------
  async getOrCreateCustomerForUser(tenantId: string, user: { id: string; email: string; firstName?: string; lastName?: string; phone?: string }) {
    const existing = await this.prisma.customer.findFirst({ where: { tenantId, email: user.email } });
    if (existing) return existing;
    return this.prisma.customer.create({
      data: {
        tenantId,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
        email: user.email,
        mobile: user.phone || null,
      },
    });
  }

  /**
   * Resolves the signed-in user (by userId, from AiContext) to their own
   * Customer record — used by the ecommerce-self AI tools so a tool never
   * has to accept a customerId argument from the model. Customer has no
   * direct userId FK (matched by email, same as getOrCreateCustomerForUser),
   * so this looks up the User row first.
   */
  async getCustomerForUserId(tenantId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) throw new NotFoundException('No user/email found for the current account');
    return this.getOrCreateCustomerForUser(tenantId, {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      phone: user.phone ?? undefined,
    });
  }

  /** Staff lookup — find customers by name/email/mobile (e.g. "find this customer's order history"). */
  async findCustomers(tenantId: string, search?: string) {
    return this.prisma.customer.findMany({
      where: {
        tenantId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
                { mobile: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
  }

  // ---------------------------------------------------------------------
  // Cart
  // ---------------------------------------------------------------------
  async getOrCreateCart(tenantId: string, customerId: string) {
    const existing = await this.prisma.cart.findFirst({
      where: { tenantId, customerId, status: 'ACTIVE' },
      include: { items: { include: { product: true, variant: true } } },
    });
    if (existing) return existing;
    return this.prisma.cart.create({
      data: { tenantId, customerId, status: 'ACTIVE' },
      include: { items: { include: { product: true, variant: true } } },
    });
  }

  async addToCart(tenantId: string, customerId: string, dto: { productId: string; variantId?: string; quantity: number }) {
    if (!dto?.productId || !dto.quantity || dto.quantity < 1) {
      throw new BadRequestException('productId and a positive quantity are required');
    }
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId, isActive: true } });
    if (!product) throw new NotFoundException('Product not found or unavailable');

    const cart = await this.getOrCreateCart(tenantId, customerId);
    const unitPrice = dto.variantId
      ? (await this.prisma.productVariant.findUnique({ where: { id: dto.variantId } }))?.priceOverride ?? product.sellingPrice
      : product.sellingPrice;

    const existingItem = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId: dto.productId, variantId: dto.variantId || null },
    });
    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + dto.quantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, productId: dto.productId, variantId: dto.variantId || null, quantity: dto.quantity, unitPrice },
      });
    }
    return this.getOrCreateCart(tenantId, customerId);
  }

  async updateCartItem(tenantId: string, customerId: string, itemId: string, quantity: number) {
    const cart = await this.getOrCreateCart(tenantId, customerId);
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw new NotFoundException('Cart item not found');
    if (quantity < 1) return this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }

  async removeCartItem(tenantId: string, customerId: string, itemId: string) {
    const cart = await this.getOrCreateCart(tenantId, customerId);
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw new NotFoundException('Cart item not found');
    return this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  // ---------------------------------------------------------------------
  // Checkout → SalesOrder (reserves + deducts stock, converts the cart)
  // ---------------------------------------------------------------------
  private async generateOrderNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.salesOrder.count({ where: { tenantId } });
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    return `ORD-${ym}-${String(count + 1).padStart(5, '0')}`;
  }

  async checkout(
    tenantId: string,
    customerId: string,
    dto: {
      shippingAddress?: any;
      couponCode?: string;
      paymentMethod?: 'COD' | 'PREPAID';
      providerType?: string;
      successUrl?: string;
      failureUrl?: string;
      cancelUrl?: string;
      customerEmail?: string;
      customerPhone?: string;
      customerName?: string;
    },
  ) {
    const cart = await this.getOrCreateCart(tenantId, customerId);
    if (!cart.items.length) throw new BadRequestException('Cart is empty');

    const warehouse = await this.getOrCreateDefaultWarehouse(tenantId);

    // Validate stock availability up-front for a clear error before any writes.
    for (const item of cart.items as any[]) {
      if (!item.product.trackInventory) continue;
      const stock = await this.findStockItem(this.prisma, item.productId, item.variantId, warehouse.id);
      if (!stock || stock.quantityOnHand < item.quantity) {
        throw new BadRequestException(`Insufficient stock for "${item.product.name}"`);
      }
    }

    let discountTotal = 0;
    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findFirst({
        where: { tenantId, code: dto.couponCode, status: 'ACTIVE' as any },
      });
      if (coupon) {
        const subtotal = (cart.items as any[]).reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
        discountTotal =
          coupon.type === ('PERCENTAGE' as any)
            ? Math.min(subtotal * (Number(coupon.value) / 100), Number(coupon.maxDiscount ?? Infinity))
            : Number(coupon.value);
      }
    }

    const subtotal = (cart.items as any[]).reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
    const taxTotal = (cart.items as any[]).reduce(
      (s, i) => s + (Number(i.unitPrice) * i.quantity * Number(i.product.taxRatePercent || 0)) / 100,
      0,
    );
    const grandTotal = Math.max(subtotal - discountTotal + taxTotal, 0);
    const orderNumber = await this.generateOrderNumber(tenantId);

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.salesOrder.create({
        data: {
          tenantId,
          customerId,
          orderNumber,
          status: 'CONFIRMED',
          subtotal,
          discountTotal,
          taxTotal,
          grandTotal,
          couponCode: dto.couponCode || null,
          shippingAddress: dto.shippingAddress || undefined,
          paymentMethod: dto.paymentMethod === 'COD' ? 'COD' : 'PREPAID',
          items: {
            create: (cart.items as any[]).map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              taxAmount: (Number(i.unitPrice) * i.quantity * Number(i.product.taxRatePercent || 0)) / 100,
              total: Number(i.unitPrice) * i.quantity,
            })),
          },
        },
        include: { items: true },
      });

      // Deduct stock + ledger entry per line (SALE).
      for (const item of cart.items as any[]) {
        if (!item.product.trackInventory) continue;
        const after = await this.upsertStockItem(tx, tenantId, item.productId, item.variantId, warehouse.id, -item.quantity);
        await tx.stockLedgerEntry.create({
          data: {
            tenantId,
            productId: item.productId,
            warehouseId: warehouse.id,
            quantityChange: -item.quantity,
            balanceAfter: after?.quantityOnHand ?? 0,
            reason: 'SALE',
            refType: 'SalesOrder',
            refId: created.id,
          },
        });
        if (item.product.reorderPoint != null && after.quantityOnHand <= item.product.reorderPoint) {
          void this.webhooks.emit(tenantId, 'product.low_stock', {
            productId: item.productId,
            productName: item.product.name,
            quantityOnHand: after.quantityOnHand,
            reorderPoint: item.product.reorderPoint,
          });
        }
      }

      await tx.cart.update({ where: { id: cart.id }, data: { status: 'CONVERTED' } });
      return created;
    });

    void this.webhooks.emit(tenantId, 'order.created', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      grandTotal: order.grandTotal,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      customerId,
    });

    // Finance: create the Invoice for every order up front (paper trail
    // regardless of payment timing).
    const orderWithItems = order as any as {
      id: string; orderNumber: string; customerId: string | null; subtotal: any;
      discountTotal: any; taxTotal: any; grandTotal: any; currency: string;
      paymentMethod: 'COD' | 'PREPAID'; items: any[];
    };
    await this.ledger.createInvoiceForOrder(tenantId, { ...orderWithItems, customerId });

    if (order.paymentMethod === 'COD') {
      // Revenue is recognized at the point of sale even though cash is
      // collected on delivery — DR Accounts Receivable, not Cash.
      void this.ledger.postSaleRevenue(tenantId, orderWithItems, { cashCollected: false });
      return order;
    }

    // PREPAID: hand off to the payment gateway. GL posting + Invoice
    // paid-status are deferred to confirmPayment() once the gateway
    // confirms the payment actually happened.
    if (!dto.providerType) {
      // No gateway selected — order stays PENDING until the caller wires
      // one up client-side (e.g. via the ecommerce checkout UI's provider
      // picker). Returning the order as-is keeps checkout non-blocking.
      return order;
    }

    try {
      const payment = await this.paymentGateway.initPayment(tenantId, dto.providerType, {
        orderId: order.id,
        amount: Number(order.grandTotal),
        currency: order.currency || 'NPR',
        description: `Order ${order.orderNumber}`,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        customerName: dto.customerName,
        successUrl: dto.successUrl || '',
        failureUrl: dto.failureUrl || '',
        cancelUrl: dto.cancelUrl,
      });
      return { ...order, payment };
    } catch (e: any) {
      // Payment init failing shouldn't lose the order/stock deduction —
      // surface the error alongside the order so the client can retry
      // payment separately (order stays PENDING).
      return { ...order, paymentError: e?.message || 'Payment initialization failed' };
    }
  }

  /**
   * Verifies a PREPAID order's payment with the gateway. On success: marks
   * the order CONFIRMED, the linked Invoice PAID, and posts the GL revenue
   * entry (DR Cash/Bank this time, not AR). Idempotent — EcommerceLedgerService
   * won't double-post if called more than once for the same order (e.g. a
   * retried webhook).
   */
  async confirmPayment(
    tenantId: string,
    orderId: string,
    providerType: string,
    verify: { providerTxnId: string; amount?: number; rawParams?: Record<string, any> },
  ) {
    const order = await this.assertExists(this.prisma.salesOrder, tenantId, orderId, 'Order');
    const items = await this.prisma.salesOrderItem.findMany({ where: { orderId } });

    const result = await this.paymentGateway.verifyPayment(tenantId, providerType, {
      providerTxnId: verify.providerTxnId,
      orderId,
      amount: verify.amount ?? Number(order.grandTotal),
      rawParams: verify.rawParams,
    });

    if (result.status === 'COMPLETED') {
      const updated = await this.prisma.salesOrder.update({
        where: { id: orderId },
        data: { status: order.status === 'PENDING' ? 'CONFIRMED' : order.status },
      });
      await this.ledger.markInvoicePaid(tenantId, orderId);
      void this.ledger.postSaleRevenue(
        tenantId,
        { ...updated, items } as any,
        { cashCollected: true, bank: providerType !== 'CASH' },
      );
      void this.webhooks.emit(tenantId, 'order.payment_confirmed', {
        orderId,
        orderNumber: order.orderNumber,
        providerType,
        providerTxnId: verify.providerTxnId,
      });
    }

    return result;
  }

  async listOrders(tenantId: string, customerId?: string) {
    return this.prisma.salesOrder.findMany({
      where: { tenantId, customerId: customerId || undefined },
      include: { items: { include: { product: true } }, shipments: true, customer: true },
      orderBy: { placedAt: 'desc' },
    });
  }

  /**
   * Per-customer spend rollup for tenant-admin's CRM/customer view. "Total
   * spent" only counts orders that represent committed revenue (excludes
   * CANCELLED/REFUNDED so a failed checkout doesn't inflate lifetime value).
   */
  async listCustomersWithSpend(tenantId: string) {
    const customers = await this.prisma.customer.findMany({ where: { tenantId } });
    const orders = await this.prisma.salesOrder.findMany({
      where: { tenantId, customerId: { not: null } },
      select: { customerId: true, grandTotal: true, status: true, placedAt: true },
    });

    const byCustomer = new Map<string, { totalSpent: number; orderCount: number; lastOrderAt: Date | null }>();
    for (const order of orders) {
      if (!order.customerId) continue;
      if (['CANCELLED', 'REFUNDED'].includes(order.status)) continue;
      const entry = byCustomer.get(order.customerId) || { totalSpent: 0, orderCount: 0, lastOrderAt: null };
      entry.totalSpent += Number(order.grandTotal);
      entry.orderCount += 1;
      if (!entry.lastOrderAt || order.placedAt > entry.lastOrderAt) entry.lastOrderAt = order.placedAt;
      byCustomer.set(order.customerId, entry);
    }

    return customers
      .map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        mobile: c.mobile,
        totalSpent: byCustomer.get(c.id)?.totalSpent ?? 0,
        orderCount: byCustomer.get(c.id)?.orderCount ?? 0,
        lastOrderAt: byCustomer.get(c.id)?.lastOrderAt ?? null,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }

  async getCustomerWithSpend(tenantId: string, customerId: string) {
    const customer = await this.assertExists(this.prisma.customer, tenantId, customerId, 'Customer');
    const orders = await this.prisma.salesOrder.findMany({
      where: { tenantId, customerId },
      include: { items: { include: { product: true } }, shipments: true },
      orderBy: { placedAt: 'desc' },
    });
    const completedOrders = orders.filter((o) => !['CANCELLED', 'REFUNDED'].includes(o.status));
    const totalSpent = completedOrders.reduce((s, o) => s + Number(o.grandTotal), 0);
    return { ...customer, totalSpent, orderCount: completedOrders.length, orders };
  }

  async getOrder(tenantId: string, id: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, tenantId },
      include: { items: { include: { product: true } }, shipments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /** Staff lookup — accepts either the SalesOrder.id or its human-facing orderNumber (e.g. "ORD-202607-00012"). */
  async findOrderByIdOrNumber(tenantId: string, idOrNumber: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { tenantId, OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }] },
      include: { items: { include: { product: true } }, shipments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /**
   * Self-scoped order lookup — verifies the order actually belongs to
   * `customerId` before returning it, so the ecommerce-self AI tools can
   * never be used to read another customer's order by guessing/enumerating
   * an id. Used for "my order status" and "track my shipment".
   */
  async getOwnOrder(tenantId: string, customerId: string, orderId: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id: orderId, tenantId, customerId },
      include: { items: { include: { product: true } }, shipments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateOrderStatus(tenantId: string, id: string, status: string) {
    await this.assertExists(this.prisma.salesOrder, tenantId, id, 'Order');
    const order = await this.prisma.salesOrder.update({ where: { id }, data: { status: status as any } });
    void this.webhooks.emit(tenantId, 'order.status_changed', { orderId: id, orderNumber: order.orderNumber, status });
    return order;
  }

  async cancelOrder(tenantId: string, id: string) {
    const order = await this.assertExists(this.prisma.salesOrder, tenantId, id, 'Order');
    if (['SHIPPED', 'DELIVERED'].includes(order.status)) {
      throw new BadRequestException('Cannot cancel an order that has already shipped');
    }
    const warehouse = await this.getOrCreateDefaultWarehouse(tenantId);
    const items = await this.prisma.salesOrderItem.findMany({ where: { orderId: id } });
    for (const item of items) {
      await this.adjustStock(tenantId, {
        productId: item.productId,
        variantId: item.variantId || undefined,
        warehouseId: warehouse.id,
        quantityChange: item.quantity,
        reason: 'SALE_RETURN',
        refType: 'SalesOrder',
        refId: id,
      });
    }
    const cancelled = await this.prisma.salesOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
    void this.webhooks.emit(tenantId, 'order.cancelled', { orderId: id, orderNumber: order.orderNumber });

    // Finance: reverse any GL posting and mark the Invoice cancelled.
    void this.ledger.reverseSaleRevenue(tenantId, id, order.orderNumber);
    if (order.invoiceId) {
      void this.prisma.invoice.update({ where: { id: order.invoiceId }, data: { paymentStatus: 'CANCELLED', isActive: false } }).catch(() => undefined);
    }

    return cancelled;
  }

  // ---------------------------------------------------------------------
  // Shipments (Logistics-lite)
  // ---------------------------------------------------------------------
  async createShipment(tenantId: string, orderId: string, dto: any) {
    const order = await this.assertExists(this.prisma.salesOrder, tenantId, orderId, 'Order');
    const warehouse = await this.getOrCreateDefaultWarehouse(tenantId);
    const shipment = await this.prisma.shipment.create({
      data: {
        tenantId,
        orderId,
        warehouseId: warehouse.id,
        courierName: dto?.courierName || null,
        trackingNumber: dto?.trackingNumber || null,
        status: 'PENDING',
      },
    });
    await this.prisma.salesOrder.update({ where: { id: orderId }, data: { status: 'PROCESSING' } });
    void this.webhooks.emit(tenantId, 'shipment.created', {
      shipmentId: shipment.id,
      orderId,
      orderNumber: order.orderNumber,
      courierName: shipment.courierName,
      trackingNumber: shipment.trackingNumber,
    });
    return shipment;
  }

  async updateShipmentStatus(tenantId: string, id: string, status: string) {
    await this.assertExists(this.prisma.shipment, tenantId, id, 'Shipment');
    const patch: any = { status };
    if (status === 'IN_TRANSIT') patch.shippedAt = new Date();
    if (status === 'DELIVERED') patch.deliveredAt = new Date();
    const shipment = await this.prisma.shipment.update({ where: { id }, data: patch });

    if (status === 'IN_TRANSIT') {
      await this.prisma.salesOrder.update({ where: { id: shipment.orderId }, data: { status: 'SHIPPED' } });
    }
    if (status === 'DELIVERED') {
      await this.prisma.salesOrder.update({ where: { id: shipment.orderId }, data: { status: 'DELIVERED' } });
    }
    void this.webhooks.emit(tenantId, 'shipment.status_changed', { shipmentId: id, orderId: shipment.orderId, status });
    return shipment;
  }

  /** Used by the controller to decide whether to strip financial figures from the dashboard summary. See PermissionGuard for the same resource:action matching logic. */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const [requiredResource, requiredAction] = permission.split(':');
    const userRoles = await this.prisma.userRoles.findMany({ where: { userId }, include: { role: true } });
    return userRoles.some(({ role }) => {
      const perms = (role.permissions as string[] | null) || [];
      return perms.some((perm) => {
        const [permResource, permAction] = perm.split(':');
        return (permResource === '*' || permResource === requiredResource)
          && (permAction === '*' || permAction === requiredAction);
      });
    });
  }

  // ---------------------------------------------------------------------
  // Dashboard summary — feeds the owner/sales/inventory widgets.
  // ---------------------------------------------------------------------
  async getDashboardSummary(tenantId: string) {
    const [productCount, lowStockCount, orderCount, pendingOrders, revenue] = await Promise.all([
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
      this.prisma.stockItem.count({ where: { tenantId, quantityOnHand: { lte: 5 } } }),
      this.prisma.salesOrder.count({ where: { tenantId } }),
      this.prisma.salesOrder.count({ where: { tenantId, status: { in: ['PENDING', 'CONFIRMED', 'PROCESSING'] } } }),
      this.prisma.salesOrder.aggregate({ where: { tenantId, status: { not: 'CANCELLED' } }, _sum: { grandTotal: true } }),
    ]);
    return {
      productCount,
      lowStockCount,
      orderCount,
      pendingOrders,
      totalRevenue: revenue._sum.grandTotal ?? 0,
    };
  }
}
