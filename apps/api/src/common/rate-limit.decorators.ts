/**
 * Dexo v5 — Rate limiting configuration
 *
 * Public routes:   60 req/min per IP
 * Auth routes:     10 req/min per IP
 * Tenant API:     300 req/min per tenantId
 *
 * Already applied at module level via @nestjs/throttler in main.ts.
 * This file documents the v5 spec and exposes decorators for per-route tuning.
 */
import { Throttle, SkipThrottle } from '@nestjs/throttler';

// Apply to auth routes (login, register, password reset)
export const AuthThrottle = () => Throttle({ default: { limit: 10, ttl: 60_000 } });

// Apply to public endpoints (check-slug, business-templates, health)
export const PublicThrottle = () => Throttle({ default: { limit: 60, ttl: 60_000 } });

// Apply to tenant-scoped authenticated endpoints
export const TenantThrottle = () => Throttle({ default: { limit: 300, ttl: 60_000 } });

// Skip throttling for service-to-service
export const SkipRateLimit = () => SkipThrottle();
