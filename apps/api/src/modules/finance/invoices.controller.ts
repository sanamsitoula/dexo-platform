import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { InvoicesService } from './invoices.service';
import { CbmsSyncService } from './cbms-sync.service';

@Controller('finance/invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private invoicesService: InvoicesService, private cbmsSync: CbmsSyncService) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.invoicesService.findAll(req.user.tenantId, { status, startDate, endDate, branchId });
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.invoicesService.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.invoicesService.create(req.user.tenantId, dto, req.user.id);
  }

  @Post(':id/master-bill')
  createMasterBill(@Req() req: any, @Param('id') id: string) {
    return this.invoicesService.createMasterBill(req.user.tenantId, id, req.user.id);
  }

  @Post(':id/print')
  recordPrint(@Req() req: any, @Param('id') id: string, @Body('reason') reason?: string) {
    return this.invoicesService.recordPrint(req.user.tenantId, id, req.user.id, reason);
  }

  @Post(':id/cancel')
  cancel(@Req() req: any, @Param('id') id: string, @Body('reason') reason: string) {
    return this.invoicesService.cancel(req.user.tenantId, id, req.user.id, reason);
  }

  /** Manually (re)transmit an invoice's master bill to IRD CBMS. */
  @Post(':id/sync-cbms')
  async syncCbms(@Req() req: any, @Param('id') id: string) {
    const invoice = await this.invoicesService.findOne(req.user.tenantId, id);
    const masterBill = invoice.masterBills?.[0];
    if (!masterBill) {
      return { status: 'SKIPPED', message: 'No master bill for this invoice. Generate one first.' };
    }
    return this.cbmsSync.syncBill(req.user.tenantId, masterBill.id, 'CREATE', req.user.id);
  }

  @Post(':id/pay')
  pay(@Req() req: any, @Param('id') id: string, @Body() body: { method: string }) {
    // Mark invoice as paid via payment allocation
    return this.invoicesService.pay(req.user.tenantId, id, body.method || 'CASH', req.user.id);
  }
}
