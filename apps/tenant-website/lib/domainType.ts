/**
 * Simple domainType/domainCode check for gating ecommerce-only UI (Shop nav
 * link, ShoppingAssistantWidget) — mirrors
 * ProvisioningService.isEcommerceDomain in apps/api (no shared export exists
 * for the frontend, so this is the same substring check inlined).
 */
export function isEcommerceDomainCode(domainCode?: string | null): boolean {
  const d = (domainCode || '').toLowerCase()
  return d.includes('ecommerce') || d.includes('e-commerce') || d.includes('retail') || d.includes('shop')
}
