import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { WebhooksService } from '../webhooks/webhooks.service';

/**
 * Ecommerce domain service — Catalog, Inventory, Cart, Checkout, Shipment.
 *
 * Finance integration (Invoice + GL posting on order placement) is
 * deliberately NOT wired yet — see docs/ECOMMERCE_MODULE.md "Roadmap". Stock
 * is deducted synchronously at checkout via StockItem + StockLedgerEntry, the
 * same audit-trail pattern used by the rest of the platform's finance ledger.
 *
 * Checkout/status changes emit generic webhook events (order.created,
 * order.status_changed, order.cancelled, shipment.created,
 * shipment.status_changed, product.low_stock) via WebhooksService — the same
 * "plug and play" bus any other module can use.
 */
@Injectable()
export class EcommerceService {
  constructor(private prisma: PrismaService, private webhooks: WebhooksService) {}

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

  async getProduct(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: { category: true, brand: true, variants: true, stockItems: { include: { warehouse: true } } },
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

  async checkout(tenantId: string, customerId: string, dto: { shippingAddress?: any; couponCode?: string; paymentMethod?: 'COD' | 'PREPAID' }) {
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

    return order;
  }

  async listOrders(tenantId: string, customerId?: string) {
    return this.prisma.salesOrder.findMany({
      where: { tenantId, customerId: customerId || undefined },
      include: { items: { include: { product: true } }, shipments: true },
      orderBy: { placedAt: 'desc' },
    });
  }

  async getOrder(tenantId: string, id: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, tenantId },
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
