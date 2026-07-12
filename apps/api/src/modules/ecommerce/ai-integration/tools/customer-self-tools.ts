import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AiTool } from '@dexo/ai-platform';
import { EcommerceService } from '../../ecommerce.service';
import { orderIdArgs, addToCartArgs, cartItemIdArgs, updateCartItemArgs } from '../validators';

/**
 * Customer-SELF tools — registered under a SEPARATE moduleKey
 * ("ecommerce-self", not "ecommerce") so the customer-facing agent
 * structurally cannot reach the staff tools in tools/index.ts (which accept
 * arbitrary customerId/warehouseId arguments and are only safe behind
 * tenant-admin, where every logged-in user is staff).
 *
 * None of these tools accept a customerId argument — every one resolves the
 * caller's OWN Customer record from `ctx.userId` via
 * EcommerceService.getCustomerForUserId. A shopper asking "where's my order"
 * cannot be redirected to look up someone else's order no matter what the
 * model is prompted to do, because the id never comes from the model in the
 * first place — and `getOwnOrder`/`getOrCreateCart` additionally verify the
 * order/cart actually belongs to that resolved customerId before returning
 * anything.
 */
@Injectable()
export class EcommerceCustomerSelfTools {
  constructor(private ecommerce: EcommerceService) {}

  private myCustomerId(ctx: { tenantId: string; userId: string }): Promise<string> {
    return this.ecommerce.getCustomerForUserId(ctx.tenantId, ctx.userId).then((c) => c.id);
  }

  build(): AiTool[] {
    return [
      {
        name: 'browseCategories',
        description: 'List the storefront\'s product categories.',
        argsSchema: z.object({}),
        execute: (_args, ctx) => this.ecommerce.listCategories(ctx.tenantId),
      },
      {
        name: 'browseProducts',
        description: 'Search/browse the public product catalog (active products only) by name, category or brand.',
        argsSchema: z.object({
          search: z.string().optional(),
          categoryId: z.string().optional(),
          brandId: z.string().optional(),
        }),
        execute: (args, ctx) => this.ecommerce.listProducts(ctx.tenantId, { ...args, activeOnly: true }),
      },
      {
        name: 'getProductDetail',
        description: 'Full detail of one active product by id (pricing, variants) — never returns inactive/draft products.',
        argsSchema: z.object({ productId: z.string() }),
        execute: (args, ctx) => this.ecommerce.getActiveProduct(ctx.tenantId, args.productId),
      },
      {
        name: 'myCart',
        description: 'The current signed-in customer\'s own active cart contents.',
        argsSchema: z.object({}),
        execute: async (_args, ctx) => this.ecommerce.getOrCreateCart(ctx.tenantId, await this.myCustomerId(ctx)),
      },
      {
        name: 'addToCart',
        description: 'Add a product (optionally a specific variant) and quantity to the current signed-in customer\'s own cart.',
        argsSchema: z.object({
          productId: z.string(),
          variantId: z.string().optional(),
          quantity: z.number().min(1),
        }),
        execute: async (args, ctx) => this.ecommerce.addToCart(ctx.tenantId, await this.myCustomerId(ctx), args),
      },
      {
        name: 'updateCartItem',
        description: 'Change the quantity of an item already in the current signed-in customer\'s own cart (setting quantity to 0 removes it).',
        argsSchema: z.object({ itemId: z.string(), quantity: z.number().min(0) }),
        execute: async (args, ctx) => this.ecommerce.updateCartItem(ctx.tenantId, await this.myCustomerId(ctx), args.itemId, args.quantity),
      },
      {
        name: 'removeCartItem',
        description: 'Remove an item from the current signed-in customer\'s own cart.',
        argsSchema: z.object({ itemId: z.string() }),
        execute: async (args, ctx) => this.ecommerce.removeCartItem(ctx.tenantId, await this.myCustomerId(ctx), args.itemId),
      },
      {
        name: 'myOrders',
        description: 'All orders placed by the current signed-in customer.',
        argsSchema: z.object({}),
        execute: async (_args, ctx) => this.ecommerce.listOrders(ctx.tenantId, await this.myCustomerId(ctx)),
      },
      {
        name: 'myOrderStatus',
        description: 'Status and detail of one of the current customer\'s OWN orders — never returns another customer\'s order, even if given an arbitrary orderId.',
        argsSchema: orderIdArgs,
        execute: async (args, ctx) => this.ecommerce.getOwnOrder(ctx.tenantId, await this.myCustomerId(ctx), args.orderId),
      },
      {
        name: 'trackMyShipment',
        description: 'Shipment tracking info (courier, tracking number, status) for one of the current customer\'s OWN orders.',
        argsSchema: orderIdArgs,
        execute: async (args, ctx) => {
          const order = await this.ecommerce.getOwnOrder(ctx.tenantId, await this.myCustomerId(ctx), args.orderId);
          return { orderNumber: (order as any).orderNumber, status: (order as any).status, shipments: (order as any).shipments };
        },
      },
    ];
  }
}
