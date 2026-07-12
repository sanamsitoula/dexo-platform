// Tab entry point for the storefront — same screen as /shop, just mounted
// inside the (tabs) group so it can appear as a bottom tab for ecommerce
// tenants. Deep links like /shop/[slug] still resolve to the top-level
// app/shop/[slug].tsx route.
export { default } from '../shop/index';
