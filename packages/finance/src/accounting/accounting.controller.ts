import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { AccountingService } from './accounting.service';
import {
  CreateChartOfAccountDto,
  UpdateChartOfAccountDto,
  CreateFiscalYearDto,
  UpdateFiscalYearDto,
  CreateAccountingPeriodDto,
  CreateJournalEntryDto,
  PostJournalEntryDto,
  ReverseJournalEntryDto,
} from '../finance/dto';

@Controller('accounting')
@UseGuards(JwtAuthGuard)
export class AccountingController {
  constructor(private accountingService: AccountingService) {}

  // ========== Chart of Accounts ==========

  @Post('chart-of-accounts')
  async createChartOfAccount(
    @Query('tenantId') tenantId: string,
    @Body() dto: CreateChartOfAccountDto,
  ) {
    return this.accountingService.createChartOfAccount(tenantId, dto);
  }

  @Get('chart-of-accounts')
  async getChartOfAccounts(
    @Query('tenantId') tenantId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.accountingService.getChartOfAccounts(tenantId, includeInactive === 'true');
  }

  @Get('chart-of-accounts/:id')
  async getChartOfAccount(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.accountingService.getChartOfAccount(tenantId, id);
  }

  @Put('chart-of-accounts/:id')
  async updateChartOfAccount(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChartOfAccountDto,
  ) {
    return this.accountingService.updateChartOfAccount(tenantId, id, dto);
  }

  @Post('chart-of-accounts/default')
  async createDefaultChartOfAccounts(
    @Query('tenantId') tenantId: string,
    @Query('industry') industry?: string,
  ) {
    return this.accountingService.getDefaultChartOfAccounts(tenantId, industry);
  }

  // ========== Fiscal Year ==========

  @Post('fiscal-years')
  async createFiscalYear(
    @Query('tenantId') tenantId: string,
    @Body() dto: CreateFiscalYearDto,
  ) {
    return this.accountingService.createFiscalYear(tenantId, dto);
  }

  @Get('fiscal-years')
  async getFiscalYears(@Query('tenantId') tenantId: string) {
    return this.accountingService.getFiscalYears(tenantId);
  }

  @Get('fiscal-years/active')
  async getActiveFiscalYear(@Query('tenantId') tenantId: string) {
    return this.accountingService.getActiveFiscalYear(tenantId);
  }

  @Post('fiscal-years/:id/close')
  async closeFiscalYear(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body('closedBy') closedBy: string,
  ) {
    return this.accountingService.closeFiscalYear(tenantId, id, closedBy);
  }

  // ========== Accounting Periods ==========

  @Post('accounting-periods')
  async createAccountingPeriod(
    @Query('tenantId') tenantId: string,
    @Body() dto: CreateAccountingPeriodDto,
  ) {
    return this.accountingService.createAccountingPeriod(tenantId, dto);
  }

  @Get('accounting-periods')
  async getAccountingPeriods(
    @Query('tenantId') tenantId: string,
    @Query('fiscalYearId') fiscalYearId?: string,
  ) {
    return this.accountingService.getAccountingPeriods(tenantId, fiscalYearId);
  }

  @Post('accounting-periods/:id/close')
  async closeAccountingPeriod(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body('closedBy') closedBy: string,
  ) {
    return this.accountingService.closeAccountingPeriod(tenantId, id, closedBy);
  }

  // ========== Journal Entries ==========

  @Post('journal-entries')
  async createJournalEntry(
    @Query('tenantId') tenantId: string,
    @Body() dto: CreateJournalEntryDto,
  ) {
    return this.accountingService.createJournalEntry(tenantId, dto);
  }

  @Get('journal-entries')
  async getJournalEntries(
    @Query('tenantId') tenantId: string,
    @Query('fiscalYearId') fiscalYearId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.accountingService.getJournalEntries(
      tenantId,
      fiscalYearId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('journal-entries/:id')
  async getJournalEntry(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.accountingService.getJournalEntry(tenantId, id);
  }

  @Post('journal-entries/:id/post')
  async postJournalEntry(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: PostJournalEntryDto,
  ) {
    return this.accountingService.postJournalEntry(tenantId, id, dto);
  }

  @Post('journal-entries/:id/reverse')
  async reverseJournalEntry(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ReverseJournalEntryDto,
  ) {
    return this.accountingService.reverseJournalEntry(tenantId, id, dto);
  }

  // ========== Reports ==========

  @Get('reports/trial-balance')
  async getTrialBalance(
    @Query('tenantId') tenantId: string,
    @Query('fiscalYearId') fiscalYearId: string,
    @Query('periodId') periodId?: string,
  ) {
    return this.accountingService.getTrialBalance(tenantId, fiscalYearId, periodId);
  }
}
