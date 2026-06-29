import { Controller, Get, Query, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, PlatformAdminGuard } from '@dexo/auth';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get platform overview statistics' })
  @ApiResponse({ status: 200, description: 'Platform statistics retrieved' })
  async getPlatformOverview() {
    return this.dashboardService.getPlatformOverview();
  }

  @Get('tenant')
  @ApiOperation({ summary: 'Get tenant-specific dashboard' })
  @ApiResponse({ status: 200, description: 'Tenant dashboard retrieved' })
  @ApiQuery({ name: 'tenantId', required: true })
  async getTenantDashboard(@Query('tenantId') tenantId: string) {
    return this.dashboardService.getTenantDashboard(tenantId);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiResponse({ status: 200, description: 'Revenue analytics retrieved' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getRevenueAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return this.dashboardService.getRevenueAnalytics(start, end);
  }

  @Get('user-growth')
  @ApiOperation({ summary: 'Get user growth analytics' })
  @ApiResponse({ status: 200, description: 'User growth analytics retrieved' })
  @ApiQuery({ name: 'days', required: false })
  async getUserGrowth(@Query('days') days?: string) {
    return this.dashboardService.getUserGrowthAnalytics(days ? parseInt(days) : 30);
  }

  @Get('subscription-metrics')
  @ApiOperation({ summary: 'Get subscription metrics' })
  @ApiResponse({ status: 200, description: 'Subscription metrics retrieved' })
  async getSubscriptionMetrics() {
    return this.dashboardService.getSubscriptionMetrics();
  }

  @Get('system-health')
  @ApiOperation({ summary: 'Get system health metrics' })
  @ApiResponse({ status: 200, description: 'System health retrieved' })
  async getSystemHealth() {
    return this.dashboardService.getSystemHealth();
  }

  @Get('feature-usage')
  @ApiOperation({ summary: 'Get feature usage analytics' })
  @ApiResponse({ status: 200, description: 'Feature usage retrieved' })
  async getFeatureUsage() {
    return this.dashboardService.getFeatureUsage();
  }
}
