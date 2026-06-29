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
}
