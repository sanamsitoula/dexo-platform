import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { MembershipsService } from './memberships.service';

@Controller('fitness/memberships')
@UseGuards(JwtAuthGuard)
export class MembershipsController {
  constructor(private service: MembershipsService) {}

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.service.findAll(req.user.tenantId, query);
  }

  @Get('expiring')
  expiring(@Req() req: any, @Query('days') days?: string) {
    return this.service.getExpiring(req.user.tenantId, days ? parseInt(days) : 7);
  }

  @Get('member/:memberId/payments')
  paymentHistory(@Req() req: any, @Param('memberId') memberId: string) {
    return this.service.getPaymentHistory(req.user.tenantId, memberId);
  }

  @Get('qr/:qrCode')
  findByQr(@Param('qrCode') qrCode: string) {
    return this.service.findByQrCode(qrCode);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Post(':id/activate-payment')
  activatePayment(@Req() req: any, @Param('id') id: string, @Body() body: { paymentRef: string; paymentMethod: string }) {
    return this.service.activateOnPayment(req.user.tenantId, id, body.paymentRef, body.paymentMethod);
  }

  @Post(':id/renew')
  renew(@Req() req: any, @Param('id') id: string) {
    return this.service.renew(req.user.tenantId, id);
  }

  @Post(':id/freeze')
  freeze(@Req() req: any, @Param('id') id: string, @Body() body: { days: number; reason: string }) {
    return this.service.freeze(req.user.tenantId, id, body.days, body.reason);
  }

  @Post(':id/unfreeze')
  unfreeze(@Req() req: any, @Param('id') id: string) {
    return this.service.unfreeze(req.user.tenantId, id);
  }

  @Post(':id/cancel')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.service.cancel(req.user.tenantId, id);
  }
}
