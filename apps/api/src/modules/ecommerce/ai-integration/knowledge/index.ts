import type { AiKnowledgeChunk } from '@dexo/ai-platform';

/**
 * Structured entity-relationship and policy knowledge for the ecommerce
 * domain — static for now (not vector-indexed yet, see
 * docs/ai/08_RAG_ENGINE.md roadmap), registered through the same
 * `registerModule({ knowledge })` path fitness uses.
 *
 * The return/shipping/payment-method chunks below are GENERIC PLACEHOLDERS —
 * this platform has no per-tenant policy configuration for these yet, so the
 * assistant should treat them as illustrative defaults, not as a real,
 * enforceable store policy, until a tenant-configurable policy field exists.
 */
export const ecommerceKnowledge: AiKnowledgeChunk[] = [
  {
    id: 'ecommerce.entity-graph',
    moduleKey: 'ecommerce',
    title: 'Ecommerce domain entity relationships',
    content: `Tenant -> ProductCategory / Brand -> Product -> ProductVariant (attribute combinations, e.g. Size=M/Color=Red)
Product -> StockItem (per Warehouse, tracks quantityOnHand/quantityReserved) -> StockLedgerEntry (audit trail)
Customer -> Cart (ACTIVE/CONVERTED) -> CartItem
Customer -> SalesOrder (has orderNumber, status, paymentMethod COD/PREPAID) -> SalesOrderItem
SalesOrder -> Invoice (finance ledger, created at checkout regardless of payment timing)
SalesOrder -> Shipment (courier, trackingNumber, status PENDING/IN_TRANSIT/DELIVERED/RETURNED)
A Customer is matched to a logged-in User by email (no direct userId FK) — see EcommerceService.getOrCreateCustomerForUser.`,
  },
  {
    id: 'ecommerce.glossary',
    moduleKey: 'ecommerce',
    title: 'Ecommerce domain glossary',
    content: `"Low stock" = StockItem.quantityOnHand <= Product.reorderPoint (only products with a reorderPoint set are considered).
Order status flow: PENDING -> CONFIRMED -> PROCESSING (shipment created) -> SHIPPED (shipment IN_TRANSIT) -> DELIVERED (shipment DELIVERED); CANCELLED can happen any time before shipping.
"COD" (cash on delivery) orders recognize revenue at sale time (AR); "PREPAID" orders defer revenue recognition until the payment gateway confirms payment.`,
  },
  {
    id: 'ecommerce.return-policy-placeholder',
    moduleKey: 'ecommerce',
    title: 'Return policy (generic placeholder — no tenant-specific policy configured yet)',
    content: `PLACEHOLDER, not a real enforced policy: items may typically be returned within 7-14 days of delivery in original condition, subject to the individual store's actual terms. There is currently no per-tenant configurable return-policy field in the platform — if a customer asks for a definitive return policy, say the exact policy should be confirmed with the store directly, since this assistant only has generic guidance, not the tenant's actual rules.`,
  },
  {
    id: 'ecommerce.shipping-payment-placeholder',
    moduleKey: 'ecommerce',
    title: 'Shipping & payment methods (generic placeholder)',
    content: `PLACEHOLDER: Orders can be placed COD (cash on delivery) or PREPAID via whichever payment gateway provider the tenant has configured (see PaymentGatewayService — esewa/khalti/connectips/fonepay/stripe/paypal, tenant-dependent). Shipping cost/carrier selection is not yet a configurable per-tenant policy in the platform; Shipment.courierName is set manually by staff when a shipment is created.`,
  },
];
