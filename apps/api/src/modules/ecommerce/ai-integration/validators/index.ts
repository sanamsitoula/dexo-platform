import { z } from 'zod';

/**
 * Shared argument schemas for ecommerce AI tools — mirrors the fitness
 * module's validators/index.ts: one place so tools/index.ts and
 * self-tools.ts stay focused on wiring.
 */
export const searchProductsArgs = z.object({
  search: z.string().optional().describe('Name search term'),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  activeOnly: z.boolean().optional(),
});

export const productIdArgs = z.object({ productId: z.string().describe('Product record id') });
export const skuArgs = z.object({ sku: z.string().describe('Exact product SKU') });

export const stockLevelsArgs = z.object({ warehouseId: z.string().optional() });

export const adjustStockArgs = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  warehouseId: z.string(),
  quantityChange: z.number().describe('Signed quantity delta — positive to add stock, negative to remove'),
  reason: z.string().describe('e.g. ADJUSTMENT, DAMAGE, RECOUNT'),
});

export const orderLookupArgs = z.object({ idOrNumber: z.string().describe('SalesOrder.id or its human-facing orderNumber, e.g. "ORD-202607-00012"') });
export const orderIdArgs = z.object({ orderId: z.string() });
export const orderStatusArgs = z.object({ orderId: z.string(), status: z.string().describe('New order status, e.g. CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED') });

export const createShipmentArgs = z.object({
  orderId: z.string(),
  courierName: z.string().optional(),
  trackingNumber: z.string().optional(),
});
export const shipmentStatusArgs = z.object({
  shipmentId: z.string(),
  status: z.string().describe('e.g. PENDING, IN_TRANSIT, DELIVERED, RETURNED'),
});

export const findCustomersArgs = z.object({ search: z.string().optional().describe('Name/email/mobile search term') });
export const customerIdArgs = z.object({ customerId: z.string() });

// ---- Customer-self (cart) ----
export const addToCartArgs = z.object({
  productId: z.string().describe('Product record id to add to the cart'),
  variantId: z.string().optional().describe('Product variant id, if the product has variants (size/color/etc)'),
  quantity: z.number().min(1).describe('How many units to add'),
});

export const cartItemIdArgs = z.object({ itemId: z.string().describe('Cart item id (from myCart)') });

export const updateCartItemArgs = z.object({
  itemId: z.string().describe('Cart item id (from myCart)'),
  quantity: z.number().min(0).describe('New quantity — 0 removes the item'),
});
