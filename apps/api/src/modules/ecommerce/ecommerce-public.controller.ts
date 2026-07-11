import { Controller, Get, Param, Query } from '@nestjs/common';
import { EcommercePublicService } from './ecommerce-public.service';

/**
 * Public (no-auth) ecommerce endpoints for the tenant storefront website.
 * Mirrors apps/api/src/modules/fitness/public — resolved entirely by subdomain.
 */
@Controller('ecommerce/public')
export class EcommercePublicController {
  constructor(private service: EcommercePublicService) {}

  @Get(':subdomain/categories')
  getCategories(@Param('subdomain') subdomain: string) {
    return this.service.getCategories(subdomain);
  }

  @Get(':subdomain/products')
  getProducts(
    @Param('subdomain') subdomain: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('q') search?: string,
    @Query('featured') featured?: string,
  ) {
    return this.service.getProducts(subdomain, { categoryId, brandId, search, featured: featured === 'true' });
  }

  @Get(':subdomain/products/:slug')
  getProduct(@Param('subdomain') subdomain: string, @Param('slug') slug: string) {
    return this.service.getProductBySlug(subdomain, slug);
  }
}
