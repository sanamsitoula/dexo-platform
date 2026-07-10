import { Body, Controller, Get, Post, Put, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { TenantMailService } from '@dexo/shared';

/** Per-tenant SMTP setup + test — used by the tenant-admin Settings screen. */
@Controller('tenant-mail')
@UseGuards(JwtAuthGuard)
export class TenantMailController {
  constructor(private mail: TenantMailService) {}

  @Get('config')
  getConfig(@Req() req: any) {
    return this.mail.getConfig(req.user.tenantId).then((c) => c ?? {});
  }

  @Put('config')
  saveConfig(@Req() req: any, @Body() dto: any) {
    if (!dto?.host) throw new BadRequestException('host is required');
    return this.mail.saveConfig(req.user.tenantId, dto);
  }

  @Post('test')
  async test(@Req() req: any, @Body() body: { to?: string }) {
    const to = body?.to || req.user.email;
    if (!to) throw new BadRequestException('recipient email required');
    return this.mail.sendTest(req.user.tenantId, to);
  }
}
