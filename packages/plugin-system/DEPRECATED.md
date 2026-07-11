# DEPRECATED — superseded by the Domain architecture

This scaffold was never wired into `apps/api` and its responsibilities
(per-vertical feature packaging, discovery, enable/disable per tenant) are now
covered by:

- **Domain architecture** (`apps/api/src/modules/domain`, `BusinessDomain` +
  domain descriptors) — vertical feature sets per business type.
- **Marketplace** (`apps/api/src/modules/marketplace`, `MarketplaceItem` /
  `MarketplaceInstall`) — install/uninstall of templates & plugins per tenant.
- **ModuleAccessGuard** (`@dexo/shared`) — plan-based module gating.

Decision (2026-07-11, REMAINING_WORK.md item 13): keep the package out of the
API build; do not add new code here. Delete once no references remain in
planning docs.
