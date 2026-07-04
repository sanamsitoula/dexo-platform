import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { ReportsService } from './reports.service';

@Controller('finance/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('balance-sheet')
  getBalanceSheet(@Req() req: any, @Query('asOfDate') asOfDate?: string) {
    return this.reportsService.getBalanceSheet(req.user.tenantId, asOfDate);
  }

  @Get('income-statement')
  getIncomeStatement(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getIncomeStatement(req.user.tenantId, startDate, endDate);
  }

  @Get('trial-balance')
  getTrialBalance(@Req() req: any, @Query('asOfDate') asOfDate?: string) {
    return this.reportsService.getTrialBalance(req.user.tenantId, asOfDate);
  }

  @Get('cash-flow')
  getCashFlowStatement(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getCashFlowStatement(req.user.tenantId, startDate, endDate);
  }

  @Get('accounts-receivable')
  getAccountsReceivable(@Req() req: any) {
    return this.reportsService.getAccountsReceivable(req.user.tenantId);
  }

  // ============================================================
  // IRD ELECTRONIC BILLING REPORTS (Schedule 6D, audit, CBMS)
  // ============================================================

  @Get('sales-book')
  getSalesBook(@Req() req: any, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getSalesBook(req.user.tenantId, startDate, endDate);
  }

  @Get('purchase-book')
  getPurchaseBook(@Req() req: any, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getPurchaseBook(req.user.tenantId, startDate, endDate);
  }

  @Get('vat-return')
  getVatReturn(@Req() req: any, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getVatReturn(req.user.tenantId, startDate, endDate);
  }

  @Get('tds-summary')
  getTdsSummary(@Req() req: any, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getTdsSummary(req.user.tenantId, startDate, endDate);
  }

  @Get('deferred-revenue')
  getDeferredRevenue(@Req() req: any, @Query('asOfDate') asOfDate?: string) {
    return this.reportsService.getDeferredRevenueSchedule(req.user.tenantId, asOfDate);
  }

  @Get('ar-aging')
  getArAging(@Req() req: any, @Query('asOfDate') asOfDate?: string) {
    return this.reportsService.getArAging(req.user.tenantId, asOfDate);
  }

  @Get('ap-aging')
  getApAging(@Req() req: any, @Query('asOfDate') asOfDate?: string) {
    return this.reportsService.getApAging(req.user.tenantId, asOfDate);
  }

  @Get('cancelled-bills')
  getCancelledBills(@Req() req: any, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getCancelledBills(req.user.tenantId, startDate, endDate);
  }

  @Get('reprint-log')
  getReprintLog(@Req() req: any, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getReprintLog(req.user.tenantId, startDate, endDate);
  }

  @Get('audit-trail')
  getAuditTrail(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('tableName') tableName?: string,
    @Query('action') action?: string,
    @Query('actionBy') actionBy?: string,
  ) {
    return this.reportsService.getAuditTrail(req.user.tenantId, startDate, endDate, { tableName, action, actionBy });
  }

  @Get('cbms-sync-status')
  getCbmsSyncStatus(@Req() req: any) {
    return this.reportsService.getCbmsSyncStatus(req.user.tenantId);
  }

  @Get('summary')
  getSummary(@Req() req: any) {
    return this.reportsService.getAllReportsSummary(req.user.tenantId);
  }
}
