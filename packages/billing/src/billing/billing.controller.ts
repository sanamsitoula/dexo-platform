import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreatePaymentMethodDto, ProcessPaymentDto } from './dto';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ========== Payment Methods ==========

  @Post('payment-methods')
  @ApiOperation({ summary: 'Add payment method' })
  @ApiResponse({ status: 201, description: 'Payment method added' })
  async addPaymentMethod(
    @Body() dto: CreatePaymentMethodDto,
    @Query('tenantId') tenantId: string,
  ) {
    return this.billingService.addPaymentMethod(dto, tenantId);
  }

  @Get('payment-methods')
  @ApiOperation({ summary: 'Get payment methods' })
  @ApiResponse({ status: 200, description: 'Payment methods retrieved' })
  async getPaymentMethods(@Query('tenantId') tenantId: string) {
    return this.billingService.getPaymentMethods(tenantId);
  }

  @Delete('payment-methods/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove payment method' })
  @ApiResponse({ status: 204, description: 'Payment method removed' })
  async removePaymentMethod(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.billingService.removePaymentMethod(id, tenantId);
  }

  @Post('payment-methods/:id/default')
  @ApiOperation({ summary: 'Set default payment method' })
  @ApiResponse({ status: 200, description: 'Default payment method updated' })
  async setDefaultPaymentMethod(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.billingService.setDefaultPaymentMethod(id, tenantId);
  }

  // ========== Payments ==========

  @Post('payments')
  @ApiOperation({ summary: 'Process payment' })
  @ApiResponse({ status: 201, description: 'Payment processed' })
  async processPayment(
    @Body() dto: ProcessPaymentDto,
    @Query('tenantId') tenantId: string,
  ) {
    return this.billingService.processPayment(tenantId, dto);
  }

  @Post('payments/:intentId/refund')
  @ApiOperation({ summary: 'Refund payment' })
  @ApiResponse({ status: 201, description: 'Refund processed' })
  async refundPayment(
    @Param('intentId') intentId: string,
    @Query('amountInCents') amountInCents?: number,
  ) {
    return this.billingService.refundPayment(intentId, amountInCents);
  }

  // ========== Invoices ==========

  @Post('invoices')
  @ApiOperation({ summary: 'Create invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  async createInvoice(
    @Body('subscriptionId') subscriptionId: string,
    @Body('dueDate') dueDate?: string,
  ) {
    return this.billingService.createInvoice(
      subscriptionId,
      dueDate ? new Date(dueDate) : undefined,
    );
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Get invoices' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved' })
  async getInvoices(@Query('tenantId') tenantId?: string) {
    return this.billingService.getInvoices(tenantId);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved' })
  async getInvoice(@Param('id') id: string) {
    return this.billingService.getInvoice(id);
  }

  @Get('invoices/:id/pdf')
  @ApiOperation({ summary: 'Generate invoice PDF' })
  @ApiResponse({ status: 200, description: 'Invoice PDF generated' })
  async generateInvoicePdf(@Param('id') id: string) {
    return this.billingService.generateInvoicePdf(id);
  }

  // ========== Customer ==========

  @Get('customer')
  @ApiOperation({ summary: 'Get billing customer' })
  @ApiResponse({ status: 200, description: 'Customer retrieved' })
  async getCustomer(@Query('tenantId') tenantId: string) {
    return this.billingService.getCustomer(tenantId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get billing summary' })
  @ApiResponse({ status: 200, description: 'Billing summary retrieved' })
  async getBillingSummary(@Query('tenantId') tenantId: string) {
    return this.billingService.getBillingSummary(tenantId);
  }

  // ========== Analytics ==========

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue statistics' })
  @ApiResponse({ status: 200, description: 'Revenue statistics retrieved' })
  async getRevenueStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.billingService.getRevenueStats(
      new Date(startDate),
      new Date(endDate),
    );
  }

  // ========== Webhooks ==========

  @Post('webhook')
  @ApiOperation({ summary: 'Handle Stripe webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(@Body('event') event: string, @Body('data') data: any) {
    return this.billingService.handleWebhook(event, data);
  }
}
