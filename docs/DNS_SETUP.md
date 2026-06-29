# DNS Setup Guide for Dexo Platform Multi-Tenancy

This guide explains how to configure DNS records for tenant subdomains and custom domains in the Dexo Platform.

## Overview

Dexo Platform supports two types of domain routing:
1. **Subdomain Routing** - `tenant.dexo.com`
2. **Custom Domain Routing** - `app.tenantcompany.com`

## Prerequisites

- Access to your DNS provider (GoDaddy, Cloudflare, AWS Route53, etc.)
- Your platform domain configured (e.g., `dexo.com`)
- SSL/TLS certificates enabled on your server

## Subdomain Configuration

### Option 1: Wildcard DNS (Recommended)

Configure a single wildcard DNS record that handles all subdomains:

```
*.dexo.com IN A YOUR_SERVER_IP
```

Or using CNAME:

```
*.dexo.com IN CNAME dexo.com
```

**Benefits:**
- All new tenant subdomains work automatically
- No manual DNS changes needed when creating tenants

**Note:** This requires a wildcard SSL certificate (`*.dexo.com`)

### Option 2: Individual Subdomain Records

Create individual records for each tenant:

```
fitness.dexo.com IN A YOUR_SERVER_IP
gym.dexo.com IN A YOUR_SERVER_IP
clinic.dexo.com IN A YOUR_SERVER_IP
```

**Benefits:**
- More control over individual subdomains
- Can use standard SSL certificates

**Drawback:** Manual DNS configuration required for each new tenant

## Custom Domain Configuration

When a tenant wants to use their own domain (e.g., `app.fitnessstudio.com`), configure one of the following:

### Option 1: CNAME Record (Recommended)

```
app.fitnessstudio.com IN CNAME dexo.com
```

**Benefits:**
- Automatically inherits platform's IP changes
- Works with most DNS providers

### Option 2: A Record

```
app.fitnessstudio.com IN A YOUR_SERVER_IP
```

**Benefits:**
- Direct IP mapping
- Slightly faster DNS resolution

**Drawback:** Must update if server IP changes

## DNS Provider-Specific Instructions

### Cloudflare

1. Go to **DNS** > **Records**
2. Click **Add Record**
3. For wildcard subdomain:
   - Type: `CNAME`
   - Name: `*`
   - Target: `dexo.com`
   - Proxy: Off (for SSL certificates)

### AWS Route 53

1. Go to **Hosted Zones** > your domain
2. Click **Create Record**
3. For wildcard subdomain:
   - Record type: `CNAME`
   - Record name: `*`
   - Value: `dexo.com`
   - Routing policy: Simple
   - Click **Create records**

### GoDaddy

1. Go to **DNS Management**
2. Click **Add** > **CNAME**
3. For wildcard:
   - Type: `CNAME`
   - Host: `*`
   - Points to: `dexo.com`
   - TTL: 1 hour

### Namecheap

1. Go to **Advanced DNS**
2. Click **Add New Record**
3. For wildcard:
   - Type: `CNAME Record`
   - Host: `*`
   - Value: `dexo.com`
   - TTL: Automatic

## SSL/TLS Certificate Configuration

### Wildcard Certificate (for Subdomains)

Generate a wildcard SSL certificate for `*.dexo.com`:

```bash
# Using Let's Encrypt with certbot
sudo certbot certonly --manual --preferred-challenges dns \
  -d "*.dexo.com" -d "dexo.com"
```

**Note:** DNS validation is required for wildcard certificates.

### Custom Domain Certificates

For custom domains, use Let's Encrypt automation:

```bash
sudo certbot certonly --webroot \
  -w /var/www/html \
  -d app.fitnessstudio.com
```

Or set up automated certificate management with:
- **Certbot** with webroot or DNS validation
- **Caddy** (auto-HTTPS)
- **Traefik** with Let's Encrypt integration

## Verification

### Check DNS Propagation

Use `dig` or `nslookup` to verify DNS records:

```bash
# Check subdomain
dig fitness.dexo.com

# Check custom domain
dig app.fitnessstudio.com

# With nslookup (Windows)
nslookup fitness.dexo.com
```

### Check SSL Certificate

```bash
# Check SSL certificate
openssl s_client -connect fitness.dexo.com:443 -servername fitness.dexo.com

# Online tool
curl https://fitness.dexo.com
```

## Troubleshooting

### Subdomain Not Resolving

1. **Check DNS Propagation**
   ```bash
   dig fitness.dexo.com
   ```
   - If no response, DNS record not configured or not propagated
   - Wait up to 48 hours for DNS propagation

2. **Check Server Configuration**
   - Verify nginx/Apache is configured for wildcard hosting
   - Check firewall allows traffic on port 443

3. **Check SSL Certificate**
   - Verify wildcard certificate covers the subdomain
   - Check certificate validity period

### Custom Domain Not Working

1. **Verify CNAME/A Record**
   - Use `dig` to confirm DNS record points correctly
   - Check TTL has expired (use 5 minutes for testing)

2. **Check Custom Domain Settings**
   - Verify domain is saved in tenant settings
   - Ensure no typos in domain name

3. **SSL Certificate Issues**
   - Custom domains need separate SSL certificates
   - Use automation tools like certbot or Caddy

### SSL Certificate Errors

1. **Wildcard Certificate Expired**
   ```bash
   sudo certbot renew
   ```

2. **Custom Domain Certificate Missing**
   - Generate certificate for custom domain
   - Configure web server to use correct certificate

## Production Deployment

For production deployment:

1. **Use CDN for Static Assets**
   - Configure CDN for tenant logos, favicons
   - Use `tenant-{id}.dexo-cdn.com` pattern

2. **Enable HSTS**
   ```
   Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
   ```

3. **Configure Security Headers**
   ```
   X-Content-Type-Options: nosniff
   X-Frame-Options: SAMEORIGIN
   X-XSS-Protection: 1; mode=block
   ```

4. **Monitor DNS Health**
   - Set up DNS monitoring alerts
   - Track SSL expiration dates

## Environment Variables

Configure these in your `.env` file:

```env
# Platform domain
PLATFORM_DOMAIN=dexo.com

# API URL
NEXT_PUBLIC_API_URL=https://api.dexo.com

# Admin subdomain
ADMIN_SUBDOMAIN=admin
```

## Web Server Configuration Examples

### Nginx Wildcard Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name *.dexo.com;

    ssl_certificate /etc/letsencrypt/live/dexo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dexo.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Apache Wildcard Configuration

```apache
<VirtualHost *:443>
    ServerName dexo.com
    ServerAlias *.dexo.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/dexo.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/dexo.com/privkey.pem

    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
</VirtualHost>
```

## Support

For issues or questions:
- Check the [Deployment Guide](./DEPLOYMENT.md)
- Review the [Architecture Documentation](./ARCHITECTURE.md)
- Open an issue on GitHub
