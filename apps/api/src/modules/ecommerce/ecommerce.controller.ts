import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { RequireModule } from '@dexo/shared';
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

  // ---- Shipments ----
  @Post('orders/:id/shipment')
  createShipment(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.ecommerce.createShipment(req.user.tenantId, id, dto);
  }

  @Put('shipments/:id/status')
  updateShipmentStatus(@Req() req: any, @Param('id') id: string, @Body() dto: { status: string }) {
    return this.ecommerce.updateShipmentStatus(req.user.tenantId, id, dto.status);
  }

  // ---- Dashboard ----
  @Get('dashboard/summary')
  getDashboardSummary(@Req() req: any) {
    return this.ecommerce.getDashboardSummary(req.user.tenantId);
  }
}
