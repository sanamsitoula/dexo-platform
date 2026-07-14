import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, Res, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '@dexo/auth';
import { RequireModule, RequirePermission } from '@dexo/shared';
import { EcommerceService } from './ecommerce.service';

/**
 * Authenticated ecommerce endpoints — tenant staff manage the catalog,
 * warehouses and orders; logged-in customers manage their own cart/checkout
 * (Cart/SalesOrder are scoped to the resolved Customer, never another
 * shopper's — see EcommerceService.getOrCreateCustomerForUser).
 */
@Controller('ecommerce')
@UseGuards(JwtAuthGuard)
@RequireModule('ecommerce')
export class EcommerceController {
  constructor(private ecommerce: EcommerceService) {}

  private async customerId(req: any): Promise<string> {
    const customer = await this.ecommerce.getOrCreateCustomerForUser(req.user.tenantId, req.user);
    return customer.id;
  }

  // ---- Categories ----
  @Get('categories')
  listCategories(@Req() req: any) {
    return this.ecommerce.listCategories(req.user.tenantId);
  }

  @Post('categories')
  createCategory(@Req() req: any, @Body() dto: any) {
    return this.ecommerce.createCategory(req.user.tenantId, dto);
  }

  @Put('categories/:id')
  updateCategory(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.ecommerce.updateCategory(req.user.tenantId, id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Req() req: any, @Param('id') id: string) {
    return this.ecommerce.deleteCategory(req.user.tenantId, id);
  }

  // ---- Brands ----
  @Get('brands')
  listBrands(@Req() req: any) {
    return this.ecommerce.listBrands(req.user.tenantId);
  }

  @Post('brands')
  createBrand(@Req() req: any, @Body() dto: any) {
    return this.ecommerce.createBrand(req.user.tenantId, dto);
  }

  @Delete('brands/:id')
  deleteBrand(@Req() req: any, @Param('id') id: string) {
    return this.ecommerce.deleteBrand(req.user.tenantId, id);
  }

  // ---- Products ----
  @Get('products')
  listProducts(
    @Req() req: any,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('q') search?: string,
  ) {
    return this.ecommerce.listProducts(req.user.tenantId, { categoryId, brandId, search });
  }

  /**
   * Paginated + filterable product listing for the tenant-admin Products page.
   * A separate method/route from `listProducts` above (which stays
   * array-returning and unpaginated) so the AI-tool callers and the
   * platform-admin catalog view — both of which call listProducts directly —
   * keep their existing contract.
   */
  @Get('products/paginated')
  listProductsPaginated(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('q') search?: string,
    @Query('status') status?: 'active' | 'inactive' | 'all',
    @Query('featured') featured?: string,
    @Query('stockStatus') stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock',
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    return this.ecommerce.listProductsPaginated(req.user.tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      categoryId,
      brandId,
      search,
      status,
      featured: featured === 'true',
      stockStatus,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  }

  /** Streams a CSV export of the tenant's catalog, honoring the same filter query params as the paginated list (page/limit are ignored). */
  @Get('products/export')
  async exportProducts(
    @Req() req: any,
    @Res() res: Response,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('q') search?: string,
    @Query('status') status?: 'active' | 'inactive' | 'all',
    @Query('featured') featured?: string,
  ) {
    const csv = await this.ecommerce.exportProductsCsv(req.user.tenantId, {
      categoryId,
      brandId,
      search,
      status,
      featured: featured === 'true',
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="products-export.csv"');
    res.send(csv);
  }

  /** Downloadable CSV template for bulk product import. */
  @Get('products/import/sample')
  getImportSample(@Res() res: Response) {
    const csv = this.ecommerce.getImportSampleCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="products-import-sample.csv"');
    res.send(csv);
  }

  /** Bulk product import — upserts by SKU. See EcommerceService.importProductsCsv for the row-level error-tolerant behavior. */
  @Post('products/import')
  @UseInterceptors(FileInterceptor('file'))
  async importProducts(@Req() req: any, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.ecommerce.importProductsCsv(req.user.tenantId, file.buffer);
  }

  @Get('products/:id')
  getProduct(@Req() req: any, @Param('id') id: string) {
    return this.ecommerce.getProduct(req.user.tenantId, id);
  }

  @Post('products')
  createProduct(@Req() req: any, @Body() dto: any) {
    return this.ecommerce.createProduct(req.user.tenantId, dto);
  }

  @Put('products/:id')
  updateProduct(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.ecommerce.updateProduct(req.user.tenantId, id, dto);
  }

  @Delete('products/:id')
  deleteProduct(@Req() req: any, @Param('id') id: string) {
    return this.ecommerce.deleteProduct(req.user.tenantId, id);
  }

  // ---- Warehouses & Stock ----
  @Get('warehouses')
  listWarehouses(@Req() req: any) {
    return this.ecommerce.listWarehouses(req.user.tenantId);
  }

  @Post('warehouses')
  createWarehouse(@Req() req: any, @Body() dto: any) {
    return this.ecommerce.createWarehouse(req.user.tenantId, dto);
  }

  @Get('stock')
  getStock(@Req() req: any, @Query('warehouseId') warehouseId?: string) {
    return this.ecommerce.getStockLevels(req.user.tenantId, warehouseId);
  }

  @Post('stock/adjust')
  @RequirePermission('ecommerce:pick')
  adjustStock(@Req() req: any, @Body() dto: any) {
    return this.ecommerce.adjustStock(req.user.tenantId, { ...dto, reason: dto.reason || 'ADJUSTMENT' });
  }

  @Get('stock/low')
  getLowStock(@Req() req: any) {
    return this.ecommerce.getLowStockProducts(req.user.tenantId);
  }

  // ---- Product Attributes & Variants ----
  @Get('attributes')
  listAttributes(@Req() req: any) {
    return this.ecommerce.listAttributes(req.user.tenantId);
  }

  @Post('attributes')
  createAttribute(@Req() req: any, @Body() dto: any) {
    return this.ecommerce.createAttribute(req.user.tenantId, dto);
  }

  @Post('attributes/:id/values')
  addAttributeValue(@Req() req: any, @Param('id') id: string, @Body() dto: { value: string }) {
    return this.ecommerce.addAttributeValue(req.user.tenantId, id, dto.value);
  }

  @Delete('attributes/:id')
  deleteAttribute(@Req() req: any, @Param('id') id: string) {
    return this.ecommerce.deleteAttribute(req.user.tenantId, id);
  }

  @Post('products/:id/variants')
  createVariant(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.ecommerce.createVariant(req.user.tenantId, id, dto);
  }

  @Delete('variants/:id')
  deleteVariant(@Req() req: any, @Param('id') id: string) {
    return this.ecommerce.deleteVariant(req.user.tenantId, id);
  }

  // ---- Cart (current logged-in customer) ----
  @Get('cart')
  async getCart(@Req() req: any) {
    return this.ecommerce.getOrCreateCart(req.user.tenantId, await this.customerId(req));
  }

  @Post('cart/items')
  async addToCart(@Req() req: any, @Body() dto: any) {
    return this.ecommerce.addToCart(req.user.tenantId, await this.customerId(req), dto);
  }

  @Put('cart/items/:id')
  async updateCartItem(@Req() req: any, @Param('id') id: string, @Body() dto: { quantity: number }) {
    return this.ecommerce.updateCartItem(req.user.tenantId, await this.customerId(req), id, dto.quantity);
  }

  @Delete('cart/items/:id')
  async removeCartItem(@Req() req: any, @Param('id') id: string) {
    return this.ecommerce.removeCartItem(req.user.tenantId, await this.customerId(req), id);
  }

  // ---- Checkout & Orders ----
  @Post('checkout')
  async checkout(@Req() req: any, @Body() dto: any) {
    return this.ecommerce.checkout(req.user.tenantId, await this.customerId(req), dto);
  }

  @Get('orders')
  async listOrders(@Req() req: any, @Query('mine') mine?: string) {
    const customerId = mine === 'true' ? await this.customerId(req) : undefined;
    return this.ecommerce.listOrders(req.user.tenantId, customerId);
  }

  // ---- Customers (CRM: per-customer spend) ----
  @Get('customers')
  listCustomers(@Req() req: any) {
    return this.ecommerce.listCustomersWithSpend(req.user.tenantId);
  }

  @Get('customers/:id')
  getCustomer(@Req() req: any, @Param('id') id: string) {
    return this.ecommerce.getCustomerWithSpend(req.user.tenantId, id);
  }

  @Get('orders/:id')
  getOrder(@Req() req: any, @Param('id') id: string) {
    return this.ecommerce.getOrder(req.user.tenantId, id);
  }

  @Put('orders/:id/status')
  updateOrderStatus(@Req() req: any, @Param('id') id: string, @Body() dto: { status: string }) {
    return this.ecommerce.updateOrderStatus(req.user.tenantId, id, dto.status);
  }

  @Post('orders/:id/cancel')
  cancelOrder(@Req() req: any, @Param('id') id: string) {
    return this.ecommerce.cancelOrder(req.user.tenantId, id);
  }

  /**
   * Confirms a PREPAID order's payment against the gateway (esewa/khalti/
   * connectips/fonepay/stripe/paypal — whatever PaymentGatewayService has
   * configured for this tenant). Called by the storefront's payment
   * return page after the customer completes the gateway redirect flow.
   * On success this marks the order + invoice paid and posts the GL entry.
   */
  @Post('orders/:id/confirm-payment')
  confirmPayment(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { providerType: string; providerTxnId: string; amount?: number; rawParams?: Record<string, any> },
  ) {
    return this.ecommerce.confirmPayment(req.user.tenantId, id, dto.providerType, dto);
  }

  // ---- Shipments ----
  @Post('orders/:id/shipment')
  @RequirePermission('ecommerce:pick')
  createShipment(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.ecommerce.createShipment(req.user.tenantId, id, dto);
  }

  @Put('shipments/:id/status')
  @RequirePermission('ecommerce:pick')
  updateShipmentStatus(@Req() req: any, @Param('id') id: string, @Body() dto: { status: string }) {
    return this.ecommerce.updateShipmentStatus(req.user.tenantId, id, dto.status);
  }

  // ---- Dashboard ----
  // Financial figures (totalRevenue) are gated behind ecommerce:view_financials
  // so picker_packer / customer_support roles (which only have ecommerce:view)
  // can't see revenue through the dashboard summary — see
  // EcommerceService.getDashboardSummary, which strips totalRevenue when the
  // caller lacks the permission.
  @Get('dashboard/summary')
  async getDashboardSummary(@Req() req: any) {
    const summary = await this.ecommerce.getDashboardSummary(req.user.tenantId);
    if (req.user.isPlatformAdmin || !req.user.tenantId) return summary;
    const hasFinancials = await this.ecommerce.hasPermission(req.user.id, 'ecommerce:view_financials');
    if (hasFinancials) return summary;
    const { totalRevenue, ...rest } = summary;
    return rest;
  }
}
