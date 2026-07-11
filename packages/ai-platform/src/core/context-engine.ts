import { Injectable } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import type { AiContext } from './types';

/**
 * Builds the AiContext for a request so agents/tools never have to ask the
 * user things the platform already knows — tenant, branch, roles,
 * permissions, locale/currency/timezone, and the vertical (domainType) that
 * decides which agent + tool set applies.
 *
 * `req.user` here is the same JWT payload every controller already receives
 * (`{ id/sub, tenantId, isPlatformAdmin }`) — ContextEngine just does the
 * extra lookups (role permissions, tenant settings) once per request.
 */
@Injectable()
export class ContextEngine {
  constructor(private prisma: PrismaService) {}

  async build(
    user: { id?: string; sub?: string; tenantId?: string; isPlatformAdmin?: boolean },
    extra?: { branchId?: string; screen?: string; recordId?: string },
  ): Promise<AiContext> {
    const userId = user.id || user.sub || '';
    const tenantId = user.tenantId || '';
    const isPlatformAdmin = !!user.isPlatformAdmin;

    let roles: string[] = [];
    let permissions: string[] = [];
    let domainType: string | null = null;
    let currency = 'NPR';
    let timezone = 'Asia/Kathmandu';
    let locale = 'en';

    if (tenantId && !isPlatformAdmin) {
      const [userRoles, tenant] = await Promise.all([
        this.prisma.userRoles.findMany({
          where: { userId },
          include: { role: { select: { name: true, permissions: true } } },
        }),
        this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } }),
      ]);
      roles = userRoles.map((ur) => ur.role.name);
      permissions = [...new Set(userRoles.flatMap((ur) => (ur.role.permissions as string[]) || []))];

      const settings = (tenant?.settings as Record<string, any>) || {};
      domainType = settings.domainType || settings.theme || null;
      currency = settings.currency || currency;
      timezone = settings.timezone || timezone;
      locale = settings.language || locale;
    }

    return {
      tenantId,
      userId,
      isPlatformAdmin,
      roles,
      permissions,
      branchId: extra?.branchId ?? null,
      domainType,
      locale,
      currency,
      timezone,
      screen: extra?.screen,
      recordId: extra?.recordId,
    };
  }
}
