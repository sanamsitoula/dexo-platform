import { Module } from '@nestjs/common';
import { PlatformBillingController } from './platform-billing.controller';
import { PlatformBillingService } from './platform-billing.service';
import { PrismaModule } from '@dexo/shared';
import { QueueModule } from '@dexo/shared';
import { AccountingModule } from '../accounting/accounting.module';
import { InvoiceModule } from '../invoices/invoice.module';
import { IrdModule } from '../ird/ird.module';

@Module({
  imports: [PrismaModule, QueueModule, AccountingModule, InvoiceModule, IrdModule],
  controllers: [PlatformBillingController],
  providers: [PlatformBillingService],
  exports: [PlatformBillingService],
})
export class PlatformBillingModule {}
