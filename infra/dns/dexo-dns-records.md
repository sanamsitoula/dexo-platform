# =============================================================================
#  Dexo Platform — DNS Records (Namecheap / Cloudflare)
# =============================================================================
#
#  WILDCARD strategy: one `*` A record catches all tenant subdomains.
#  New tenants resolve the moment the Tenant record is created.
#
#  Domain registrar: dexo.com (replace with your actual domain)
#
# =============================================================================

# Type   Host    Value               TTL     Purpose
# ----   ----    -----               ---     -------

A       @       <SERVER_IP>         300     Platform root (dexo.com)
A       www     <SERVER_IP>         300     www redirect (or CNAME to @)
A       *       <SERVER_IP>         300     WILDCARD — all tenant subdomains
A       admin   <SERVER_IP>         300     Platform admin
A       api     <SERVER_IP>         300     API server
A       cdn     <SERVER_IP>         300     CDN/assets (optional)
A       docs    <SERVER_IP>         300     Documentation
A       status  <SERVER_IP>         300     Status page

# Custom domain support (per-tenant TXT verification)
# When a tenant requests "fitness.com", they add:
#   TXT  _dexo-verify.fitness.com   dexo-verification=<uuid>
# Then platform verifies and provisions SSL.

# Email (Mailgun / SendGrid) — optional
MX      @       mxa.mailgun.org     300     10
MX      @       mxb.mailgun.org     300     20
TXT     @       "v=spf1 include:mailgun.org ~all"  300
