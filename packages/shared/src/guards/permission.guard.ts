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

export const REQUIRED_PERMISSION_KEY = 'required_permission';

/**
 * Guard that enforces a granular `resource:action` permission string (e.g.
 * `ecommerce:pick`, `ecommerce:view_financials`) against the current user's
 * role(s) — finer-grained than ModuleAccessGuard, which only gates whether a
 * whole module is enabled for the tenant, not which actions within it a
 * given role may perform.
 *
 * Matching rules (mirrors PermissionService.checkPermission in
 * packages/permission, reimplemented here so apps/api controllers don't need
 * a network hop to the permission microservice):
 *  - `resource:*` or `*:*` on a role grants everything under that resource.
 *  - An exact `resource:action` match grants that one action.
 *  - Platform admins (or users without a tenantId) bypass the check.
 *
 * Use via `@RequirePermission('ecommerce:pick')`, always alongside
 * JwtAuthGuard (this guard trusts `req.user` set by authentication).
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(REQUIRED_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return true; // authentication guards own that decision

    if (user.isPlatformAdmin || !user.tenantId) return true;

    const [requiredResource, requiredAction] = required.split(':');

    const userRoles = await this.prisma.userRoles.findMany({
      where: { userId: user.id },
      include: { role: true },
    });

    const hasPermission = userRoles.some(({ role }) => {
      const perms = (role.permissions as string[] | null) || [];
      return perms.some((perm) => {
        const [permResource, permAction] = perm.split(':');
        return (permResource === '*' || permResource === requiredResource)
          && (permAction === '*' || permAction === requiredAction);
      });
    });

    if (!hasPermission) {
      throw new ForbiddenException(`Missing required permission: ${required}`);
    }
    return true;
  }
}

/** Decorator: `@RequirePermission('ecommerce:pick')` on a controller class or route handler. */
export function RequirePermission(permission: string) {
  return applyDecorators(SetMetadata(REQUIRED_PERMISSION_KEY, permission), UseGuards(PermissionGuard));
}
