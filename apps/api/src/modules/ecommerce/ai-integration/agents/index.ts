import type { AiAgentDefinition } from '@dexo/ai-platform';

/**
 * Two ecommerce personas, mirroring fitness's staff/self split:
 * `ecommerce.staff` covers inventory + order operations for a single
 * tenant-admin persona (rather than splitting into inventory/support like
 * fitness's five personas — the ecommerce tool surface is small enough that
 * one staff agent with permission-gated tools is clearer than several thin
 * ones), and `ecommerce.customer` is the storefront/support-chatbot persona,
 * scoped to a DIFFERENT moduleKey ("ecommerce-self") so it structurally
 * cannot reach any tool that accepts an arbitrary customerId/warehouseId.
 */
export const ecommerceAgents: AiAgentDefinition[] = [
  {
    key: 'ecommerce.staff',
    name: 'Ecommerce Staff Assistant',
    description: 'Inventory, order and dashboard assistant for tenant staff (picker/packer, support, manager)',
    moduleKeys: ['ecommerce'],
    systemPromptKey: 'ecommerce.staff',
  },
  {
    key: 'ecommerce.shopper',
    name: 'Shopping Assistant',
    description: 'Friendly, inclusive customer-facing shopping assistant — self-scoped, cannot see any other customer\'s data',
    // Deliberately a DIFFERENT moduleKey ("ecommerce-self") than the staff
    // agent above ("ecommerce") — this agent structurally cannot reach any
    // tool that accepts an arbitrary customerId, regardless of prompting.
    moduleKeys: ['ecommerce-self'],
    systemPromptKey: 'ecommerce.shopper.system',
  },
];
