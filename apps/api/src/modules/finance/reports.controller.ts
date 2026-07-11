import { Controller, Get, Post, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '@dexo/auth';
import { ReportsService } from './reports.service';
import { CbmsSyncService } from './cbms-sync.service';
import { sendExport, ExportTable } from './report-export.util';

const d = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : '');

@Controller('finance/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService, private cbmsSync: CbmsSyncService) {}

  /** Streams the report as xlsx/pdf/xml when ?format= given, else plain JSON. */
  private async respond(res: Response, format: string | undefined, report: any, toTable: () => ExportTable, filename: string) {
    if (!format || format === 'json') return res.json(report);
    return sendExport(res, format, toTable(), filename);
  }

  @Get('balance-sheet')
  async getBalanceSheet(@Req() req: any, @Res() res: Response, @Query('asOfDate') asOfDate?: string, @Query('format') format?: string) {
    const r = await this.reportsService.getBalanceSheet(req.user.tenantId, asOfDate);
    return this.respond(res, format, r, () => ({
      title: 'Balance Sheet',
      subtitle: `As of ${d(r.asOfDate)}`,
      columns: [
        { key: 'section', label: 'Section' },
        { key: 'accountCode', label: 'Code' },
        { key: 'accountName', label: 'Account' },
        { key: 'balance', label: 'Balance', numeric: true },
      ],
      rows: [
        ...[...r.assets.current, ...r.assets.nonCurrent].map((a: any) => ({ section: 'ASSETS', ...a })),
        ...[...r.liabilities.current, ...r.liabilities.nonCurrent].map((a: any) => ({ section: 'LIABILITIES', ...a })),
        ...r.equity.items.map((a: any) => ({ section: 'EQUITY', ...a })),
      ],
      summary: {
        totalAssets: r.assets.total,
        totalLiabilities: r.liabilities.total,
        totalEquity: r.equity.total,
        totalLiabilitiesAndEquity: r.totalLiabilitiesAndEquity,
        isBalanced: r.isBalanced,
      },
    }), `balance-sheet_${d(r.asOfDate)}`);
  }

  @Get('income-statement')
  async getIncomeStatement(
    @Req() req: any,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('format') format?: string,
  ) {
    const r = await this.reportsService.getIncomeStatement(req.user.tenantId, startDate, endDate);
    return this.respond(res, format, r, () => ({
      title: 'Income Statement',
      subtitle: `Period ${d(r.period.startDate)} → ${d(r.period.endDate)}`,
      columns: [
        { key: 'section', label: 'Section' },
        { key: 'accountCode', label: 'Code' },
        { key: 'accountName', label: 'Account' },
        { key: 'balance', label: 'Amount', numeric: true },
      ],
      rows: [
        ...r.revenue.items.map((a: any) => ({ section: 'REVENUE', ...a })),
        ...r.costOfGoodsSold.items.map((a: any) => ({ section: 'COGS', ...a })),
        ...r.operatingExpenses.items.map((a: any) => ({ section: 'EXPENSES', ...a })),
      ],
      summary: {
        totalRevenue: r.revenue.total,
        totalCogs: r.costOfGoodsSold.total,
        grossProfit: r.grossProfit,
        totalExpenses: r.operatingExpenses.total,
        netIncome: r.netIncome,
      },
    }), `income-statement_${d(r.period.startDate)}_${d(r.period.endDate)}`);
  }

  @Get('trial-balance')
  async getTrialBalance(@Req() req: any, @Res() res: Response, @Query('asOfDate') asOfDate?: string, @Query('format') format?: string) {
    const r = await this.reportsService.getTrialBalance(req.user.tenantId, asOfDate);
    return this.respond(res, format, r, () => ({
      title: 'Trial Balance',
      subtitle: `As of ${d(r.asOfDate)}`,
      columns: [
        { key: 'accountCode', label: 'Code' },
        { key: 'accountName', label: 'Account' },
        { key: 'accountType', label: 'Type' },
        { key: 'debit', label: 'Debit', numeric: true },
        { key: 'credit', label: 'Credit', numeric: true },
      ],
      rows: r.accounts,
      summary: { totalDebit: r.totalDebit, totalCredit: r.totalCredit, isBalanced: r.isBalanced },
    }), `trial-balance_${d(r.asOfDate)}`);
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
  async getSalesBook(@Req() req: any, @Res() res: Response, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string, @Query('format') format?: string) {
    const r = await this.reportsService.getSalesBook(req.user.tenantId, startDate, endDate);
    return this.respond(res, format, r, () => ({
      title: 'Sales Book (बिक्री खाता) — IRD Schedule 6D',
      subtitle: `Period ${d(r.period?.startDate)} → ${d(r.period?.endDate)}`,
      columns: [
        { key: 'billDate', label: 'Bill Date' },
        { key: 'billNo', label: 'Bill No' },
        { key: 'customerName', label: 'Buyer Name' },
        { key: 'customerPan', label: 'Buyer PAN' },
        { key: 'taxableAmount', label: 'Taxable', numeric: true },
        { key: 'taxAmount', label: 'VAT', numeric: true },
        { key: 'totalAmount', label: 'Total', numeric: true },
        { key: 'paymentMethod', label: 'Payment' },
        { key: 'syncWithIrd', label: 'CBMS Synced' },
      ],
      rows: r.rows,
      summary: r.totals,
    }), `sales-book_${d(r.period?.startDate)}_${d(r.period?.endDate)}`);
  }

  @Get('purchase-book')
  async getPurchaseBook(@Req() req: any, @Res() res: Response, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string, @Query('format') format?: string) {
    const r = await this.reportsService.getPurchaseBook(req.user.tenantId, startDate, endDate);
    return this.respond(res, format, r, () => ({
      title: 'Purchase Book (खरिद खाता)',
      subtitle: `Period ${d(r.period?.startDate)} → ${d(r.period?.endDate)}`,
      columns: [
        { key: 'billDate', label: 'Bill Date' },
        { key: 'billNumber', label: 'Bill No' },
        { key: 'supplierName', label: 'Supplier' },
        { key: 'supplierPan', label: 'Supplier PAN' },
        { key: 'subtotal', label: 'Subtotal', numeric: true },
        { key: 'vatAmount', label: 'VAT', numeric: true },
        { key: 'totalAmount', label: 'Total', numeric: true },
        { key: 'paymentStatus', label: 'Status' },
      ],
      rows: r.rows,
      summary: r.totals,
    }), `purchase-book_${d(r.period?.startDate)}_${d(r.period?.endDate)}`);
  }

  @Get('vat-return')
  async getVatReturn(@Req() req: any, @Res() res: Response, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string, @Query('format') format?: string) {
    const r = await this.reportsService.getVatReturn(req.user.tenantId, startDate, endDate);
    return this.respond(res, format, r, () => ({
      title: 'VAT Return',
      subtitle: `Period ${d(r.period.startDate)} → ${d(r.period.endDate)}`,
      columns: [
        { key: 'line', label: 'Line' },
        { key: 'taxableBase', label: 'Taxable Base', numeric: true },
        { key: 'vatAmount', label: 'VAT Amount', numeric: true },
        { key: 'documents', label: 'Documents', numeric: true },
      ],
      rows: [
        { line: 'Output VAT (Sales)', taxableBase: r.outputVat.taxableBase, vatAmount: r.outputVat.amount, documents: r.outputVat.invoiceCount },
        { line: 'Input VAT (Purchases)', taxableBase: r.inputVat.taxableBase, vatAmount: r.inputVat.amount, documents: r.inputVat.billCount },
      ],
      summary: { netVatPayable: r.netVatPayable, isRefundable: r.isRefundable },
    }), `vat-return_${d(r.period.startDate)}_${d(r.period.endDate)}`);
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

  /** Retry a single failed CBMS sync-queue row by its queue id. */
  @Post('cbms-retry/:id')
  retryCbmsRow(@Req() req: any, @Param('id') id: string) {
    return this.cbmsSync.retryOne(req.user.tenantId, id);
  }

  @Get('summary')
  getSummary(@Req() req: any) {
    return this.reportsService.getAllReportsSummary(req.user.tenantId);
  }
}
