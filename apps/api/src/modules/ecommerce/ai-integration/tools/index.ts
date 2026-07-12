import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AiTool } from '@dexo/ai-platform';
import { EcommerceService } from '../../ecommerce.service';
import {
  searchProductsArgs, productIdArgs, skuArgs, stockLevelsArgs, adjustStockArgs,
  orderLookupArgs, orderStatusArgs, createShipmentArgs, shipmentStatusArgs,
  findCustomersArgs, customerIdArgs,
} from '../validators';

/**
 * Ecommerce AI Tools (staff/admin-facing) — every operation wraps an
 * EXISTING EcommerceService method. No tool queries Prisma directly and no
 * tool accepts a tenantId argument from the model — every call is scoped by
 * `ctx.tenantId` from the resolved AiContext. Registered under moduleKey
 * "ecommerce" (staff-only — see ecommerce-self-tools.ts for the separate,
 * customer-facing set under moduleKey "ecommerce-self").
 */
@Injectable()
export class EcommerceAiTools {
  constructor(private ecommerce: EcommerceService) {}

  build(): AiTool[] {
    return [
      // ---- Catalog ----
      {
        name: 'searchProducts',
        description: 'Search/list products by name, category or brand (staff view — includes inactive products unless activeOnly is set).',
        argsSchema: searchProductsArgs,
        execute: (args, ctx) => this.ecommerce.listProducts(ctx.tenantId, args),
      },
      {
        name: 'getProduct',
        description: 'Full product detail by id: pricing, category/brand, variants, stock across warehouses.',
        argsSchema: productIdArgs,
        execute: (args, ctx) => this.ecommerce.getProduct(ctx.tenantId, args.productId),
      },
      {
        name: 'findProductBySku',
        description: 'Look up a single product by its exact SKU.',
        argsSchema: skuArgs,
        execute: (args, ctx) => this.ecommerce.findProductBySku(ctx.tenantId, args.sku),
      },

      // ---- Inventory ----
      {
        name: 'listWarehouses',
        description: 'List the tenant\'s warehouses.',
        argsSchema: z.object({}),
        execute: (_args, ctx) => this.ecommerce.listWarehouses(ctx.tenantId),
      },
      {
        name: 'getStockLevels',
        description: 'Stock-on-hand for every product/variant, optionally filtered to one warehouse.',
        argsSchema: stockLevelsArgs,
        execute: (args, ctx) => this.ecommerce.getStockLevels(ctx.tenantId, args.warehouseId),
      },
      {
        name: 'getLowStockProducts',
        description: 'Products at or below their configured reorder point — use for restock planning.',
        argsSchema: z.object({}),
        execute: (_args, ctx) => this.ecommerce.getLowStockProducts(ctx.tenantId),
      },
      {
        name: 'adjustStock',
        description: 'Manually adjust stock-on-hand for a product/variant in a warehouse (writes an audit-trail ledger entry). Requires explicit confirmation from the user before calling — never adjust stock without being asked.',
        argsSchema: adjustStockArgs,
        requiredPermission: 'ecommerce:pick',
        execute: (args, ctx) => this.ecommerce.adjustStock(ctx.tenantId, args),
      },

      // ---- Orders ----
      {
        name: 'getOrder',
        description: 'Look up one order by its id or human-facing order number (e.g. "ORD-202607-00012") — full detail including items and shipments.',
        argsSchema: orderLookupArgs,
        execute: (args, ctx) => this.ecommerce.findOrderByIdOrNumber(ctx.tenantId, args.idOrNumber),
      },
      {
        name: 'listOrders',
        description: 'List recent orders for the tenant (all customers).',
        argsSchema: z.object({}),
        execute: (_args, ctx) => this.ecommerce.listOrders(ctx.tenantId),
      },
      {
        name: 'updateOrderStatus',
        description: 'Change an order\'s status (e.g. CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED). Confirm with the user before calling.',
        argsSchema: orderStatusArgs,
        execute: (args, ctx) => this.ecommerce.updateOrderStatus(ctx.tenantId, args.orderId, args.status),
      },
      {
        name: 'cancelOrder',
        description: 'Cancel an order (restocks items, reverses any GL posting). Cannot cancel an order that has already shipped. Confirm with the user before calling.',
        argsSchema: z.object({ orderId: z.string() }),
        execute: (args, ctx) => this.ecommerce.cancelOrder(ctx.tenantId, args.orderId),
      },

      // ---- Customers ----
      {
        name: 'findCustomers',
        description: 'Search customers by name, email or mobile — use before looking up a customer\'s order history.',
        argsSchema: findCustomersArgs,
        execute: (args, ctx) => this.ecommerce.findCustomers(ctx.tenantId, args.search),
      },
      {
        name: 'customerOrderHistory',
        description: 'All orders placed by a specific customer (use findCustomers first to get the customerId).',
        argsSchema: customerIdArgs,
        execute: (args, ctx) => this.ecommerce.listOrders(ctx.tenantId, args.customerId),
      },

      // ---- Shipments ----
      {
        name: 'createShipment',
        description: 'Create a shipment for an order (moves it to PROCESSING). Confirm with the user before calling.',
        argsSchema: createShipmentArgs,
        requiredPermission: 'ecommerce:pick',
        execute: (args, ctx) => this.ecommerce.createShipment(ctx.tenantId, args.orderId, args),
      },
      {
        name: 'updateShipmentStatus',
        description: 'Update a shipment\'s status (PENDING/IN_TRANSIT/DELIVERED/RETURNED) — IN_TRANSIT moves the order to SHIPPED, DELIVERED moves it to DELIVERED.',
        argsSchema: shipmentStatusArgs,
        requiredPermission: 'ecommerce:pick',
        execute: (args, ctx) => this.ecommerce.updateShipmentStatus(ctx.tenantId, args.shipmentId, args.status),
      },

      // ---- Dashboard ----
      {
        name: 'dashboardSummary',
        description: 'Operational dashboard summary: active product count, low-stock count, order counts. Does NOT include revenue — see revenueSummary for that (requires the finance permission).',
        argsSchema: z.object({}),
        execute: async (_args, ctx) => {
          const summary = await this.ecommerce.getDashboardSummary(ctx.tenantId);
          const { totalRevenue: _totalRevenue, ...rest } = summary;
          return rest;
        },
      },
      {
        name: 'revenueSummary',
        description: 'Full dashboard summary including total revenue — gated behind the ecommerce:view_financials permission, same as the tenant-admin dashboard widget.',
        argsSchema: z.object({}),
        requiredPermission: 'ecommerce:view_financials',
        execute: (_args, ctx) => this.ecommerce.getDashboardSummary(ctx.tenantId),
      },
    ];
  }
}
