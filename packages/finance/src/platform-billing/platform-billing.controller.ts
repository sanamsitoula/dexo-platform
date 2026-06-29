import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { PlatformBillingService } from './platform-billing.service';

@Controller('platform-billing')
@UseGuards(JwtAuthGuard)
export class PlatformBillingController {
  constructor(private platformBillingService: PlatformBillingService) {}

  @Get('revenue-dashboard')
  async getRevenueDashboard(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.platformBillingService.getRevenueDashboard(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Post('billing/run-now')
  async runBillingNow() {
    // Manually trigger billing job
    return this.platformBillingService.monthlySubscriptionBilling();
  }

  @Post('deferred-revenue/run-now')
  async runDeferredRevenueRelease() {
    return this.platformBillingService.deferredRevenueRelease();
  }

  @Post('payment-failed/:subscriptionId')
  async handleFailedPayment(@Query('subscriptionId') subscriptionId: string) {
    return this.platformBillingService.handleFailedPayment(subscriptionId);
  }
}
