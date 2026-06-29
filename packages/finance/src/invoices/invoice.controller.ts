import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { InvoiceService } from './invoice.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  ApproveInvoiceDto,
  IssueInvoiceDto,
  CancelInvoiceDto,
  ReceivePaymentDto,
  MakePaymentDto,
  CreateBillDto,
} from './dto';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoiceController {
  constructor(private invoiceService: InvoiceService) {}

  // ========== Invoice Management ==========

  @Post()
  async createInvoice(
    @Query('tenantId') tenantId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoiceService.createInvoice(tenantId, dto);
  }

  @Get()
  async getInvoices(
    @Query('tenantId') tenantId: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
  ) {
    return this.invoiceService.getInvoices(tenantId, customerId, status as any);
  }

  @Get(':id')
  async getInvoice(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.invoiceService.getInvoice(tenantId, id);
  }

  @Put(':id')
  async updateInvoice(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoiceService.updateInvoice(tenantId, id, dto);
  }

  @Post(':id/approve')
  async approveInvoice(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ApproveInvoiceDto,
  ) {
    return this.invoiceService.approveInvoice(tenantId, id, dto);
  }

  @Post(':id/issue')
  async issueInvoice(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: IssueInvoiceDto,
  ) {
    return this.invoiceService.issueInvoice(tenantId, id, dto);
  }

  @Post(':id/cancel')
  async cancelInvoice(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: CancelInvoiceDto,
  ) {
    return this.invoiceService.cancelInvoice(tenantId, id, dto);
  }

  // ========== Payments Received ==========

  @Post('payments/receive')
  async receivePayment(
    @Query('tenantId') tenantId: string,
    @Body() dto: ReceivePaymentDto,
  ) {
    return this.invoiceService.receivePayment(tenantId, dto);
  }

  @Post('payments/:paymentId/allocate')
  async allocatePayment(
    @Query('tenantId') tenantId: string,
    @Param('paymentId') paymentId: string,
    @Body('invoiceId') invoiceId: string,
    @Body('amount') amount: number,
  ) {
    return this.invoiceService.allocatePayment(tenantId, paymentId, invoiceId, amount);
  }

  // ========== Bills (AP) ==========

  @Post('bills')
  async createBill(
    @Query('tenantId') tenantId: string,
    @Body() dto: CreateBillDto,
  ) {
    return this.invoiceService.createBill(tenantId, dto);
  }

  // ========== Payments Made ==========

  @Post('payments/make')
  async makePayment(
    @Query('tenantId') tenantId: string,
    @Body() dto: MakePaymentDto,
  ) {
    return this.invoiceService.makePayment(tenantId, dto);
  }
}
