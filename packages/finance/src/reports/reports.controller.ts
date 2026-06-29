import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('profit-loss')
  async getProfitLossStatement(
    @Query('tenantId') tenantId: string,
    @Query('fiscalYearId') fiscalYearId: string,
    @Query('periodId') periodId?: string,
  ) {
    return this.reportsService.getProfitLossStatement(tenantId, fiscalYearId, periodId);
  }

  @Get('balance-sheet')
  async getBalanceSheet(
    @Query('tenantId') tenantId: string,
    @Query('asAtDate') asAtDate: string,
  ) {
    return this.reportsService.getBalanceSheet(tenantId, new Date(asAtDate));
  }

  @Get('cash-flow')
  async getCashFlowStatement(
    @Query('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getCashFlowStatement(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('ar-aging')
  async getArAgingReport(
    @Query('tenantId') tenantId: string,
    @Query('asAtDate') asAtDate: string,
  ) {
    return this.reportsService.getArAgingReport(tenantId, new Date(asAtDate));
  }

  @Get('ap-aging')
  async getApAgingReport(
    @Query('tenantId') tenantId: string,
    @Query('asAtDate') asAtDate: string,
  ) {
    return this.reportsService.getApAgingReport(tenantId, new Date(asAtDate));
  }

  @Get('vat-return')
  async getVatReturn(
    @Query('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getVatReturn(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('sales-book')
  async getSalesBook(
    @Query('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getSalesBook(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('audit-trail')
  async getAuditTrail(
    @Query('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('table') table?: string,
  ) {
    return this.reportsService.getAuditTrail(
      tenantId,
      new Date(startDate),
      new Date(endDate),
      table,
    );
  }
}
