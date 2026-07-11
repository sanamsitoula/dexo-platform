import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma';

export const REQUIRED_MODULE_KEY = 'required_module';

/**
 * Guard that enforces module access with a two-tier hierarchy:
 *
 *  1. TenantModuleOverride — an explicit, platform-admin-set grant/restriction
 *     for THIS tenant. Always wins when present, in either direction (can
 *     grant a module the plan excludes, or revoke one the plan includes).
 *  2. Subscription plan (`plan.features.modules`) — the tenant-wide default
 *     when no override exists for this module.
 *
 * - Platform admins (or users without a tenantId) bypass the check entirely.
 * - No override + no plan config (or a plan without `features.modules`) =
 *   allowed (backward compatible).
 * - Only an explicit `false` (override or plan) denies access.
 *
 * Use via the `@RequireModule('crm')` decorator below, always alongside
 * JwtAuthGuard (this guard trusts `req.user` set by authentication).
 */
@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.getAllAndOverride<string>(REQUIRED_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredModule) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // No authenticated user: authentication guards own that decision.
    if (!user) return true;

    // Platform admins (no tenant scope) bypass module gating.
    if (user.isPlatformAdmin || !user.tenantId) return true;

    // Tier 1: explicit platform-admin override for this tenant+module.
    const override = await this.prisma.tenantModuleOverride.findUnique({
      where: { tenantId_moduleKey: { tenantId: user.tenantId, moduleKey: requiredModule } },
    });
    if (override) {
      if (!override.enabled) {
        throw new ForbiddenException(`The ${requiredModule} module has been disabled for your account`);
      }
      return true;
    }

    // Tier 2: subscription plan default.
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId: user.tenantId,
        status: { in: ['active', 'trial', 'past_due'] },
      },
      include: { plan: { select: { features: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const modules = (subscription?.plan?.features as Record<string, any> | null)?.modules;

    // Missing/undefined modules config = allow (backward compatible).
    if (!modules || typeof modules !== 'object') return true;

    if (modules[requiredModule] === false) {
      throw new ForbiddenException(
        `The ${requiredModule} module is not included in your subscription plan`,
      );
    }

    return true;
  }
}

/** Decorator: `@RequireModule('crm')` on a controller class or route handler. */
export function RequireModule(module: string) {
  return applyDecorators(SetMetadata(REQUIRED_MODULE_KEY, module), UseGuards(ModuleAccessGuard));
}
