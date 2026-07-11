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
 * Guard that enforces plan-based module access (`plan.features.modules`).
 *
 * - Platform admins (or users without a tenantId) bypass the check.
 * - Tenants without an active subscription, or on a plan without a
 *   `features.modules` config, are allowed (backward compatible).
 * - Only an explicit `modules[<module>] === false` denies access.
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
