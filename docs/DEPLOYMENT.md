# Production Deployment Guide for Dexo Platform

This guide covers deploying the Dexo Platform to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Infrastructure Setup](#infrastructure-setup)
5. [Application Deployment](#application-deployment)
6. [SSL/TLS Configuration](#ssltls-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Scaling Considerations](#scaling-considerations)

## Prerequisites

### Required Software

- **Node.js** 18.x or higher
- **PostgreSQL** 14.x or higher
- **Redis** 7.x or higher
- **Docker** & **Docker Compose** (for containerized deployment)
- **Nginx** or **Apache** (for reverse proxy)
- **Git** for deployment

### Required Services

- **Database**: PostgreSQL (AWS RDS, Heroku Postgres, or self-hosted)
- **Cache**: Redis (ElastiCache, Upstash, or self-hosted)
- **Storage**: S3-compatible storage (AWS S3, MinIO, or DigitalOcean Spaces)
- **Email**: SendGrid, Mailgun, or SMTP server
- **Domain**: Registered domain with DNS management

### Optional Services

- **CDN**: CloudFront, Cloudflare, or Fastly
- **Monitoring**: Datadog, New Relic, or Prometheus/Grafana
- **Error Tracking**: Sentry
- **Logging**: Papertrail, Loggly, or ELK Stack

## Environment Configuration

### Web App (.env)

```env
# Platform Configuration
PLATFORM_DOMAIN=dexo.com
NEXT_PUBLIC_API_URL=https://api.dexo.com
NEXT_PUBLIC_APP_URL=https://dexo.com

# Authentication
NEXT_PUBLIC_COOKIE_DOMAIN=.dexo.com
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://dexo.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/dexo_prod

# Redis
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Storage
USE_MINIO=false
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET=dexo-uploads

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-key

# JWT (Backend API)
JWT_SECRET=your-jwt-secret
REFRESH_TOKEN_SECRET=your-refresh-secret
```

### Admin Dashboard (.env)

```env
NEXT_PUBLIC_API_URL=https://api.dexo.com
NEXT_PUBLIC_PLATFORM_URL=https://dexo.com
NEXT_PUBLIC_COOKIE_DOMAIN=.dexo.com
DATABASE_URL=postgresql://user:password@host:5432/dexo_prod
```

### Backend API (.env)

```env
DATABASE_URL=postgresql://user:password@host:5432/dexo_prod
JWT_SECRET=your-jwt-secret-min-32-chars
REFRESH_TOKEN_SECRET=your-refresh-secret
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
PORT=4000
NODE_ENV=production
```

## Database Setup

### PostgreSQL Configuration

#### Using AWS RDS

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier dexo-prod \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username dexo_admin \
  --master-user-password SecurePassword123! \
  --allocated-storage 20 \
  --storage-type gp2

# Configure security group to allow access from application server
```

#### Using Supabase

1. Create a new project at supabase.com
2. Get connection string from project settings
3. Update `DATABASE_URL` in environment files

### Run Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# Or use migrations (recommended for production)
npx prisma migrate deploy

# Seed initial data
npx prisma db seed --preview-feature
```

### Database Backup

```bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Automated backup with cron
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/dexo_$(date +\%Y\%m\%d).sql.gz
```

## Infrastructure Setup

### Option 1: Docker Compose (Simplified)

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: dexo_prod
      POSTGRES_USER: dexo_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: always

  api:
    build: ./apps/api
    environment:
      DATABASE_URL: postgresql://dexo_user:${DB_PASSWORD}@postgres:5432/dexo_prod
      REDIS_HOST: redis
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    restart: always

  web:
    build: ./apps/web
    environment:
      NEXT_PUBLIC_API_URL: https://api.dexo.com
    depends_on:
      - api
    restart: always

  admin:
    build: ./apps/admin
    environment:
      NEXT_PUBLIC_API_URL: https://api.dexo.com
    depends_on:
      - api
    restart: always

volumes:
  postgres_data:
  redis_data:
```

### Option 2: Cloud Deployment

#### Vercel Deployment (Recommended for Next.js)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy web app
cd apps/web
vercel --prod

# Deploy admin dashboard
cd ../admin
vercel --prod --name admin
```

#### AWS EC2 Deployment

```bash
# 1. Launch EC2 instance
# 2. SSH into instance
ssh -i your-key.pem ubuntu@your-instance-ip

# 3. Install dependencies
sudo apt update
sudo apt install -y nodejs npm postgresql-client nginx

# 4. Clone repository
git clone https://github.com/your-repo/dexo-platform.git
cd dexo-platform

# 5. Install dependencies
npm ci

# 6. Build applications
npm run build

# 7. Configure PM2 for process management
npm install -g pm2
pm2 start npm --name "api" -- start --workspace=@dexo/api
pm2 start npm --name "web" -- start --workspace=dexo-web
pm2 startup
pm2 save
```

#### Heroku Deployment

```bash
# Install Heroku CLI
npm i -g heroku

# Login
heroku login

# Create apps
heroku create dexo-api
heroku create dexo-web
heroku create dexo-admin

# Set environment variables
heroku config:set JWT_SECRET=your-secret --app dexo-api
heroku config:set DATABASE_URL=your-db-url --app dexo-api

# Deploy
git push heroku main
```

## Application Deployment

### Build Process

```bash
# Install dependencies
npm ci

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Build all applications
npm run build

# Seed database (optional)
npx prisma db seed
```

### Process Management with PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'dexo-api',
      script: 'apps/api/dist/main.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
    {
      name: 'dexo-web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: './apps/web',
    },
    {
      name: 'dexo-admin',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      cwd: './apps/admin',
    },
  ],
};
```

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs
```

## SSL/TLS Configuration

### Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate for domain
sudo certbot --nginx -d dexo.com -d *.dexo.com

# Auto-renewal (already configured)
sudo certbot renew --dry-run
```

### Cloudflare SSL

1. Add domain to Cloudflare
2. Change nameservers at registrar
3. Enable **Full SSL** mode
4. Configure Page Rules for redirect

### AWS Certificate Manager

```bash
# Request certificate
aws acm request-certificate \
  --domain-name dexo.com \
  --subject-alternative-names *.dexo.com \
  --validation-method DNS

# Validate with CNAME records from output
```

## Monitoring & Logging

### Application Monitoring

```javascript
// Add to apps/api/src/main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Health Check Endpoint

```typescript
// apps/api/src/health/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
```

### Logging Configuration

```typescript
// Use Winston for structured logging
import { Logger } from '@nestjs/common';

// Log format: JSON with timestamp, level, message, context
// Output: stdout (to be collected by logging service)
```

## Scaling Considerations

### Horizontal Scaling

- Use load balancer (AWS ALB, Nginx)
- Deploy multiple API instances
- Enable sticky sessions for WebSocket support

### Database Scaling

- Enable connection pooling (PgBouncer)
- Use read replicas for reporting
- Implement caching strategy

### Caching Strategy

```typescript
// Cache tenant lookup (24 hours)
// Cache user permissions (1 hour)
// Cache static assets (CDN)
// Cache API responses (Redis with TTL)
```

### CDN Configuration

```javascript
// next.config.js
module.exports = {
  assetPrefix: process.env.CDN_URL || 'https://cdn.dexo.com',
  images: {
    domains: ['cdn.dexo.com', 'tenant-uploads.s3.amazonaws.com'],
  },
};
```

## CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build
        run: npm run build
        
      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## Post-Deployment Checklist

- [ ] DNS records configured
- [ ] SSL certificates installed
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Background jobs processing
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Backup processes active
- [ ] Error tracking enabled
- [ ] Performance monitoring setup

## Troubleshooting

### Common Issues

**1. Database Connection Errors**
```bash
# Check connection
psql $DATABASE_URL

# Verify firewall rules
sudo ufw allow from app-server-ip to any port 5432
```

**2. Redis Connection Issues**
```bash
# Test Redis connection
redis-cli -h $REDIS_HOST -p $REDIS_PASSWORD ping

# Check Redis logs
sudo tail -f /var/log/redis/redis.log
```

**3. Application Not Starting**
```bash
# Check logs
pm2 logs

# Restart process
pm2 restart dexo-api

# Verify environment
pm2 env dexo-api
```

## Support & Resources

- [DNS Setup Guide](./DNS_SETUP.md)
- [Architecture Documentation](./ARCHITECTURE.md)
- [API Documentation](https://api.dexo.com/docs)
- GitHub Issues: https://github.com/your-repo/dexo-platform/issues
