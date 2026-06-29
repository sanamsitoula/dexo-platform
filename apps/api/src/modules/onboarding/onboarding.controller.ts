import {
  Controller, Get, Post, Put, Body, Param, Query, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@dexo/auth';
import { OnboardingService } from './onboarding.service';

@ApiTags('onboarding')
@Public()
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  // -------- Tenant onboarding --------

  @Get('tenant')
  @ApiOperation({ summary: 'Get current tenant onboarding state' })
  async getTenant(@Query('tenantId') tenantId: string) {
    if (!tenantId) throw new BadRequestException('tenantId query param required');
    return this.service.getTenantOnboarding(tenantId);
  }

  @Put('tenant/step/:n')
  @ApiOperation({ summary: 'Save step N data, mark that step complete' })
  async saveStep(
    @Param('n') n: string,
    @Body() body: { tenantId: string; data: Record<string, unknown> },
  ) {
    return this.service.saveTenantStep(body.tenantId, parseInt(n, 10), body.data);
  }

  @Post('tenant/complete')
  @ApiOperation({ summary: 'Finalize tenant onboarding' })
  async completeTenant(@Body() body: { tenantId: string }) {
    return this.service.completeTenantOnboarding(body.tenantId);
  }

  // -------- Customer onboarding --------

  @Post('customer/start')
  @ApiOperation({ summary: 'Start a customer onboarding flow' })
  async customerStart(
    @Body() body: { tenantId: string; email: string; source: string },
  ) {
    return this.service.startCustomerOnboarding(body.tenantId, body.email, body.source);
  }

  @Get('customer/:id')
  @ApiOperation({ summary: 'Get customer onboarding progress (for resume)' })
  async customerGet(@Param('id') id: string) {
    return this.service.getCustomerOnboarding(id);
  }

  @Put('customer/:id/step/:n')
  @ApiOperation({ summary: 'Save customer step N data' })
  async customerStep(
    @Param('id') id: string,
    @Param('n') n: string,
    @Body() body: { data: Record<string, unknown> },
  ) {
    return this.service.saveCustomerStep(id, parseInt(n, 10), body.data);
  }

  @Post('customer/:id/complete')
  @ApiOperation({ summary: 'Complete customer onboarding (creates user)' })
  async customerComplete(
    @Param('id') id: string,
    @Body() body: { userId?: string },
  ) {
    return this.service.completeCustomerOnboarding(id, body.userId);
  }
}
