import { Module } from '@nestjs/common';
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

@Module({
  imports: [PrismaModule],
  providers: [AccountsService, JournalService, CustomersService, BankingService, InvoicesService, PaymentsService, ReportsService],
  controllers: [AccountsController, JournalController, CustomersController, BankingController, InvoicesController, PaymentsController, ReportsController],
  exports: [AccountsService, JournalService, CustomersService, BankingService, InvoicesService, PaymentsService, ReportsService],
})
export class FinanceModule {}
