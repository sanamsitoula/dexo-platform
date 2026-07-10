import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { GymLedgerService } from './gym-ledger.service';

/**
 * Gym-admin finance actions that post directly to the general ledger.
 * Revenue is posted automatically on membership payment; this covers the
 * expense side so a gym can produce a complete Trial Balance / P&L.
 */
@Controller('fitness/finance')
@UseGuards(JwtAuthGuard)
export class GymFinanceController {
  constructor(private ledger: GymLedgerService) {}

  /**
   * Record an operating expense (rent, salary, utilities, etc.).
   * Body: { accountCode: '5020', amount: 25000, paymentMethod: 'CASH'|'BANK', description, date? }
   */
  @Post('expense')
  recordExpense(@Req() req: any, @Body() dto: { accountCode: string; amount: number; paymentMethod?: string; description?: string; date?: string }) {
    return this.ledger.recordExpense(req.user.tenantId, dto, req.user.id);
  }
}
