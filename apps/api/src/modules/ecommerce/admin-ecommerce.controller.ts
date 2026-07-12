import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, PlatformAdminGuard } from '@dexo/auth';
import { PrismaService } from '@dexo/shared';
import { EcommerceService } from './ecommerce.service';

/**
 * Platform-admin-only cross-tenant ecommerce visibility. Unlike
 * EcommerceController (tenant-scoped via req.user.tenantId), every route
 * here takes an explicit tenantId (or none, for the cross-tenant rollup)
 * so a platform admin can inspect any tenant's storefront data — read-only
 * oversight, not merchant management (no create/update/delete here).
 */
@ApiTags('admin-ecommerce')
@Controller('admin/ecommerce')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@ApiBearerAuth()
export class AdminEcommerceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ecommerce: EcommerceService,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Cross-tenant ecommerce rollup: totals + per-tenant breakdown' })
  async getSummary() {
    const [tenantsWithEcommerce, productCount, orderCount, revenue, tenants] = await Promise.all([
      this.prisma.tenant.count({
        where: { moduleOverrides: { some: { moduleKey: 'ecommerce', enabled: true } } },
      }),
      this.prisma.product.count(),
      this.prisma.salesOrder.count(),
      this.prisma.salesOrder.aggregate({
        _sum: { grandTotal: true },
        where: { status: { not: 'CANCELLED' } },
      }),
      this.prisma.tenant.findMany({ select: { id: true, name: true } }),
    ]);

    const [productsByTenant, ordersByTenant, revenueByTenant] = await Promise.all([
      this.prisma.product.groupBy({ by: ['tenantId'], _count: { _all: true } }),
      this.prisma.salesOrder.groupBy({ by: ['tenantId'], _count: { _all: true } }),
      this.prisma.salesOrder.groupBy({
        by: ['tenantId'],
        _sum: { grandTotal: true },
        where: { status: { not: 'CANCELLED' } },
      }),
    ]);

    const productMap = new Map(productsByTenant.map((p) => [p.tenantId, p._count._all]));
    const orderMap = new Map(ordersByTenant.map((o) => [o.tenantId, o._count._all]));
    const revenueMap = new Map(revenueByTenant.map((r) => [r.tenantId, r._sum.grandTotal ?? 0]));

    const perTenant = tenants
      .map((t) => ({
        tenantId: t.id,
        tenantName: t.name,
        productCount: productMap.get(t.id) ?? 0,
        orderCount: orderMap.get(t.id) ?? 0,
        revenue: revenueMap.get(t.id) ?? 0,
      }))
      .filter((t) => t.productCount > 0 || t.orderCount > 0)
      .sort((a, b) => Number(b.revenue) - Number(a.revenue));

    return {
      totalStores: tenants.length,
      tenantsWithEcommerceEnabled: tenantsWithEcommerce,
      totalProducts: productCount,
      totalOrders: orderCount,
      totalRevenue: revenue._sum.grandTotal ?? 0,
      perTenant,
    };
  }

  @Get('tenants/:tenantId/products')
  @ApiOperation({ summary: 'List products for a specific tenant (platform-admin oversight)' })
  async getTenantProducts(@Param('tenantId') tenantId: string) {
    return this.ecommerce.listProducts(tenantId);
  }

  @Get('tenants/:tenantId/orders')
  @ApiOperation({ summary: 'List orders for a specific tenant (platform-admin oversight)' })
  async getTenantOrders(@Param('tenantId') tenantId: string) {
    return this.ecommerce.listOrders(tenantId);
  }

  @Get('tenants/:tenantId/dashboard')
  @ApiOperation({ summary: 'Dashboard summary for a specific tenant, including revenue unconditionally' })
  async getTenantDashboard(@Param('tenantId') tenantId: string) {
    return this.ecommerce.getDashboardSummary(tenantId);
  }
}
