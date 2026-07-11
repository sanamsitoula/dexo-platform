import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

/** Public (no-auth) storefront browsing, resolved by tenant subdomain. */
@Injectable()
export class EcommercePublicService {
  constructor(private prisma: PrismaService) {}

  private async resolveTenantId(subdomain: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({ where: { subdomain }, select: { id: true } });
    if (!tenant) throw new NotFoundException('Store not found');
    return tenant.id;
  }

  async getCategories(subdomain: string) {
    const tenantId = await this.resolveTenantId(subdomain);
    return this.prisma.productCategory.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  async getProducts(subdomain: string, q?: { categoryId?: string; brandId?: string; search?: string; featured?: boolean }) {
    const tenantId = await this.resolveTenantId(subdomain);
    return this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        categoryId: q?.categoryId || undefined,
        brandId: q?.brandId || undefined,
        isFeatured: q?.featured ? true : undefined,
        ...(q?.search ? { name: { contains: q.search, mode: 'insensitive' as const } } : {}),
      },
      include: { category: true, brand: true, variants: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProductBySlug(subdomain: string, slug: string) {
    const tenantId = await this.resolveTenantId(subdomain);
    const product = await this.prisma.product.findFirst({
      where: { tenantId, slug, isActive: true },
      include: { category: true, brand: true, variants: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
