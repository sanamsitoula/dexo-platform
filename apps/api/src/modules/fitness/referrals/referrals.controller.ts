import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { ReferralsService } from './referrals.service';

@Controller('fitness/referrals')
export class ReferralsController {
  constructor(private service: ReferralsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() req: any, @Query() query: any) {
    return this.service.findAll(req.user.tenantId, query);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.service.findByCode(code);
  }

  @Get('stats/:memberId')
  @UseGuards(JwtAuthGuard)
  stats(@Req() req: any, @Param('memberId') memberId: string) {
    return this.service.getMemberStats(req.user.tenantId, memberId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: any, @Body() dto: any) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Post('redeem')
  @UseGuards(JwtAuthGuard)
  redeem(@Req() req: any, @Body() body: { code: string; refereeId: string }) {
    return this.service.redeemCode(req.user.tenantId, body.code, body.refereeId);
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  complete(@Req() req: any, @Param('id') id: string) {
    return this.service.completeReferral(req.user.tenantId, id);
  }
}
