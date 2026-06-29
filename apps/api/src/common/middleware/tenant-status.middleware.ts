import { Injectable, NestMiddleware, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '@dexo/shared';

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { status: string; at: number }>();

@Injectable()
export class TenantStatusMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (!req.path.startsWith('/api/')) return next();
    if (req.path === '/api/health' || req.path === '/api/business-templates') return next();

    const tenantId =
      (req.headers['x-tenant-id'] as string) ||
      (req as any).tenantId;
    if (!tenantId) return next();

    const cached = cache.get(tenantId);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return this.handleStatus(cached.status, res, tenantId, next);
    }

    let status = 'ACTIVE';
    try {
      const lc = await this.prisma.tenantLifecycle.findUnique({
        where: { tenantId },
        select: { status: true },
      });
      status = lc?.status || 'ACTIVE';
    } catch {
      status = 'ACTIVE';
    }
    cache.set(tenantId, { status, at: Date.now() });
    return this.handleStatus(status, res, tenantId, next);
  }

  private handleStatus(status: string, res: Response, tenantId: string, next: NextFunction) {
    switch (status) {
      case 'SUSPENDED':
        return res.status(402).json({
          statusCode: 402,
          message: 'Tenant suspended',
          code: 'TENANT_SUSPENDED',
          tenantId,
        });
      case 'ARCHIVED':
        return res.status(403).json({
          statusCode: 403,
          message: 'Tenant archived',
          code: 'TENANT_ARCHIVED',
          tenantId,
        });
      case 'DELETED':
        return res.status(404).json({
          statusCode: 404,
          message: 'Tenant not found',
          code: 'TENANT_NOT_FOUND',
          tenantId,
        });
      case 'PROVISIONING':
        return res.status(503).json({
          statusCode: 503,
          message: 'Tenant provisioning',
          code: 'TENANT_PROVISIONING',
          tenantId,
        });
      default:
        return next();
    }
  }
}
