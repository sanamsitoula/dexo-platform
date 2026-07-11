import { Body, Controller, Get, Post, Put, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard, PlatformAdminGuard } from '@dexo/auth';
import { TenantMailService } from '@dexo/shared';

/**
 * Super-admin management of the GLOBAL email provider — the middle tier of
 * the Tenant -> Global -> System Default hierarchy (see TenantMailService).
 * Switching providers or rotating credentials here takes effect immediately
 * on the next send, no redeploy.
 */
@Controller('platform-email')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformEmailController {
  constructor(private mail: TenantMailService) {}

  @Get('config')
  getConfig() {
    return this.mail.getGlobalConfig(true);
  }

  @Put('config')
  saveConfig(@Req() req: any, @Body() dto: any) {
    return this.mail.saveGlobalConfig(dto, req.user?.id || req.user?.sub);
  }

  @Post('test')
  async test(@Body() body: { to: string }) {
    if (!body?.to) throw new BadRequestException('to is required');
    return this.mail.testGlobalConfig(body.to);
  }

  @Get('logs')
  getLogs(@Query('tenantId') tenantId?: string, @Query('limit') limit?: string) {
    return this.mail.getLogs(tenantId, limit ? parseInt(limit, 10) : 50);
  }
}
