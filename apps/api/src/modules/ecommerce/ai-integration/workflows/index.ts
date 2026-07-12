import { Injectable, Logger } from '@nestjs/common';
import { EcommerceService } from '../../ecommerce.service';
import { NotificationService } from '@dexo/notification';

/**
 * Workflow automations — data-driven actions triggered by a condition, not
 * by a chat message. Mirrors fitness's one-workflow pattern: only ONE is
 * wired to an executable method (the low-stock digest); it never emails
 * anyone unless a recipient is explicitly passed, so nothing silently
 * notifies a real inbox without a reviewed trigger.
 *
 * Wired: `runLowStockDigest` — call it manually via
 * POST /api/ecommerce/ai/workflows/low-stock-digest (see
 * ecommerce-ai.controller.ts), or schedule it with @nestjs/schedule once a
 * tenant opts in and a recipient is configured.
 *
 * NOT implemented (roadmap — see docs/ai/00_AI_MASTER_ARCHITECTURE.md):
 *   - "Abandoned cart" recovery workflow (needs a per-cart last-updated
 *     aggregate query across ALL carts, plus a decision on how aggressive
 *     recovery messaging should be — a genuinely new capability, not a
 *     wrapper around an existing method).
 *   - A per-tenant configurable recipient (e.g. a "store ops email" setting)
 *     so this can run on a schedule without a caller supplying the address
 *     every time — there's currently no such field on Tenant/Setting for
 *     ecommerce specifically.
 */
@Injectable()
export class EcommerceAiWorkflows {
  private readonly logger = new Logger(EcommerceAiWorkflows.name);

  constructor(
    private ecommerce: EcommerceService,
    private notifications: NotificationService,
  ) {}

  async runLowStockDigest(tenantId: string, recipientEmail?: string) {
    const lowStock = await this.ecommerce.getLowStockProducts(tenantId);

    if (!recipientEmail) {
      // No recipient supplied — return the report only, send nothing.
      return { checked: lowStock.length, sent: false, reason: 'no recipientEmail supplied', items: lowStock };
    }

    if (!lowStock.length) {
      return { checked: 0, sent: false, reason: 'no low-stock items', items: [] };
    }

    try {
      const lines = (lowStock as any[])
        .map((i) => `- ${i.product?.name ?? i.productId} (${i.warehouse?.name ?? i.warehouseId}): ${i.quantityOnHand} on hand`)
        .join('\n');
      await this.notifications.sendDirect(tenantId, {
        to: recipientEmail,
        title: `Low stock digest — ${lowStock.length} item(s) at or below reorder point`,
        message: `The following items are at or below their reorder point:\n\n${lines}`,
      });
      return { checked: lowStock.length, sent: true, items: lowStock };
    } catch (e) {
      this.logger.warn(`Low-stock digest email failed: ${(e as Error).message}`);
      return { checked: lowStock.length, sent: false, reason: (e as Error).message, items: lowStock };
    }
  }
}
