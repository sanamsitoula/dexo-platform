import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { CheckinService } from './checkin.service';

@Controller('fitness/checkin')
@UseGuards(JwtAuthGuard)
export class CheckinController {
  constructor(private service: CheckinService) {}

  @Post('qr')
  checkInByQr(@Req() req: any, @Body() body: { qrCode: string; branchId?: string }) {
    return this.service.checkInByQr(req.user.tenantId, body.qrCode, body.branchId);
  }

  @Post('manual')
  manualCheckIn(@Req() req: any, @Body() body: { memberId: string; branchId?: string }) {
    return this.service.manualCheckIn(req.user.tenantId, body.memberId, body.branchId);
  }

  @Post(':id/checkout')
  checkOut(@Req() req: any, @Param('id') id: string) {
    return this.service.checkOut(req.user.tenantId, id);
  }

  @Get('today')
  today(@Req() req: any, @Query('branchId') branchId?: string) {
    return this.service.getTodayAttendances(req.user.tenantId, branchId);
  }

  @Get('member/:memberId')
  memberHistory(@Req() req: any, @Param('memberId') memberId: string, @Query('days') days?: string) {
    return this.service.getMemberHistory(req.user.tenantId, memberId, days ? parseInt(days) : 30);
  }

  @Get('branch/:branchId/stats')
  branchStats(@Req() req: any, @Param('branchId') branchId: string, @Query('days') days?: string) {
    return this.service.getBranchStats(req.user.tenantId, branchId, days ? parseInt(days) : 30);
  }
}
