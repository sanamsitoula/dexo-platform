/**
 * Backfill: grant `ecommerce:*` to any tenant's system `admin`/`staff` role
 * that's missing it. Before this fix, provisioning.service.ts only added the
 * `ecommerce` module to a tenant's base roles when domainType was
 * ecommerce/retail/shop — a non-ecommerce-vertical tenant (e.g. fitness) that
 * later enables the Store module via its plan/TenantModuleOverride ended up
 * with an admin role that could see /products and /inventory but couldn't
 * actually use write actions gated by `RequirePermission('ecommerce:pick')`
 * etc. Actual module access is still independently gated per-tenant by
 * ModuleAccessGuard/RequireModule — this only ensures the role itself has the
 * permission to exercise the module once it's enabled.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({
    where: { isSystem: true, name: { in: ['admin', 'staff'] } },
  });

  let updated = 0;
  for (const role of roles) {
    const perms = Array.isArray(role.permissions) ? (role.permissions as any[]) : [];
    const hasEcommerce = perms.some((p) => typeof p === 'string' && p.startsWith('ecommerce:'));
    if (hasEcommerce) continue;

    const addition = role.name === 'admin' ? 'ecommerce:*' : ['ecommerce:view', 'ecommerce:create', 'ecommerce:edit'];
    const next = Array.isArray(addition) ? [...perms, ...addition] : [...perms, addition];
    await prisma.role.update({ where: { id: role.id }, data: { permissions: next as any } });
    updated++;
    console.log(`  updated role "${role.name}" (tenant ${role.tenantId})`);
  }
  console.log(`Backfilled ${updated} role(s).`);
}

main().finally(() => prisma.$disconnect());
