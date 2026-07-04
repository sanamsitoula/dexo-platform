import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '@dexo/shared';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { JournalService } from './journal.service';
import { JournalController } from './journal.controller';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { BankingService } from './banking.service';
import { BankingController } from './banking.controller';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { GlPostingService } from './gl-posting.service';
import { CbmsSyncService } from './cbms-sync.service';
import { CbmsController } from './cbms.controller';

@Module({
  imports: [PrismaModule, HttpModule],
  providers: [AccountsService, JournalService, CustomersService, BankingService, InvoicesService, PaymentsService, ReportsService, GlPostingService, CbmsSyncService],
  controllers: [AccountsController, JournalController, CustomersController, BankingController, InvoicesController, PaymentsController, ReportsController, CbmsController],
  exports: [AccountsService, JournalService, CustomersService, BankingService, InvoicesService, PaymentsService, ReportsService, GlPostingService, CbmsSyncService],
})
export class FinanceModule {}
