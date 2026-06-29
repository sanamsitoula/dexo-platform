import { Module } from '@nestjs/common';
import { AccountingModule } from './accounting/accounting.module';
import { InvoiceModule } from './invoices/invoice.module';
import { ReportsModule } from './reports/reports.module';
import { IrdModule } from './ird/ird.module';
import { PlatformBillingModule } from './platform-billing/platform-billing.module';

/**
 * Finance Module
 *
 * Multi-tenant finance module with:
 * - Double-entry accounting engine
 * - AR/AP invoice management
 * - Financial statements
 * - IRD/CBMS compliance
 * - Platform subscription billing
 */
@Module({
  imports: [
    AccountingModule,
    InvoiceModule,
    ReportsModule,
    IrdModule,
    PlatformBillingModule,
  ],
  exports: [
    AccountingModule,
    InvoiceModule,
    ReportsModule,
    IrdModule,
    PlatformBillingModule,
  ],
})
export class FinanceModule {}
