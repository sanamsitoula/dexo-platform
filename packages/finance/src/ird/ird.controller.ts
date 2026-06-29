import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { IrdService } from './ird.service';

@Controller('ird')
@UseGuards(JwtAuthGuard)
export class IrdController {
  constructor(private irdService: IrdService) {}

  @Post('sync/:invoiceId')
  async syncInvoice(
    @Param('invoiceId') invoiceId: string,
    @Query('operation') operation: 'CREATE' | 'CANCEL' = 'CREATE',
  ) {
    return this.irdService.syncInvoiceToCbms(invoiceId, operation);
  }

  @Get('sync/status')
  async getSyncStatus(@Query('tenantId') tenantId?: string) {
    return this.irdService.getSyncStatus(tenantId);
  }

  @Post('print/:invoiceId')
  async recordInvoicePrint(
    @Param('invoiceId') invoiceId: string,
    @Query('tenantId') tenantId: string,
    @Query('printedBy') printedBy: string,
    @Query('ipAddress') ipAddress: string,
    @Query('isReprint') isReprint?: string,
  ) {
    return this.irdService.recordInvoicePrint(
      tenantId,
      invoiceId,
      printedBy,
      ipAddress,
      isReprint === 'true',
    );
  }

  @Get('reprint-log')
  async getReprintLog(
    @Query('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.irdService.getReprintLog(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Post('vat-refund/:paymentId')
  async processVatRefund(@Param('paymentId') paymentId: string) {
    return this.irdService.processVatRefund(paymentId);
  }
}
