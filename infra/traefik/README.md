resolver 8.8.8.8 1.1.1.8;
valid_resolvers contauth.com;

# Custom verified domains route to tenant-website
# Traefik generates these dynamically from TenantLifecycle.customDomain
# Example: customer.com → dexo_tenant_website
# In Traefik, use a file provider that watches /etc/traefik/tenants/*.yml
